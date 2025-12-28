import {
    Controller,
    Post,
    Body,
    Get,
    Patch,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { MultiRoleAuthService } from './multi-role-auth.service';
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
import { JwtAuthGuard } from '../common/guards';
import { Public, CurrentUser } from '../common/decorators';
import type { AuthUser } from '../common/interfaces';

@Controller('v1/auth')
export class MultiRoleAuthController {
    constructor(private readonly authService: MultiRoleAuthService) { }

    // ==========================================
    // REGISTRATION ENDPOINTS
    // ==========================================

    /**
     * POST /api/v1/auth/signup/student
     * Student submits registration request (awaits admin approval)
     */
    @Public()
    @Post('signup/student')
    @HttpCode(HttpStatus.CREATED)
    async signupStudent(@Body() dto: SignupStudentDto) {
        const result = await this.authService.registerStudent(dto);
        return {
            success: true,
            message: result.message,
            data: { requestId: result.requestId },
        };
    }

    /**
     * POST /api/v1/auth/signup/teacher
     * Teacher submits registration request (awaits admin approval)
     */
    @Public()
    @Post('signup/teacher')
    @HttpCode(HttpStatus.CREATED)
    async signupTeacher(@Body() dto: SignupTeacherDto) {
        const result = await this.authService.registerTeacher(dto);
        return {
            success: true,
            message: result.message,
            data: { requestId: result.requestId },
        };
    }

    /**
     * POST /api/v1/auth/signup/parent
     * Parent self-registers (immediately active, can link to student later)
     */
    @Public()
    @Post('signup/parent')
    @HttpCode(HttpStatus.CREATED)
    async signupParent(@Body() dto: SignupParentDto) {
        const session = await this.authService.registerParent(dto);
        return {
            success: true,
            message: 'Registrasi berhasil',
            data: session,
        };
    }

    // ==========================================
    // LOGIN ENDPOINTS
    // ==========================================

    /**
     * POST /api/v1/auth/login/student
     * Student login using NISN + password
     */
    @Public()
    @Post('login/student')
    @HttpCode(HttpStatus.OK)
    async loginStudent(@Body() dto: LoginStudentDto) {
        const session = await this.authService.loginStudent(dto);
        return {
            success: true,
            message: 'Login berhasil',
            data: session,
        };
    }

    /**
     * POST /api/v1/auth/login/teacher
     * Teacher login using NIP/Email + password
     */
    @Public()
    @Post('login/teacher')
    @HttpCode(HttpStatus.OK)
    async loginTeacher(@Body() dto: LoginTeacherDto) {
        const session = await this.authService.loginTeacher(dto);
        return {
            success: true,
            message: 'Login berhasil',
            data: session,
        };
    }

    /**
     * POST /api/v1/auth/login/parent
     * Parent login using Email + password
     */
    @Public()
    @Post('login/parent')
    @HttpCode(HttpStatus.OK)
    async loginParent(@Body() dto: LoginParentDto) {
        const session = await this.authService.loginParent(dto);
        return {
            success: true,
            message: 'Login berhasil',
            data: session,
        };
    }

    /**
     * POST /api/v1/auth/login/admin
     * Admin login using Email + password
     */
    @Public()
    @Post('login/admin')
    @HttpCode(HttpStatus.OK)
    async loginAdmin(@Body() dto: LoginAdminDto) {
        const session = await this.authService.loginAdmin(dto);
        return {
            success: true,
            message: 'Login berhasil',
            data: session,
        };
    }

    // ==========================================
    // AUTHENTICATED ENDPOINTS
    // ==========================================

    /**
     * PATCH /api/v1/auth/change-password
     * Change password (required on first login for admin-created accounts)
     */
    @UseGuards(JwtAuthGuard)
    @Patch('change-password')
    async changePassword(
        @CurrentUser() user: AuthUser,
        @Body() dto: ChangePasswordDto,
    ) {
        const result = await this.authService.changePassword(user.id, dto);
        return {
            success: true,
            message: result.message,
        };
    }
}
