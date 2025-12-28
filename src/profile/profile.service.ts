import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UserRole, UserStatus } from '../common/enums';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name);
    private readonly SALT_ROUNDS = 10;

    constructor(private readonly supabaseService: SupabaseService) { }

    // ==========================================
    // PROFILE MANAGEMENT
    // ==========================================

    /**
     * Get current user's full profile
     */
    async getMyProfile(userId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { data: user, error } = await adminClient
            .from('users')
            .select('*')
            .eq('id', userId)
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
                .eq('user_id', userId)
                .single();
            profile = data;
        } else if (user.role === UserRole.TEACHER) {
            const { data } = await adminClient
                .from('teachers')
                .select('*')
                .eq('user_id', userId)
                .single();
            profile = data;
        } else if (user.role === UserRole.PARENT) {
            const { data } = await adminClient
                .from('parents')
                .select('*, students(nisn, full_name, kelas, jurusan)')
                .eq('user_id', userId)
                .single();
            profile = data;
        } else if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
            const { data } = await adminClient
                .from('admins')
                .select('*')
                .eq('user_id', userId)
                .single();
            profile = data;
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            emailVerified: user.email_verified,
            mustChangePassword: user.must_change_password,
            lastLogin: user.last_login,
            createdAt: user.created_at,
            profile,
        };
    }

    /**
     * Update profile (basic fields)
     */
    async updateProfile(userId: string, data: Record<string, unknown>) {
        const adminClient = this.supabaseService.getAdminClient();

        // Get user's role
        const { data: user } = await adminClient
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (!user) {
            throw new NotFoundException('User tidak ditemukan');
        }

        // Update based on role
        let tableName = '';
        switch (user.role) {
            case UserRole.STUDENT:
                tableName = 'students';
                break;
            case UserRole.TEACHER:
                tableName = 'teachers';
                break;
            case UserRole.PARENT:
                tableName = 'parents';
                break;
            case UserRole.ADMIN:
            case UserRole.SUPER_ADMIN:
                tableName = 'admins';
                break;
            default:
                throw new BadRequestException('Role tidak valid');
        }

        const { error } = await adminClient
            .from(tableName)
            .update({
                ...data,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (error) {
            this.logger.error(`Failed to update profile: ${error.message}`);
            throw new BadRequestException('Gagal update profil');
        }

        await this.logActivity(userId, 'UPDATE_PROFILE', 'Profile updated');

        return { message: 'Profil berhasil diupdate' };
    }

    // ==========================================
    // SECURITY - DEVICE SESSIONS
    // ==========================================

    /**
     * Get active device sessions
     */
    async getDeviceSessions(userId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { data, error } = await adminClient
            .from('device_sessions')
            .select('id, device_name, device_type, ip_address, user_agent, is_active, last_activity, created_at')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('last_activity', { ascending: false });

        if (error) {
            this.logger.error(`Failed to get sessions: ${error.message}`);
            throw new BadRequestException('Gagal mengambil sesi perangkat');
        }

        return data || [];
    }

    /**
     * Revoke a device session
     */
    async revokeSession(userId: string, sessionId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        // Verify session belongs to user
        const { data: session } = await adminClient
            .from('device_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .single();

        if (!session) {
            throw new NotFoundException('Sesi tidak ditemukan');
        }

        const { error } = await adminClient
            .from('device_sessions')
            .update({ is_active: false })
            .eq('id', sessionId);

        if (error) {
            throw new BadRequestException('Gagal mencabut sesi');
        }

        await this.logActivity(userId, 'REVOKE_SESSION', `Revoked session ${sessionId}`);

        return { message: 'Sesi berhasil dicabut' };
    }

    /**
     * Revoke all other sessions (logout everywhere)
     */
    async revokeAllOtherSessions(userId: string, currentSessionId?: string) {
        const adminClient = this.supabaseService.getAdminClient();

        let query = adminClient
            .from('device_sessions')
            .update({ is_active: false })
            .eq('user_id', userId)
            .eq('is_active', true);

        // Exclude current session if provided
        if (currentSessionId) {
            query = query.neq('id', currentSessionId);
        }

        const { error } = await query;

        if (error) {
            throw new BadRequestException('Gagal mencabut sesi');
        }

        await this.logActivity(userId, 'REVOKE_ALL_SESSIONS', 'Revoked all other sessions');

        return { message: 'Semua sesi lain berhasil dicabut' };
    }

    // ==========================================
    // SECURITY - ACTIVITY LOG
    // ==========================================

    /**
     * Get activity log for user
     */
    async getActivityLog(userId: string, page = 1, limit = 20) {
        const adminClient = this.supabaseService.getAdminClient();
        const offset = (page - 1) * limit;

        const { data, error, count } = await adminClient
            .from('activity_logs')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            this.logger.error(`Failed to get activity log: ${error.message}`);
            throw new BadRequestException('Gagal mengambil riwayat aktivitas');
        }

        return {
            data: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        };
    }

    // ==========================================
    // SECURITY - PASSWORD
    // ==========================================

    /**
     * Change password
     */
    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string,
    ) {
        const adminClient = this.supabaseService.getAdminClient();

        // Get current password hash
        const { data: user } = await adminClient
            .from('users')
            .select('password_hash')
            .eq('id', userId)
            .single();

        if (!user || !user.password_hash) {
            throw new BadRequestException('User tidak memiliki password');
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            throw new BadRequestException('Password lama salah');
        }

        // Hash new password
        const newHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

        // Update
        const { error } = await adminClient
            .from('users')
            .update({
                password_hash: newHash,
                must_change_password: false,
            })
            .eq('id', userId);

        if (error) {
            throw new BadRequestException('Gagal mengubah password');
        }

        await this.logActivity(userId, 'CHANGE_PASSWORD', 'Password changed');

        return { message: 'Password berhasil diubah' };
    }

    // ==========================================
    // ACCOUNT DELETION
    // ==========================================

    /**
     * Delete own account
     */
    async deleteAccount(userId: string, password: string) {
        const adminClient = this.supabaseService.getAdminClient();

        // Get user
        const { data: user } = await adminClient
            .from('users')
            .select('password_hash, role')
            .eq('id', userId)
            .single();

        if (!user) {
            throw new NotFoundException('User tidak ditemukan');
        }

        // Super admin cannot delete themselves
        if (user.role === UserRole.SUPER_ADMIN) {
            throw new BadRequestException('Super Admin tidak dapat menghapus akun sendiri');
        }

        // Verify password
        if (user.password_hash) {
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                throw new BadRequestException('Password salah');
            }
        }

        // Delete user (cascade handles related records)
        const { error } = await adminClient
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) {
            this.logger.error(`Failed to delete account: ${error.message}`);
            throw new BadRequestException('Gagal menghapus akun');
        }

        return { message: 'Akun berhasil dihapus' };
    }

    // ==========================================
    // HELPER
    // ==========================================

    private async logActivity(
        userId: string,
        action: string,
        description?: string,
    ) {
        const adminClient = this.supabaseService.getAdminClient();

        await adminClient.from('activity_logs').insert({
            user_id: userId,
            action,
            description,
        });
    }
}
