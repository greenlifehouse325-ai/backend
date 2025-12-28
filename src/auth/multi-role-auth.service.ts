import {
    Injectable,
    BadRequestException,
    UnauthorizedException,
    ConflictException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import {
    SignupStudentDto,
    SignupTeacherDto,
    SignupParentDto,
    LoginStudentDto,
    LoginTeacherDto,
    LoginParentDto,
    LoginAdminDto,
    ChangePasswordDto,
} from './dto';

import {
    UserRole,
    UserStatus,
    RegistrationType,
    RegistrationStatus,
    LinkStatus,
    NotificationType,
} from '../common/enums';

import type {
    AuthSession,
    AuthenticatedUser,
} from '../common/interfaces';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class MultiRoleAuthService {
    private readonly logger = new Logger(MultiRoleAuthService.name);
    private readonly SALT_ROUNDS = 10;

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    // ==========================================
    // STUDENT REGISTRATION (Request to Admin)
    // ==========================================

    async registerStudent(dto: SignupStudentDto): Promise<{ message: string; requestId: string }> {
        const adminClient = this.supabaseService.getAdminClient();

        // Check if NISN already exists
        const { data: existingStudent } = await adminClient
            .from('students')
            .select('id')
            .eq('nisn', dto.nisn)
            .single();

        if (existingStudent) {
            throw new ConflictException('NISN sudah terdaftar');
        }

        // Check if email already exists
        const { data: existingUser } = await adminClient
            .from('users')
            .select('id')
            .eq('email', dto.email)
            .single();

        if (existingUser) {
            throw new ConflictException('Email sudah terdaftar');
        }

        // Check for pending registration with same NISN or email
        const { data: pendingRequest } = await adminClient
            .from('registration_requests')
            .select('id')
            .eq('status', RegistrationStatus.PENDING)
            .or(`form_data->>'nisn'.eq.${dto.nisn},form_data->>'email'.eq.${dto.email}`)
            .single();

        if (pendingRequest) {
            throw new ConflictException('Sudah ada pendaftaran dengan NISN atau email yang sama yang sedang diproses');
        }

        // Create user record with pending status
        const { data: user, error: userError } = await adminClient
            .from('users')
            .insert({
                email: dto.email,
                role: UserRole.STUDENT,
                status: UserStatus.PENDING,
                email_verified: false,
                must_change_password: true,
            })
            .select()
            .single();

        if (userError) {
            this.logger.error(`Failed to create user: ${userError.message}`);
            throw new BadRequestException('Gagal membuat akun');
        }

        // Create registration request
        const { data: request, error: requestError } = await adminClient
            .from('registration_requests')
            .insert({
                user_id: user.id,
                type: RegistrationType.STUDENT,
                form_data: {
                    nisn: dto.nisn,
                    fullName: dto.fullName,
                    email: dto.email,
                    phone: dto.phone,
                    kelas: dto.kelas,
                    jurusan: dto.jurusan,
                    tahunAjaran: dto.tahunAjaran,
                    dateOfBirth: dto.dateOfBirth,
                    address: dto.address,
                },
                status: RegistrationStatus.PENDING,
            })
            .select()
            .single();

        if (requestError) {
            // Rollback user creation
            await adminClient.from('users').delete().eq('id', user.id);
            this.logger.error(`Failed to create registration request: ${requestError.message}`);
            throw new BadRequestException('Gagal membuat permintaan pendaftaran');
        }

        // Create notification for admin
        await this.createAdminNotification(
            'Pendaftaran Siswa Baru',
            `${dto.fullName} (NISN: ${dto.nisn}) mendaftar sebagai siswa baru`,
            { requestId: request.id, type: 'student_registration' },
        );

        this.logger.log(`Student registration request created: ${request.id}`);

        return {
            message: 'Pendaftaran berhasil dikirim. Silakan tunggu persetujuan admin.',
            requestId: request.id,
        };
    }

    // ==========================================
    // TEACHER REGISTRATION (Request to Admin)
    // ==========================================

    async registerTeacher(dto: SignupTeacherDto): Promise<{ message: string; requestId: string }> {
        const adminClient = this.supabaseService.getAdminClient();

        // Check if NIP already exists
        const { data: existingTeacher } = await adminClient
            .from('teachers')
            .select('id')
            .eq('nip', dto.nip)
            .single();

        if (existingTeacher) {
            throw new ConflictException('NIP sudah terdaftar');
        }

        // Check if email already exists
        const { data: existingUser } = await adminClient
            .from('users')
            .select('id')
            .eq('email', dto.email)
            .single();

        if (existingUser) {
            throw new ConflictException('Email sudah terdaftar');
        }

        // Create user record with pending status
        const { data: user, error: userError } = await adminClient
            .from('users')
            .insert({
                email: dto.email,
                role: UserRole.TEACHER,
                status: UserStatus.PENDING,
                email_verified: false,
                must_change_password: true,
            })
            .select()
            .single();

        if (userError) {
            this.logger.error(`Failed to create user: ${userError.message}`);
            throw new BadRequestException('Gagal membuat akun');
        }

        // Create registration request
        const { data: request, error: requestError } = await adminClient
            .from('registration_requests')
            .insert({
                user_id: user.id,
                type: RegistrationType.TEACHER,
                form_data: {
                    nip: dto.nip,
                    fullName: dto.fullName,
                    email: dto.email,
                    phone: dto.phone,
                    subject: dto.subject,
                    address: dto.address,
                },
                status: RegistrationStatus.PENDING,
            })
            .select()
            .single();

        if (requestError) {
            await adminClient.from('users').delete().eq('id', user.id);
            this.logger.error(`Failed to create registration request: ${requestError.message}`);
            throw new BadRequestException('Gagal membuat permintaan pendaftaran');
        }

        // Notify admin
        await this.createAdminNotification(
            'Pendaftaran Guru Baru',
            `${dto.fullName} (NIP: ${dto.nip}) mendaftar sebagai guru baru`,
            { requestId: request.id, type: 'teacher_registration' },
        );

        this.logger.log(`Teacher registration request created: ${request.id}`);

        return {
            message: 'Pendaftaran berhasil dikirim. Silakan tunggu persetujuan admin.',
            requestId: request.id,
        };
    }

    // ==========================================
    // PARENT SELF-REGISTRATION
    // ==========================================

    async registerParent(dto: SignupParentDto): Promise<AuthSession> {
        const adminClient = this.supabaseService.getAdminClient();

        // Check if email already exists
        const { data: existingUser } = await adminClient
            .from('users')
            .select('id')
            .eq('email', dto.email)
            .single();

        if (existingUser) {
            throw new ConflictException('Email sudah terdaftar');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

        // Create user record - parents are active immediately
        const { data: user, error: userError } = await adminClient
            .from('users')
            .insert({
                email: dto.email,
                password_hash: passwordHash,
                role: UserRole.PARENT,
                status: UserStatus.ACTIVE,
                email_verified: false,
                must_change_password: false,
            })
            .select()
            .single();

        if (userError) {
            this.logger.error(`Failed to create user: ${userError.message}`);
            throw new BadRequestException('Gagal membuat akun');
        }

        // If child NISN provided, check if student exists and verified
        let studentId: string | null = null;
        let linkStatus: LinkStatus | null = null;

        if (dto.childNisn) {
            const { data: student } = await adminClient
                .from('students')
                .select('id, user_id, full_name, is_verified')
                .eq('nisn', dto.childNisn)
                .single();

            if (!student) {
                // Continue without linking - parent can link later
                this.logger.log(`Student with NISN ${dto.childNisn} not found, parent will link later`);
            } else if (!student.is_verified) {
                this.logger.log(`Student with NISN ${dto.childNisn} not verified yet`);
            } else {
                // Student found and verified, create pending link
                studentId = student.id;
                linkStatus = LinkStatus.PENDING;

                // Notify student about parent linking
                await this.createNotification(
                    student.user_id,
                    NotificationType.PARENT_LINK,
                    'Permintaan Akses Orang Tua',
                    `${dto.fullName} (${dto.relationship}) meminta akses sebagai orang tua Anda. Apakah Anda menyetujui?`,
                    { parentUserId: user.id, parentName: dto.fullName, relationship: dto.relationship },
                );
            }
        }

        // Create parent profile
        const { error: parentError } = await adminClient
            .from('parents')
            .insert({
                user_id: user.id,
                student_id: studentId,
                full_name: dto.fullName,
                phone: dto.phone,
                address: dto.address,
                relationship: dto.relationship,
                link_status: linkStatus,
                link_requested_at: studentId ? new Date().toISOString() : null,
            });

        if (parentError) {
            await adminClient.from('users').delete().eq('id', user.id);
            this.logger.error(`Failed to create parent profile: ${parentError.message}`);
            throw new BadRequestException('Gagal membuat profil orang tua');
        }

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, UserRole.PARENT);

        // Store session
        await this.storeDeviceSession(user.id, tokens.refreshToken);

        // Log activity
        await this.logActivity(user.id, 'REGISTER', 'Parent registered successfully');

        const authUser: AuthenticatedUser = {
            id: user.id,
            email: user.email,
            role: UserRole.PARENT,
            status: UserStatus.ACTIVE,
            emailVerified: false,
            mustChangePassword: false,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
        };

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + tokens.expiresIn * 1000,
            user: authUser,
        };
    }

    // ==========================================
    // STUDENT LOGIN (using NISN)
    // ==========================================

    async loginStudent(dto: LoginStudentDto): Promise<AuthSession> {
        const adminClient = this.supabaseService.getAdminClient();

        // Find student by NISN
        const { data: student } = await adminClient
            .from('students')
            .select('*, users!inner(*)')
            .eq('nisn', dto.nisn)
            .single();

        if (!student) {
            throw new UnauthorizedException('NISN atau password salah');
        }

        const user = student.users;

        // Check user status
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Akun belum aktif atau dibekukan');
        }

        // Verify password
        if (!user.password_hash) {
            throw new UnauthorizedException('Akun belum memiliki password');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('NISN atau password salah');
        }

        // Update last login
        await adminClient
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, UserRole.STUDENT);

        // Store session
        await this.storeDeviceSession(user.id, tokens.refreshToken);

        // Log activity
        await this.logActivity(user.id, 'LOGIN', 'Student logged in via NISN');

        const authUser: AuthenticatedUser = {
            id: user.id,
            email: user.email,
            role: UserRole.STUDENT,
            status: user.status,
            emailVerified: user.email_verified,
            mustChangePassword: user.must_change_password,
            lastLogin: new Date(),
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            profile: {
                id: student.id,
                userId: student.user_id,
                nisn: student.nisn,
                fullName: student.full_name,
                kelas: student.kelas,
                jurusan: student.jurusan,
                waliKelas: student.wali_kelas,
                tahunAjaran: student.tahun_ajaran,
                dateOfBirth: student.date_of_birth,
                phone: student.phone,
                address: student.address,
                avatarUrl: student.avatar_url,
                isVerified: student.is_verified,
                verifiedAt: student.verified_at,
            },
        };

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + tokens.expiresIn * 1000,
            user: authUser,
        };
    }

    // ==========================================
    // TEACHER LOGIN (using NIP or Email)
    // ==========================================

    async loginTeacher(dto: LoginTeacherDto): Promise<AuthSession> {
        const adminClient = this.supabaseService.getAdminClient();

        // Determine if input is NIP or email
        const isEmail = dto.nipOrEmail.includes('@');

        let user: any;
        let teacher: any;

        if (isEmail) {
            // Login via email
            const { data } = await adminClient
                .from('users')
                .select('*, teachers!inner(*)')
                .eq('email', dto.nipOrEmail)
                .eq('role', UserRole.TEACHER)
                .single();

            if (data) {
                user = data;
                teacher = data.teachers;
            }
        } else {
            // Login via NIP
            const { data } = await adminClient
                .from('teachers')
                .select('*, users!inner(*)')
                .eq('nip', dto.nipOrEmail)
                .single();

            if (data) {
                teacher = data;
                user = data.users;
            }
        }

        if (!user || !teacher) {
            throw new UnauthorizedException('NIP/Email atau password salah');
        }

        // Check user status
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Akun belum aktif atau dibekukan');
        }

        // Verify password
        if (!user.password_hash) {
            throw new UnauthorizedException('Akun belum memiliki password');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('NIP/Email atau password salah');
        }

        // Update last login
        await adminClient
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, UserRole.TEACHER);

        // Store session
        await this.storeDeviceSession(user.id, tokens.refreshToken);

        // Log activity
        await this.logActivity(user.id, 'LOGIN', `Teacher logged in via ${isEmail ? 'email' : 'NIP'}`);

        const authUser: AuthenticatedUser = {
            id: user.id,
            email: user.email,
            role: UserRole.TEACHER,
            status: user.status,
            emailVerified: user.email_verified,
            mustChangePassword: user.must_change_password,
            lastLogin: new Date(),
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            profile: {
                id: teacher.id,
                userId: teacher.user_id,
                nip: teacher.nip,
                fullName: teacher.full_name,
                subject: teacher.subject,
                phone: teacher.phone,
                address: teacher.address,
                avatarUrl: teacher.avatar_url,
                isVerified: teacher.is_verified,
                verifiedAt: teacher.verified_at,
            },
        };

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + tokens.expiresIn * 1000,
            user: authUser,
        };
    }

    // ==========================================
    // PARENT LOGIN (using Email)
    // ==========================================

    async loginParent(dto: LoginParentDto): Promise<AuthSession> {
        const adminClient = this.supabaseService.getAdminClient();

        // Find parent by email
        const { data: user } = await adminClient
            .from('users')
            .select('*, parents!inner(*)')
            .eq('email', dto.email)
            .eq('role', UserRole.PARENT)
            .single();

        if (!user) {
            throw new UnauthorizedException('Email atau password salah');
        }

        const parent = user.parents;

        // Check user status
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Akun belum aktif atau dibekukan');
        }

        // Verify password
        if (!user.password_hash) {
            throw new UnauthorizedException('Akun belum memiliki password');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Email atau password salah');
        }

        // Update last login
        await adminClient
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, UserRole.PARENT);

        // Store session
        await this.storeDeviceSession(user.id, tokens.refreshToken);

        // Log activity
        await this.logActivity(user.id, 'LOGIN', 'Parent logged in via email');

        const authUser: AuthenticatedUser = {
            id: user.id,
            email: user.email,
            role: UserRole.PARENT,
            status: user.status,
            emailVerified: user.email_verified,
            mustChangePassword: user.must_change_password,
            lastLogin: new Date(),
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            profile: {
                id: parent.id,
                userId: parent.user_id,
                studentId: parent.student_id,
                fullName: parent.full_name,
                phone: parent.phone,
                address: parent.address,
                relationship: parent.relationship,
                linkStatus: parent.link_status,
                linkRequestedAt: parent.link_requested_at,
                linkApprovedAt: parent.link_approved_at,
            },
        };

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + tokens.expiresIn * 1000,
            user: authUser,
        };
    }

    // ==========================================
    // ADMIN LOGIN (using Email)
    // ==========================================

    async loginAdmin(dto: LoginAdminDto): Promise<AuthSession> {
        const adminClient = this.supabaseService.getAdminClient();

        // Find admin by email
        const { data: user } = await adminClient
            .from('users')
            .select('*, admins!inner(*)')
            .eq('email', dto.email)
            .in('role', [UserRole.ADMIN, UserRole.SUPER_ADMIN])
            .single();

        if (!user) {
            throw new UnauthorizedException('Email atau password salah');
        }

        const admin = user.admins;

        // Check user status
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Akun belum aktif atau dibekukan');
        }

        // Verify password
        if (!user.password_hash) {
            throw new UnauthorizedException('Akun belum memiliki password');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Email atau password salah');
        }

        // Update last login
        await adminClient
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole);

        // Store session
        await this.storeDeviceSession(user.id, tokens.refreshToken);

        // Log activity
        await this.logActivity(user.id, 'LOGIN', 'Admin logged in');

        const authUser: AuthenticatedUser = {
            id: user.id,
            email: user.email,
            role: user.role as UserRole,
            status: user.status,
            emailVerified: user.email_verified,
            mustChangePassword: user.must_change_password,
            lastLogin: new Date(),
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            profile: {
                id: admin.id,
                userId: admin.user_id,
                fullName: admin.full_name,
                phone: admin.phone,
                isSuperAdmin: admin.is_super_admin,
                permissions: admin.permissions,
            },
        };

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + tokens.expiresIn * 1000,
            user: authUser,
        };
    }

    // ==========================================
    // CHANGE PASSWORD
    // ==========================================

    async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
        const adminClient = this.supabaseService.getAdminClient();

        // Validate confirm password
        if (dto.newPassword !== dto.confirmPassword) {
            throw new BadRequestException('Password baru dan konfirmasi tidak cocok');
        }

        // Get user
        const { data: user } = await adminClient
            .from('users')
            .select('password_hash')
            .eq('id', userId)
            .single();

        if (!user) {
            throw new NotFoundException('User tidak ditemukan');
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Password lama salah');
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(dto.newPassword, this.SALT_ROUNDS);

        // Update password
        await adminClient
            .from('users')
            .update({
                password_hash: newPasswordHash,
                must_change_password: false,
            })
            .eq('id', userId);

        // Log activity
        await this.logActivity(userId, 'CHANGE_PASSWORD', 'Password changed successfully');

        return { message: 'Password berhasil diubah' };
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    private async generateTokens(
        userId: string,
        email: string,
        role: UserRole,
    ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
        const payload: JwtPayload = {
            sub: userId,
            email,
            role,
        };

        const expiresIn = this.configService.get<number>('jwt.expiresIn', 3600);
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = uuidv4();

        return {
            accessToken,
            refreshToken,
            expiresIn,
        };
    }

    private async storeDeviceSession(
        userId: string,
        refreshToken: string,
        deviceInfo?: { name?: string; type?: string; userAgent?: string; ip?: string },
    ): Promise<void> {
        const adminClient = this.supabaseService.getAdminClient();
        const tokenHash = await bcrypt.hash(refreshToken, this.SALT_ROUNDS);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        await adminClient.from('device_sessions').insert({
            user_id: userId,
            device_name: deviceInfo?.name || 'Unknown Device',
            device_type: deviceInfo?.type || 'unknown',
            user_agent: deviceInfo?.userAgent,
            ip_address: deviceInfo?.ip,
            refresh_token_hash: tokenHash,
            is_active: true,
            expires_at: expiresAt.toISOString(),
        });
    }

    private async createNotification(
        recipientId: string,
        type: NotificationType,
        title: string,
        message: string,
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        const adminClient = this.supabaseService.getAdminClient();

        await adminClient.from('notifications').insert({
            recipient_id: recipientId,
            type,
            title,
            message,
            metadata: metadata || {},
        });
    }

    private async createAdminNotification(
        title: string,
        message: string,
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        const adminClient = this.supabaseService.getAdminClient();

        // Get all admin users
        const { data: admins } = await adminClient
            .from('users')
            .select('id')
            .in('role', [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

        if (admins && admins.length > 0) {
            const notifications = admins.map((admin) => ({
                recipient_id: admin.id,
                type: NotificationType.SYSTEM,
                title,
                message,
                metadata: metadata || {},
            }));

            await adminClient.from('notifications').insert(notifications);
        }
    }

    private async logActivity(
        userId: string,
        action: string,
        description?: string,
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        const adminClient = this.supabaseService.getAdminClient();

        await adminClient.from('activity_logs').insert({
            user_id: userId,
            action,
            description,
            metadata: metadata || {},
        });
    }

    /**
     * Generate a random password for admin-created accounts
     */
    generateRandomPassword(length: number = 12): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    /**
     * Hash a password using bcrypt
     */
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }
}
