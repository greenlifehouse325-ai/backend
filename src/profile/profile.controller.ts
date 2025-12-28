import {
    Controller,
    Get,
    Patch,
    Delete,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import type { AuthUser } from '../common/interfaces';

@Controller('v1/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    // ==========================================
    // PROFILE
    // ==========================================

    /**
     * GET /api/v1/profile
     * Get my full profile
     */
    @Get()
    async getMyProfile(@CurrentUser() user: AuthUser) {
        const profile = await this.profileService.getMyProfile(user.id);
        return {
            success: true,
            data: profile,
        };
    }

    /**
     * PATCH /api/v1/profile
     * Update my profile
     */
    @Patch()
    async updateProfile(
        @CurrentUser() user: AuthUser,
        @Body() data: Record<string, unknown>,
    ) {
        // Remove sensitive fields that shouldn't be updated directly
        delete data.user_id;
        delete data.id;
        delete data.is_verified;
        delete data.verified_at;
        delete data.verified_by;

        const result = await this.profileService.updateProfile(user.id, data);
        return {
            success: true,
            message: result.message,
        };
    }

    // ==========================================
    // SECURITY - PERANGKAT TERHUBUNG
    // ==========================================

    /**
     * GET /api/v1/profile/security/sessions
     * Get active device sessions (Perangkat Terhubung)
     */
    @Get('security/sessions')
    async getDeviceSessions(@CurrentUser() user: AuthUser) {
        const sessions = await this.profileService.getDeviceSessions(user.id);
        return {
            success: true,
            data: sessions,
        };
    }

    /**
     * DELETE /api/v1/profile/security/sessions/:id
     * Revoke a specific device session
     */
    @Delete('security/sessions/:id')
    @HttpCode(HttpStatus.OK)
    async revokeSession(
        @CurrentUser() user: AuthUser,
        @Param('id') sessionId: string,
    ) {
        const result = await this.profileService.revokeSession(user.id, sessionId);
        return {
            success: true,
            message: result.message,
        };
    }

    /**
     * POST /api/v1/profile/security/sessions/logout-all
     * Revoke all other sessions (Logout dari semua perangkat)
     */
    @Post('security/sessions/logout-all')
    @HttpCode(HttpStatus.OK)
    async revokeAllOtherSessions(@CurrentUser() user: AuthUser) {
        const result = await this.profileService.revokeAllOtherSessions(user.id);
        return {
            success: true,
            message: result.message,
        };
    }

    // ==========================================
    // SECURITY - RIWAYAT AKTIVITAS
    // ==========================================

    /**
     * GET /api/v1/profile/security/activity
     * Get activity log (Riwayat Aktivitas)
     */
    @Get('security/activity')
    async getActivityLog(
        @CurrentUser() user: AuthUser,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const result = await this.profileService.getActivityLog(
            user.id,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
        return {
            success: true,
            data: result.data,
            pagination: result.pagination,
        };
    }

    // ==========================================
    // SECURITY - PASSWORD
    // ==========================================

    /**
     * PATCH /api/v1/profile/security/password
     * Change password
     */
    @Patch('security/password')
    async changePassword(
        @CurrentUser() user: AuthUser,
        @Body('currentPassword') currentPassword: string,
        @Body('newPassword') newPassword: string,
    ) {
        const result = await this.profileService.changePassword(
            user.id,
            currentPassword,
            newPassword,
        );
        return {
            success: true,
            message: result.message,
        };
    }

    // ==========================================
    // ACCOUNT
    // ==========================================

    /**
     * DELETE /api/v1/profile/account
     * Delete own account (Hapus Akun)
     */
    @Delete('account')
    @HttpCode(HttpStatus.OK)
    async deleteAccount(
        @CurrentUser() user: AuthUser,
        @Body('password') password: string,
    ) {
        const result = await this.profileService.deleteAccount(user.id, password);
        return {
            success: true,
            message: result.message,
        };
    }
}
