import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private readonly supabaseService: SupabaseService) { }

    /**
     * Get all notifications for a user
     */
    async getNotifications(userId: string, page = 1, limit = 20, unreadOnly = false) {
        const adminClient = this.supabaseService.getAdminClient();
        const offset = (page - 1) * limit;

        let query = adminClient
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('recipient_id', userId)
            .order('sent_at', { ascending: false });

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            this.logger.error(`Failed to get notifications: ${error.message}`);
            throw new BadRequestException('Gagal mengambil notifikasi');
        }

        return {
            notifications: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        };
    }

    /**
     * Get a single notification
     */
    async getNotification(userId: string, notificationId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { data, error } = await adminClient
            .from('notifications')
            .select('*')
            .eq('id', notificationId)
            .eq('recipient_id', userId)
            .single();

        if (error || !data) {
            throw new NotFoundException('Notifikasi tidak ditemukan');
        }

        return data;
    }

    /**
     * Mark notification as read
     */
    async markAsRead(userId: string, notificationId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { error } = await adminClient
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('recipient_id', userId);

        if (error) {
            throw new BadRequestException('Gagal menandai notifikasi');
        }

        return { message: 'Notifikasi ditandai sebagai dibaca' };
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { error } = await adminClient
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('recipient_id', userId)
            .eq('is_read', false);

        if (error) {
            throw new BadRequestException('Gagal menandai semua notifikasi');
        }

        return { message: 'Semua notifikasi ditandai sebagai dibaca' };
    }

    /**
     * Delete a notification
     */
    async deleteNotification(userId: string, notificationId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { error } = await adminClient
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('recipient_id', userId);

        if (error) {
            throw new BadRequestException('Gagal menghapus notifikasi');
        }

        return { message: 'Notifikasi dihapus' };
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { count, error } = await adminClient
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', userId)
            .eq('is_read', false);

        if (error) {
            this.logger.error(`Failed to get unread count: ${error.message}`);
            return { count: 0 };
        }

        return { count: count || 0 };
    }
}
