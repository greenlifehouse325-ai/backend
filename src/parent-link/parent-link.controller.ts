import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ParentLinkService } from './parent-link.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { UserRole } from '../common/enums';
import type { AuthUser } from '../common/interfaces';

@Controller('v1/parent-link')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParentLinkController {
    constructor(private readonly parentLinkService: ParentLinkService) { }

    // ==========================================
    // PARENT ENDPOINTS
    // ==========================================

    /**
     * POST /api/v1/parent-link/request
     * Parent requests to link with a student
     */
    @Post('request')
    @Roles(UserRole.PARENT)
    @HttpCode(HttpStatus.CREATED)
    async requestLink(
        @CurrentUser() user: AuthUser,
        @Body('nisn') nisn: string,
    ) {
        const result = await this.parentLinkService.requestLink(user.id, nisn);
        return {
            success: true,
            message: result.message,
            data: { studentName: result.studentName },
        };
    }

    /**
     * GET /api/v1/parent-link/status
     * Get current link status for parent
     */
    @Get('status')
    @Roles(UserRole.PARENT)
    async getLinkStatus(@CurrentUser() user: AuthUser) {
        const result = await this.parentLinkService.getLinkStatus(user.id);
        return {
            success: true,
            data: result,
        };
    }

    // ==========================================
    // STUDENT ENDPOINTS
    // ==========================================

    /**
     * GET /api/v1/parent-link/pending
     * Get pending link requests for student
     */
    @Get('pending')
    @Roles(UserRole.STUDENT)
    async getPendingRequests(@CurrentUser() user: AuthUser) {
        const requests = await this.parentLinkService.getPendingRequests(user.id);
        return {
            success: true,
            data: requests,
        };
    }

    /**
     * POST /api/v1/parent-link/:id/approve
     * Student approves parent link request
     */
    @Post(':id/approve')
    @Roles(UserRole.STUDENT)
    @HttpCode(HttpStatus.OK)
    async approveLink(
        @CurrentUser() user: AuthUser,
        @Param('id') parentId: string,
    ) {
        const result = await this.parentLinkService.approveLink(user.id, parentId);
        return {
            success: true,
            message: result.message,
        };
    }

    /**
     * POST /api/v1/parent-link/:id/reject
     * Student rejects parent link request
     */
    @Post(':id/reject')
    @Roles(UserRole.STUDENT)
    @HttpCode(HttpStatus.OK)
    async rejectLink(
        @CurrentUser() user: AuthUser,
        @Param('id') parentId: string,
    ) {
        const result = await this.parentLinkService.rejectLink(user.id, parentId);
        return {
            success: true,
            message: result.message,
        };
    }
}
