import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcrypt';

import {
    ApproveRegistrationDto,
    RejectRegistrationDto,
    CreateAdminDto,
    BroadcastNotificationDto,
    RoleBroadcastNotificationDto,
    SendNotificationDto,
    AdminCreateStudentDto,
    AdminCreateTeacherDto,
} from './dto';

import {
    UserRole,
    UserStatus,
    RegistrationType,
    RegistrationStatus,
    NotificationType,
} from '../common/enums';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);
    private readonly SALT_ROUNDS = 10;

    constructor(private readonly supabaseService: SupabaseService) { }

    // ==========================================
    // REGISTRATION MANAGEMENT
    // ==========================================

    /**
     * Get all pending registration requests
     */
    async getPendingRegistrations(page = 1, limit = 20) {
        const adminClient = this.supabaseService.getAdminClient();
        const offset = (page - 1) * limit;

        const { data, error, count } = await adminClient
            .from('registration_requests')
            .select('*, users(email)', { count: 'exact' })
            .eq('status', RegistrationStatus.PENDING)
            .order('submitted_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            this.logger.error(`Failed to get registrations: ${error.message}`);
            throw new BadRequestException('Gagal mengambil data pendaftaran');
        }

        return {
            data,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        };
    }

    /**
     * Get all registration requests (any status)
     */
    async getAllRegistrations(status?: string, type?: string, page = 1, limit = 20) {
        const adminClient = this.supabaseService.getAdminClient();
        const offset = (page - 1) * limit;

        let query = adminClient
            .from('registration_requests')
            .select('*, users(email)', { count: 'exact' })
            .order('submitted_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        if (type) {
            query = query.eq('type', type);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            this.logger.error(`Failed to get registrations: ${error.message}`);
            throw new BadRequestException('Gagal mengambil data pendaftaran');
        }

        return {
            data,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        };
    }

    /**
     * Get a single registration request
     */
    async getRegistration(id: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { data, error } = await adminClient
            .from('registration_requests')
            .select('*, users(email)')
            .eq('id', id)
            .single();

        if (error || !data) {
            throw new NotFoundException('Pendaftaran tidak ditemukan');
        }

        return data;
    }

    /**
     * Approve a registration request
     */
    async approveRegistration(
        id: string,
        adminId: string,
        dto: ApproveRegistrationDto,
    ) {
        const adminClient = this.supabaseService.getAdminClient();

        // Get registration request
        const { data: request, error: fetchError } = await adminClient
            .from('registration_requests')
            .select('*, users(id, email)')
            .eq('id', id)
            .single();

        if (fetchError || !request) {
            throw new NotFoundException('Pendaftaran tidak ditemukan');
        }

        if (request.status !== RegistrationStatus.PENDING) {
            throw new BadRequestException('Pendaftaran sudah diproses sebelumnya');
        }

        // Generate random password
        const generatedPassword = this.generateRandomPassword(12);
        const passwordHash = await bcrypt.hash(generatedPassword, this.SALT_ROUNDS);

        // Update user with password and active status
        const { error: userUpdateError } = await adminClient
            .from('users')
            .update({
                password_hash: passwordHash,
                status: UserStatus.ACTIVE,
                must_change_password: true,
            })
            .eq('id', request.user_id);

        if (userUpdateError) {
            this.logger.error(`Failed to update user: ${userUpdateError.message}`);
            throw new BadRequestException('Gagal mengaktifkan akun');
        }

        // Create profile based on type
        const formData = request.form_data as Record<string, any>;

        if (request.type === RegistrationType.STUDENT) {
            const { error: studentError } = await adminClient
                .from('students')
                .insert({
                    user_id: request.user_id,
                    nisn: formData.nisn,
                    full_name: formData.fullName,
                    kelas: formData.kelas,
                    jurusan: formData.jurusan,
                    tahun_ajaran: formData.tahunAjaran,
                    date_of_birth: formData.dateOfBirth,
                    phone: formData.phone,
                    address: formData.address,
                    is_verified: true,
                    verified_at: new Date().toISOString(),
                    verified_by: adminId,
                });

            if (studentError) {
                this.logger.error(`Failed to create student: ${studentError.message}`);
                throw new BadRequestException('Gagal membuat profil siswa');
            }
        } else if (request.type === RegistrationType.TEACHER) {
            const { error: teacherError } = await adminClient
                .from('teachers')
                .insert({
                    user_id: request.user_id,
                    nip: formData.nip,
                    full_name: formData.fullName,
                    subject: formData.subject,
                    phone: formData.phone,
                    address: formData.address,
                    is_verified: true,
                    verified_at: new Date().toISOString(),
                    verified_by: adminId,
                });

            if (teacherError) {
                this.logger.error(`Failed to create teacher: ${teacherError.message}`);
                throw new BadRequestException('Gagal membuat profil guru');
            }
        }

        // Update registration request
        await adminClient
            .from('registration_requests')
            .update({
                status: RegistrationStatus.APPROVED,
                reviewed_by: adminId,
                reviewed_at: new Date().toISOString(),
                generated_password: generatedPassword, // Store for email sending
            })
            .eq('id', id);

        // Send notification to user
        await this.sendNotificationToUser(
            request.user_id,
            'Pendaftaran Disetujui',
            `Selamat! Pendaftaran Anda telah disetujui. Password sementara Anda: ${generatedPassword}. Silakan ganti password setelah login.`,
        );

        // Log activity
        await this.logAdminActivity(adminId, 'APPROVE_REGISTRATION', `Approved registration ${id}`, {
            requestId: id,
            type: request.type,
            email: request.users?.email,
        });

        this.logger.log(`Registration ${id} approved by ${adminId}`);

        return {
            message: 'Pendaftaran berhasil disetujui',
            generatedPassword, // Return for admin to communicate to user if email fails
            userEmail: request.users?.email,
        };
    }

    /**
     * Reject a registration request
     */
    async rejectRegistration(
        id: string,
        adminId: string,
        dto: RejectRegistrationDto,
    ) {
        const adminClient = this.supabaseService.getAdminClient();

        // Get registration request
        const { data: request, error: fetchError } = await adminClient
            .from('registration_requests')
            .select('*, users(id, email)')
            .eq('id', id)
            .single();

        if (fetchError || !request) {
            throw new NotFoundException('Pendaftaran tidak ditemukan');
        }

        if (request.status !== RegistrationStatus.PENDING) {
            throw new BadRequestException('Pendaftaran sudah diproses sebelumnya');
        }

        // Update registration request
        await adminClient
            .from('registration_requests')
            .update({
                status: RegistrationStatus.REJECTED,
                rejection_reason: dto.reason,
                reviewed_by: adminId,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', id);

        // Update user status
        await adminClient
            .from('users')
            .update({ status: UserStatus.REJECTED })
            .eq('id', request.user_id);

        // Send notification to user
        await this.sendNotificationToUser(
            request.user_id,
            'Pendaftaran Ditolak',
            `Maaf, pendaftaran Anda ditolak. Alasan: ${dto.reason}`,
        );

        // Log activity
        await this.logAdminActivity(adminId, 'REJECT_REGISTRATION', `Rejected registration ${id}`, {
            requestId: id,
            reason: dto.reason,
            email: request.users?.email,
        });

        this.logger.log(`Registration ${id} rejected by ${adminId}`);

        return { message: 'Pendaftaran ditolak' };
    }

    // ==========================================
    // USER MANAGEMENT
    // ==========================================

    /**
     * Get all users with pagination
     */
    async getUsers(role?: string, status?: string, search?: string, page = 1, limit = 20) {
        const adminClient = this.supabaseService.getAdminClient();
        const offset = (page - 1) * limit;

        let query = adminClient
            .from('users')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (role) {
            query = query.eq('role', role);
        }

        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.ilike('email', `%${search}%`);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            this.logger.error(`Failed to get users: ${error.message}`);
            throw new BadRequestException('Gagal mengambil data user');
        }

        return {
            data,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        };
    }

    /**
     * Get user detail with profile
     */
    async getUser(id: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { data: user, error } = await adminClient
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !user) {
            throw new NotFoundException('User tidak ditemukan');
        }

        // Get profile based on role
        let profile = null;

        if (user.role === UserRole.STUDENT) {
            const { data } = await adminClient
                .from('students')
                .select('*')
                .eq('user_id', id)
                .single();
            profile = data;
        } else if (user.role === UserRole.TEACHER) {
            const { data } = await adminClient
                .from('teachers')
                .select('*')
                .eq('user_id', id)
                .single();
            profile = data;
        } else if (user.role === UserRole.PARENT) {
            const { data } = await adminClient
                .from('parents')
                .select('*, students(nisn, full_name)')
                .eq('user_id', id)
                .single();
            profile = data;
        } else if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
            const { data } = await adminClient
                .from('admins')
                .select('*')
                .eq('user_id', id)
                .single();
            profile = data;
        }

        return { user, profile };
    }

    /**
     * Suspend a user
     */
    async suspendUser(userId: string, adminId: string, reason?: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { data: user, error } = await adminClient
            .from('users')
            .select('role, status')
            .eq('id', userId)
            .single();

        if (error || !user) {
            throw new NotFoundException('User tidak ditemukan');
        }

        if (user.role === UserRole.SUPER_ADMIN) {
            throw new BadRequestException('Tidak dapat menonaktifkan Super Admin');
        }

        await adminClient
            .from('users')
            .update({ status: UserStatus.SUSPENDED })
            .eq('id', userId);

        // Revoke all sessions
        await adminClient
            .from('device_sessions')
            .update({ is_active: false })
            .eq('user_id', userId);

        // Send notification
        await this.sendNotificationToUser(
            userId,
            'Akun Dinonaktifkan',
            `Akun Anda telah dinonaktifkan.${reason ? ` Alasan: ${reason}` : ''}`,
        );

        await this.logAdminActivity(adminId, 'SUSPEND_USER', `Suspended user ${userId}`, {
            userId,
            reason,
        });

        return { message: 'User berhasil dinonaktifkan' };
    }

    /**
     * Reactivate a suspended user
     */
    async reactivateUser(userId: string, adminId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { data: user, error } = await adminClient
            .from('users')
            .select('status')
            .eq('id', userId)
            .single();

        if (error || !user) {
            throw new NotFoundException('User tidak ditemukan');
        }

        if (user.status !== UserStatus.SUSPENDED) {
            throw new BadRequestException('User tidak dalam status suspended');
        }

        await adminClient
            .from('users')
            .update({ status: UserStatus.ACTIVE })
            .eq('id', userId);

        await this.sendNotificationToUser(
            userId,
            'Akun Diaktifkan Kembali',
            'Akun Anda telah diaktifkan kembali. Anda dapat login seperti biasa.',
        );

        await this.logAdminActivity(adminId, 'REACTIVATE_USER', `Reactivated user ${userId}`, {
            userId,
        });

        return { message: 'User berhasil diaktifkan kembali' };
    }

    /**
     * Delete a user
     */
    async deleteUser(userId: string, adminId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { data: user, error } = await adminClient
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (error || !user) {
            throw new NotFoundException('User tidak ditemukan');
        }

        if (user.role === UserRole.SUPER_ADMIN) {
            throw new BadRequestException('Tidak dapat menghapus Super Admin');
        }

        // Delete user (cascade will handle related records)
        await adminClient
            .from('users')
            .delete()
            .eq('id', userId);

        await this.logAdminActivity(adminId, 'DELETE_USER', `Deleted user ${userId}`, {
            userId,
        });

        return { message: 'User berhasil dihapus' };
    }

    // ==========================================
    // ADMIN CREATION
    // ==========================================

    /**
     * Create a new admin (super admin only)
     */
    async createAdmin(creatorId: string, dto: CreateAdminDto) {
        const adminClient = this.supabaseService.getAdminClient();

        // Check if creator is super admin
        const { data: creator } = await adminClient
            .from('users')
            .select('role')
            .eq('id', creatorId)
            .single();

        if (!creator || creator.role !== UserRole.SUPER_ADMIN) {
            throw new BadRequestException('Hanya Super Admin yang dapat membuat admin baru');
        }

        // Check if email exists
        const { data: existingUser } = await adminClient
            .from('users')
            .select('id')
            .eq('email', dto.email)
            .single();

        if (existingUser) {
            throw new ConflictException('Email sudah terdaftar');
        }

        // Generate password
        const generatedPassword = this.generateRandomPassword(16);
        const passwordHash = await bcrypt.hash(generatedPassword, this.SALT_ROUNDS);

        // Create user
        const role = dto.isSuperAdmin ? UserRole.SUPER_ADMIN : UserRole.ADMIN;

        const { data: user, error: userError } = await adminClient
            .from('users')
            .insert({
                email: dto.email,
                password_hash: passwordHash,
                role,
                status: UserStatus.ACTIVE,
                email_verified: true,
                must_change_password: true,
            })
            .select()
            .single();

        if (userError) {
            this.logger.error(`Failed to create admin user: ${userError.message}`);
            throw new BadRequestException('Gagal membuat admin');
        }

        // Create admin profile
        const { error: adminError } = await adminClient
            .from('admins')
            .insert({
                user_id: user.id,
                full_name: dto.fullName,
                phone: dto.phone,
                is_super_admin: dto.isSuperAdmin || false,
                permissions: dto.isSuperAdmin ? { all: true } : {},
            });

        if (adminError) {
            await adminClient.from('users').delete().eq('id', user.id);
            this.logger.error(`Failed to create admin profile: ${adminError.message}`);
            throw new BadRequestException('Gagal membuat profil admin');
        }

        await this.logAdminActivity(creatorId, 'CREATE_ADMIN', `Created admin ${dto.email}`, {
            newAdminId: user.id,
            email: dto.email,
            isSuperAdmin: dto.isSuperAdmin,
        });

        return {
            message: 'Admin berhasil dibuat',
            admin: {
                id: user.id,
                email: dto.email,
                fullName: dto.fullName,
            },
            generatedPassword,
        };
    }

    // ==========================================
    // NOTIFICATIONS
    // ==========================================

    /**
     * Broadcast notification to all users
     */
    async broadcastNotification(adminId: string, dto: BroadcastNotificationDto) {
        const adminClient = this.supabaseService.getAdminClient();

        // Get all active users
        const { data: users } = await adminClient
            .from('users')
            .select('id')
            .eq('status', UserStatus.ACTIVE);

        if (!users || users.length === 0) {
            throw new BadRequestException('Tidak ada user aktif');
        }

        // Create notifications
        const notifications = users.map((user) => ({
            sender_id: adminId,
            recipient_id: user.id,
            type: NotificationType.BROADCAST,
            title: dto.title,
            message: dto.message,
        }));

        const { error } = await adminClient
            .from('notifications')
            .insert(notifications);

        if (error) {
            this.logger.error(`Failed to broadcast: ${error.message}`);
            throw new BadRequestException('Gagal mengirim broadcast');
        }

        await this.logAdminActivity(adminId, 'BROADCAST', `Broadcast: ${dto.title}`, {
            recipientCount: users.length,
        });

        return {
            message: 'Broadcast berhasil dikirim',
            recipientCount: users.length,
        };
    }

    /**
     * Send notification to specific user
     */
    async sendNotification(adminId: string, dto: SendNotificationDto) {
        const adminClient = this.supabaseService.getAdminClient();

        // Check if recipient exists
        const { data: recipient } = await adminClient
            .from('users')
            .select('id')
            .eq('id', dto.recipientId)
            .single();

        if (!recipient) {
            throw new NotFoundException('Penerima tidak ditemukan');
        }

        const { error } = await adminClient
            .from('notifications')
            .insert({
                sender_id: adminId,
                recipient_id: dto.recipientId,
                type: NotificationType.TARGETED,
                title: dto.title,
                message: dto.message,
            });

        if (error) {
            this.logger.error(`Failed to send notification: ${error.message}`);
            throw new BadRequestException('Gagal mengirim notifikasi');
        }

        await this.logAdminActivity(adminId, 'SEND_NOTIFICATION', `Sent: ${dto.title}`, {
            recipientId: dto.recipientId,
        });

        return { message: 'Notifikasi berhasil dikirim' };
    }

    /**
     * Role-based broadcast notification
     * Send to specific roles: students, teachers, parents, or combination
     * Example: "Selamat Ujian" to all students, "Pengambilan Rapot" to all parents
     */
    async roleBroadcastNotification(adminId: string, dto: RoleBroadcastNotificationDto) {
        const adminClient = this.supabaseService.getAdminClient();

        // Get all active users with specified roles
        const { data: users, error: usersError } = await adminClient
            .from('users')
            .select('id, role')
            .eq('status', UserStatus.ACTIVE)
            .in('role', dto.targetRoles);

        if (usersError) {
            this.logger.error(`Failed to get users: ${usersError.message}`);
            throw new BadRequestException('Gagal mengambil data user');
        }

        if (!users || users.length === 0) {
            throw new BadRequestException(`Tidak ada user aktif dengan role: ${dto.targetRoles.join(', ')}`);
        }

        // Create notifications for each user
        const notifications = users.map((user) => ({
            sender_id: adminId,
            recipient_id: user.id,
            type: NotificationType.BROADCAST,
            title: dto.title,
            message: dto.message,
            metadata: { targetRoles: dto.targetRoles },
        }));

        const { error } = await adminClient
            .from('notifications')
            .insert(notifications);

        if (error) {
            this.logger.error(`Failed to role broadcast: ${error.message}`);
            throw new BadRequestException('Gagal mengirim broadcast ke role');
        }

        // Count by role
        const roleCount: Record<string, number> = {};
        users.forEach((user) => {
            roleCount[user.role] = (roleCount[user.role] || 0) + 1;
        });

        await this.logAdminActivity(adminId, 'ROLE_BROADCAST', `Role Broadcast: ${dto.title}`, {
            targetRoles: dto.targetRoles,
            recipientCount: users.length,
            roleCount,
        });

        return {
            message: 'Broadcast per role berhasil dikirim',
            recipientCount: users.length,
            roleCount,
        };
    }

    // ==========================================
    // DASHBOARD STATS
    // ==========================================

    /**
     * Get dashboard statistics
     */
    async getDashboardStats() {
        const adminClient = this.supabaseService.getAdminClient();

        // Get counts
        const [
            { count: totalStudents },
            { count: totalTeachers },
            { count: totalParents },
            { count: pendingRegistrations },
            { count: activeUsers },
        ] = await Promise.all([
            adminClient.from('students').select('*', { count: 'exact', head: true }),
            adminClient.from('teachers').select('*', { count: 'exact', head: true }),
            adminClient.from('parents').select('*', { count: 'exact', head: true }),
            adminClient.from('registration_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', RegistrationStatus.PENDING),
            adminClient.from('users')
                .select('*', { count: 'exact', head: true })
                .eq('status', UserStatus.ACTIVE),
        ]);

        // Get recent activity
        const { data: recentActivity } = await adminClient
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        return {
            stats: {
                totalStudents: totalStudents || 0,
                totalTeachers: totalTeachers || 0,
                totalParents: totalParents || 0,
                totalUsers: activeUsers || 0,
                pendingRegistrations: pendingRegistrations || 0,
            },
            recentActivity: recentActivity || [],
        };
    }

    // ==========================================
    // DIRECT USER CREATION (Bypass registration)
    // ==========================================

    /**
     * Create student directly (admin creates, no registration request)
     */
    async createStudent(adminId: string, dto: AdminCreateStudentDto) {
        const adminClient = this.supabaseService.getAdminClient();

        // Check NISN
        const { data: existingStudent } = await adminClient
            .from('students')
            .select('id')
            .eq('nisn', dto.nisn)
            .single();

        if (existingStudent) {
            throw new ConflictException('NISN sudah terdaftar');
        }

        // Check email
        const { data: existingUser } = await adminClient
            .from('users')
            .select('id')
            .eq('email', dto.email)
            .single();

        if (existingUser) {
            throw new ConflictException('Email sudah terdaftar');
        }

        // Generate password
        const generatedPassword = this.generateRandomPassword(12);
        const passwordHash = await bcrypt.hash(generatedPassword, this.SALT_ROUNDS);

        // Create user
        const { data: user, error: userError } = await adminClient
            .from('users')
            .insert({
                email: dto.email,
                password_hash: passwordHash,
                role: UserRole.STUDENT,
                status: UserStatus.ACTIVE,
                must_change_password: true,
            })
            .select()
            .single();

        if (userError) {
            throw new BadRequestException('Gagal membuat akun');
        }

        // Create student profile
        const { error: studentError } = await adminClient
            .from('students')
            .insert({
                user_id: user.id,
                nisn: dto.nisn,
                full_name: dto.fullName,
                kelas: dto.kelas,
                jurusan: dto.jurusan,
                tahun_ajaran: dto.tahunAjaran,
                wali_kelas: dto.waliKelas,
                phone: dto.phone,
                address: dto.address,
                is_verified: true,
                verified_at: new Date().toISOString(),
                verified_by: adminId,
            });

        if (studentError) {
            await adminClient.from('users').delete().eq('id', user.id);
            throw new BadRequestException('Gagal membuat profil siswa');
        }

        await this.logAdminActivity(adminId, 'CREATE_STUDENT', `Created student ${dto.fullName}`, {
            studentNisn: dto.nisn,
            email: dto.email,
        });

        return {
            message: 'Siswa berhasil dibuat',
            student: {
                id: user.id,
                nisn: dto.nisn,
                fullName: dto.fullName,
                email: dto.email,
            },
            generatedPassword,
        };
    }

    /**
     * Create teacher directly
     */
    async createTeacher(adminId: string, dto: AdminCreateTeacherDto) {
        const adminClient = this.supabaseService.getAdminClient();

        // Check NIP
        const { data: existingTeacher } = await adminClient
            .from('teachers')
            .select('id')
            .eq('nip', dto.nip)
            .single();

        if (existingTeacher) {
            throw new ConflictException('NIP sudah terdaftar');
        }

        // Check email
        const { data: existingUser } = await adminClient
            .from('users')
            .select('id')
            .eq('email', dto.email)
            .single();

        if (existingUser) {
            throw new ConflictException('Email sudah terdaftar');
        }

        // Generate password
        const generatedPassword = this.generateRandomPassword(12);
        const passwordHash = await bcrypt.hash(generatedPassword, this.SALT_ROUNDS);

        // Create user
        const { data: user, error: userError } = await adminClient
            .from('users')
            .insert({
                email: dto.email,
                password_hash: passwordHash,
                role: UserRole.TEACHER,
                status: UserStatus.ACTIVE,
                must_change_password: true,
            })
            .select()
            .single();

        if (userError) {
            throw new BadRequestException('Gagal membuat akun');
        }

        // Create teacher profile
        const { error: teacherError } = await adminClient
            .from('teachers')
            .insert({
                user_id: user.id,
                nip: dto.nip,
                full_name: dto.fullName,
                subject: dto.subject,
                phone: dto.phone,
                address: dto.address,
                is_verified: true,
                verified_at: new Date().toISOString(),
                verified_by: adminId,
            });

        if (teacherError) {
            await adminClient.from('users').delete().eq('id', user.id);
            throw new BadRequestException('Gagal membuat profil guru');
        }

        await this.logAdminActivity(adminId, 'CREATE_TEACHER', `Created teacher ${dto.fullName}`, {
            teacherNip: dto.nip,
            email: dto.email,
        });

        return {
            message: 'Guru berhasil dibuat',
            teacher: {
                id: user.id,
                nip: dto.nip,
                fullName: dto.fullName,
                email: dto.email,
            },
            generatedPassword,
        };
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    private generateRandomPassword(length: number = 12): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    private async sendNotificationToUser(
        userId: string,
        title: string,
        message: string,
    ) {
        const adminClient = this.supabaseService.getAdminClient();

        await adminClient.from('notifications').insert({
            recipient_id: userId,
            type: NotificationType.SYSTEM,
            title,
            message,
        });
    }

    private async logAdminActivity(
        adminId: string,
        action: string,
        description: string,
        metadata?: Record<string, unknown>,
    ) {
        const adminClient = this.supabaseService.getAdminClient();

        await adminClient.from('activity_logs').insert({
            user_id: adminId,
            action,
            description,
            metadata: metadata || {},
        });
    }
}
