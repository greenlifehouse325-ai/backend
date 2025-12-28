import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
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
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { UserRole } from '../common/enums';
import type { AuthUser } from '../common/interfaces';

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    // ==========================================
    // REGISTRATION MANAGEMENT
    // ==========================================

    /**
     * GET /api/v1/admin/registrations
     * Get registration requests with filters
     */
    @Get('registrations')
    async getRegistrations(
        @Query('status') status?: string,
        @Query('type') type?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const result = await this.adminService.getAllRegistrations(
            status,
            type,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
        return {
            success: true,
            data: result.data,
            pagination: result.pagination,
        };
    }

    /**
     * GET /api/v1/admin/registrations/pending
     * Get pending registrations only
     */
    @Get('registrations/pending')
    async getPendingRegistrations(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const result = await this.adminService.getPendingRegistrations(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
        return {
            success: true,
            data: result.data,
            pagination: result.pagination,
        };
    }

    /**
     * GET /api/v1/admin/registrations/:id
     * Get single registration detail
     */
    @Get('registrations/:id')
    async getRegistration(@Param('id') id: string) {
        const data = await this.adminService.getRegistration(id);
        return {
            success: true,
            data,
        };
    }

    /**
     * POST /api/v1/admin/registrations/:id/approve
     * Approve a registration request
     */
    @Post('registrations/:id/approve')
    @HttpCode(HttpStatus.OK)
    async approveRegistration(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body() dto: ApproveRegistrationDto,
    ) {
        const result = await this.adminService.approveRegistration(id, user.id, dto);
        return {
            success: true,
            message: result.message,
            data: {
                generatedPassword: result.generatedPassword,
                userEmail: result.userEmail,
            },
        };
    }

    /**
     * POST /api/v1/admin/registrations/:id/reject
     * Reject a registration request
     */
    @Post('registrations/:id/reject')
    @HttpCode(HttpStatus.OK)
    async rejectRegistration(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body() dto: RejectRegistrationDto,
    ) {
        const result = await this.adminService.rejectRegistration(id, user.id, dto);
        return {
            success: true,
            message: result.message,
        };
    }

    // ==========================================
    // USER MANAGEMENT
    // ==========================================

    /**
     * GET /api/v1/admin/users
     * Get all users with filters
     */
    @Get('users')
    async getUsers(
        @Query('role') role?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const result = await this.adminService.getUsers(
            role,
            status,
            search,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
        return {
            success: true,
            data: result.data,
            pagination: result.pagination,
        };
    }

    /**
     * GET /api/v1/admin/users/:id
     * Get single user detail with profile
     */
    @Get('users/:id')
    async getUser(@Param('id') id: string) {
        const result = await this.adminService.getUser(id);
        return {
            success: true,
            data: result,
        };
    }

    /**
     * PATCH /api/v1/admin/users/:id/suspend
     * Suspend a user
     */
    @Patch('users/:id/suspend')
    async suspendUser(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body('reason') reason?: string,
    ) {
        const result = await this.adminService.suspendUser(id, user.id, reason);
        return {
            success: true,
            message: result.message,
        };
    }

    /**
     * PATCH /api/v1/admin/users/:id/reactivate
     * Reactivate a suspended user
     */
    @Patch('users/:id/reactivate')
    async reactivateUser(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
    ) {
        const result = await this.adminService.reactivateUser(id, user.id);
        return {
            success: true,
            message: result.message,
        };
    }

    /**
     * DELETE /api/v1/admin/users/:id
     * Delete a user
     */
    @Delete('users/:id')
    async deleteUser(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
    ) {
        const result = await this.adminService.deleteUser(id, user.id);
        return {
            success: true,
            message: result.message,
        };
    }

    // ==========================================
    // DIRECT USER CREATION
    // ==========================================

    /**
     * POST /api/v1/admin/students
     * Create a student directly (bypass registration)
     */
    @Post('students')
    @HttpCode(HttpStatus.CREATED)
    async createStudent(
        @CurrentUser() user: AuthUser,
        @Body() dto: AdminCreateStudentDto,
    ) {
        const result = await this.adminService.createStudent(user.id, dto);
        return {
            success: true,
            message: result.message,
            data: {
                student: result.student,
                generatedPassword: result.generatedPassword,
            },
        };
    }

    /**
     * POST /api/v1/admin/teachers
     * Create a teacher directly (bypass registration)
     */
    @Post('teachers')
    @HttpCode(HttpStatus.CREATED)
    async createTeacher(
        @CurrentUser() user: AuthUser,
        @Body() dto: AdminCreateTeacherDto,
    ) {
        const result = await this.adminService.createTeacher(user.id, dto);
        return {
            success: true,
            message: result.message,
            data: {
                teacher: result.teacher,
                generatedPassword: result.generatedPassword,
            },
        };
    }

    // ==========================================
    // ADMIN CREATION (Super Admin only)
    // ==========================================

    /**
     * POST /api/v1/admin/admins
     * Create a new admin (super admin only)
     */
    @Post('admins')
    @Roles(UserRole.SUPER_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    async createAdmin(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateAdminDto,
    ) {
        const result = await this.adminService.createAdmin(user.id, dto);
        return {
            success: true,
            message: result.message,
            data: {
                admin: result.admin,
                generatedPassword: result.generatedPassword,
            },
        };
    }

    // ==========================================
    // NOTIFICATIONS
    // ==========================================

    /**
     * POST /api/v1/admin/notifications/broadcast
     * Send broadcast notification to all users
     */
    @Post('notifications/broadcast')
    @HttpCode(HttpStatus.OK)
    async broadcastNotification(
        @CurrentUser() user: AuthUser,
        @Body() dto: BroadcastNotificationDto,
    ) {
        const result = await this.adminService.broadcastNotification(user.id, dto);
        return {
            success: true,
            message: result.message,
            data: { recipientCount: result.recipientCount },
        };
    }

    /**
     * POST /api/v1/admin/notifications/send
     * Send notification to specific user
     */
    @Post('notifications/send')
    @HttpCode(HttpStatus.OK)
    async sendNotification(
        @CurrentUser() user: AuthUser,
        @Body() dto: SendNotificationDto,
    ) {
        const result = await this.adminService.sendNotification(user.id, dto);
        return {
            success: true,
            message: result.message,
        };
    }

    /**
     * POST /api/v1/admin/notifications/role-broadcast
     * Send broadcast to specific roles (students, teachers, parents, or combinations)
     * Example use cases:
     * - "Selamat Ujian" to all students
     * - "Pengambilan Rapot" to all parents
     * - "Libur Semester" to students + teachers
     */
    @Post('notifications/role-broadcast')
    @HttpCode(HttpStatus.OK)
    async roleBroadcastNotification(
        @CurrentUser() user: AuthUser,
        @Body() dto: RoleBroadcastNotificationDto,
    ) {
        const result = await this.adminService.roleBroadcastNotification(user.id, dto);
        return {
            success: true,
            message: result.message,
            data: {
                recipientCount: result.recipientCount,
                roleCount: result.roleCount,
            },
        };
    }

    // ==========================================
    // DASHBOARD
    // ==========================================

    /**
     * GET /api/v1/admin/dashboard/stats
     * Get dashboard statistics
     */
    @Get('dashboard/stats')
    async getDashboardStats() {
        const result = await this.adminService.getDashboardStats();
        return {
            success: true,
            data: result,
        };
    }
}
