import {
    Controller,
    Get,
    Patch,
    Delete,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import type { AuthUser } from '../common/interfaces';

@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    /**
     * GET /api/v1/notifications
     * Get all notifications for current user
     */
    @Get()
    async getNotifications(
        @CurrentUser() user: AuthUser,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('unreadOnly') unreadOnly?: string,
    ) {
        const result = await this.notificationsService.getNotifications(
            user.id,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            unreadOnly === 'true',
        );
        return {
            success: true,
            data: result.notifications,
            pagination: result.pagination,
        };
    }

    /**
     * GET /api/v1/notifications/unread-count
     * Get unread notification count
     */
    @Get('unread-count')
    async getUnreadCount(@CurrentUser() user: AuthUser) {
        const result = await this.notificationsService.getUnreadCount(user.id);
        return {
            success: true,
            data: result,
        };
    }

    /**
     * GET /api/v1/notifications/:id
     * Get a single notification
     */
    @Get(':id')
    async getNotification(
        @CurrentUser() user: AuthUser,
        @Param('id') id: string,
    ) {
        const notification = await this.notificationsService.getNotification(user.id, id);
        return {
            success: true,
            data: notification,
        };
    }

    /**
     * PATCH /api/v1/notifications/:id/read
     * Mark notification as read
     */
    @Patch(':id/read')
    async markAsRead(
        @CurrentUser() user: AuthUser,
        @Param('id') id: string,
    ) {
        await this.notificationsService.markAsRead(user.id, id);
        return {
            success: true,
            message: 'Notifikasi ditandai sebagai dibaca',
        };
    }

    /**
     * PATCH /api/v1/notifications/read-all
     * Mark all notifications as read
     */
    @Patch('read-all')
    async markAllAsRead(@CurrentUser() user: AuthUser) {
        await this.notificationsService.markAllAsRead(user.id);
        return {
            success: true,
            message: 'Semua notifikasi ditandai sebagai dibaca',
        };
    }

    /**
     * DELETE /api/v1/notifications/:id
     * Delete a notification
     */
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async deleteNotification(
        @CurrentUser() user: AuthUser,
        @Param('id') id: string,
    ) {
        await this.notificationsService.deleteNotification(user.id, id);
        return {
            success: true,
            message: 'Notifikasi dihapus',
        };
    }
}
