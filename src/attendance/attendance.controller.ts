import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceSessionDto, CheckInDto } from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser, Public } from '../common/decorators';
import type { AuthUser } from '../common/interfaces';

@Controller('v1/attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    /**
     * POST /api/v1/attendance/sessions
     * Create a new attendance session with QR code
     */
    @Post('sessions')
    @HttpCode(HttpStatus.CREATED)
    async createSession(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateAttendanceSessionDto,
    ) {
        const result = await this.attendanceService.createSession(user.id, dto);
        return {
            success: true,
            message: 'Attendance session created',
            data: result,
        };
    }

    /**
     * GET /api/v1/attendance/sessions
     * Get all my created sessions
     */
    @Get('sessions')
    async getMySessions(@CurrentUser() user: AuthUser) {
        const sessions = await this.attendanceService.getMySessions(user.id);
        return {
            success: true,
            data: { sessions },
        };
    }

    /**
     * GET /api/v1/attendance/sessions/:id/qr
     * Get QR code for a session
     */
    @Get('sessions/:id/qr')
    async getSessionQRCode(
        @CurrentUser() user: AuthUser,
        @Param('id') sessionId: string,
    ) {
        const result = await this.attendanceService.getSessionQRCode(sessionId, user.id);
        return {
            success: true,
            data: result,
        };
    }

    /**
     * GET /api/v1/attendance/sessions/:id/records
     * Get attendance records for a session
     */
    @Get('sessions/:id/records')
    async getSessionRecords(
        @CurrentUser() user: AuthUser,
        @Param('id') sessionId: string,
    ) {
        const records = await this.attendanceService.getSessionRecords(sessionId, user.id);
        return {
            success: true,
            data: { records },
        };
    }

    /**
     * PATCH /api/v1/attendance/sessions/:id/close
     * Close an attendance session
     */
    @Patch('sessions/:id/close')
    async closeSession(
        @CurrentUser() user: AuthUser,
        @Param('id') sessionId: string,
    ) {
        const session = await this.attendanceService.closeSession(sessionId, user.id);
        return {
            success: true,
            message: 'Session closed',
            data: { session },
        };
    }

    /**
     * POST /api/v1/attendance/sessions/:id/regenerate
     * Regenerate QR code for a session
     */
    @Post('sessions/:id/regenerate')
    async regenerateQRCode(
        @CurrentUser() user: AuthUser,
        @Param('id') sessionId: string,
        @Query('validityMinutes') validityMinutes?: string,
    ) {
        const result = await this.attendanceService.regenerateQRCode(
            sessionId,
            user.id,
            validityMinutes ? parseInt(validityMinutes) : 30,
        );
        return {
            success: true,
            message: 'QR code regenerated',
            data: result,
        };
    }

    /**
     * POST /api/v1/attendance/check-in
     * Check in to an attendance session
     */
    @Post('check-in')
    @HttpCode(HttpStatus.OK)
    async checkIn(
        @CurrentUser() user: AuthUser,
        @Body() dto: CheckInDto,
    ) {
        const record = await this.attendanceService.checkIn(user.id, dto);
        return {
            success: true,
            message: 'Successfully checked in',
            data: { record },
        };
    }

    /**
     * GET /api/v1/attendance/my-attendance
     * Get my attendance history
     */
    @Get('my-attendance')
    async getMyAttendance(@CurrentUser() user: AuthUser) {
        const records = await this.attendanceService.getMyAttendance(user.id);
        return {
            success: true,
            data: { records },
        };
    }

    /**
     * GET /api/v1/attendance/test-qr
     * Generate a test QR code (public endpoint for testing)
     */
    @Public()
    @Get('test-qr')
    async generateTestQR() {
        const QRCode = await import('qrcode');

        const testData = {
            sessionId: 'test-session-' + Date.now(),
            token: 'test-token-' + Math.random().toString(36).substring(7),
            validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
            message: 'This is a test QR code for attendance',
        };

        const qrCode = await QRCode.toDataURL(JSON.stringify(testData), {
            width: 300,
            margin: 2,
            color: {
                dark: '#1a1a2e',
                light: '#ffffff',
            },
        });

        return {
            success: true,
            message: 'Test QR code generated',
            data: {
                qrCode,
                testData,
                note: 'This is a test QR. To create real sessions, use POST /api/v1/attendance/sessions with authentication.',
            },
        };
    }
}
