import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateAttendanceSessionDto, CheckInDto } from './dto';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export interface AttendanceSession {
    id: string;
    creator_id: string;
    title: string;
    description: string | null;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
    qr_token: string;
    valid_until: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface AttendanceRecord {
    id: string;
    session_id: string;
    user_id: string;
    check_in_time: string;
    latitude: number | null;
    longitude: number | null;
    status: string;
    created_at: string;
}

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(private readonly supabaseService: SupabaseService) { }

    /**
     * Create a new attendance session with QR code
     */
    async createSession(
        userId: string,
        dto: CreateAttendanceSessionDto,
    ): Promise<{ session: AttendanceSession; qrCode: string }> {
        const adminClient = this.supabaseService.getAdminClient();

        // Generate unique QR token
        const qrToken = uuidv4();

        // Calculate validity (default 30 minutes)
        const validityMinutes = dto.validityMinutes || 30;
        const validUntil = new Date();
        validUntil.setMinutes(validUntil.getMinutes() + validityMinutes);

        // Create session in database
        const { data: session, error } = await adminClient
            .from('attendance_sessions')
            .insert({
                creator_id: userId,
                title: dto.title,
                description: dto.description,
                location: dto.location,
                latitude: dto.latitude,
                longitude: dto.longitude,
                qr_token: qrToken,
                valid_until: validUntil.toISOString(),
                is_active: true,
            })
            .select()
            .single();

        if (error) {
            this.logger.error(`Failed to create session: ${error.message}`);
            throw new BadRequestException('Failed to create attendance session');
        }

        // Generate QR code as data URL (base64)
        const qrData = JSON.stringify({
            sessionId: session.id,
            token: qrToken,
            validUntil: validUntil.toISOString(),
        });

        const qrCode = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
        });

        this.logger.log(`Created attendance session: ${session.id}`);

        return {
            session: session as AttendanceSession,
            qrCode,
        };
    }

    /**
     * Get QR code for an existing session
     */
    async getSessionQRCode(
        sessionId: string,
        userId: string,
    ): Promise<{ session: AttendanceSession; qrCode: string }> {
        const adminClient = this.supabaseService.getAdminClient();

        const { data: session, error } = await adminClient
            .from('attendance_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('creator_id', userId)
            .single();

        if (error || !session) {
            throw new NotFoundException('Session not found');
        }

        // Check if session is still valid
        if (new Date(session.valid_until) < new Date()) {
            throw new BadRequestException('Session has expired');
        }

        // Generate QR code
        const qrData = JSON.stringify({
            sessionId: session.id,
            token: session.qr_token,
            validUntil: session.valid_until,
        });

        const qrCode = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
        });

        return {
            session: session as AttendanceSession,
            qrCode,
        };
    }

    /**
     * Check in to an attendance session
     */
    async checkIn(
        userId: string,
        dto: CheckInDto,
    ): Promise<AttendanceRecord> {
        const adminClient = this.supabaseService.getAdminClient();

        // Verify session exists and is valid
        const { data: session, error: sessionError } = await adminClient
            .from('attendance_sessions')
            .select('*')
            .eq('id', dto.sessionId)
            .single();

        if (sessionError || !session) {
            throw new NotFoundException('Attendance session not found');
        }

        // Verify QR token
        if (session.qr_token !== dto.qrToken) {
            throw new BadRequestException('Invalid QR code');
        }

        // Check if session is active
        if (!session.is_active) {
            throw new BadRequestException('Session is no longer active');
        }

        // Check if session has expired
        if (new Date(session.valid_until) < new Date()) {
            throw new BadRequestException('Session has expired');
        }

        // Check if user already checked in
        const { data: existingRecord } = await adminClient
            .from('attendance_records')
            .select('id')
            .eq('session_id', dto.sessionId)
            .eq('user_id', userId)
            .single();

        if (existingRecord) {
            throw new BadRequestException('You have already checked in to this session');
        }

        // Create attendance record
        const { data: record, error: recordError } = await adminClient
            .from('attendance_records')
            .insert({
                session_id: dto.sessionId,
                user_id: userId,
                check_in_time: new Date().toISOString(),
                latitude: dto.latitude,
                longitude: dto.longitude,
                status: 'present',
            })
            .select()
            .single();

        if (recordError) {
            this.logger.error(`Failed to check in: ${recordError.message}`);
            throw new BadRequestException('Failed to check in');
        }

        this.logger.log(`User ${userId} checked in to session ${dto.sessionId}`);

        return record as AttendanceRecord;
    }

    /**
     * Get all sessions created by user
     */
    async getMySessions(userId: string): Promise<AttendanceSession[]> {
        const adminClient = this.supabaseService.getAdminClient();

        const { data, error } = await adminClient
            .from('attendance_sessions')
            .select('*')
            .eq('creator_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            this.logger.error(`Failed to get sessions: ${error.message}`);
            throw new BadRequestException('Failed to get sessions');
        }

        return (data as AttendanceSession[]) || [];
    }

    /**
     * Get attendance records for a session
     */
    async getSessionRecords(
        sessionId: string,
        userId: string,
    ): Promise<AttendanceRecord[]> {
        const adminClient = this.supabaseService.getAdminClient();

        // Verify user owns the session
        const { data: session } = await adminClient
            .from('attendance_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('creator_id', userId)
            .single();

        if (!session) {
            throw new NotFoundException('Session not found or access denied');
        }

        const { data, error } = await adminClient
            .from('attendance_records')
            .select(`
        *,
        user_profiles (
          id,
          full_name,
          avatar_url
        )
      `)
            .eq('session_id', sessionId)
            .order('check_in_time', { ascending: true });

        if (error) {
            this.logger.error(`Failed to get records: ${error.message}`);
            throw new BadRequestException('Failed to get attendance records');
        }

        return (data as AttendanceRecord[]) || [];
    }

    /**
     * Get my attendance history
     */
    async getMyAttendance(userId: string): Promise<AttendanceRecord[]> {
        const adminClient = this.supabaseService.getAdminClient();

        const { data, error } = await adminClient
            .from('attendance_records')
            .select(`
        *,
        attendance_sessions (
          id,
          title,
          location,
          created_at
        )
      `)
            .eq('user_id', userId)
            .order('check_in_time', { ascending: false });

        if (error) {
            this.logger.error(`Failed to get attendance: ${error.message}`);
            throw new BadRequestException('Failed to get attendance history');
        }

        return (data as AttendanceRecord[]) || [];
    }

    /**
     * Close an attendance session
     */
    async closeSession(sessionId: string, userId: string): Promise<AttendanceSession> {
        const adminClient = this.supabaseService.getAdminClient();

        const { data, error } = await adminClient
            .from('attendance_sessions')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('creator_id', userId)
            .select()
            .single();

        if (error || !data) {
            throw new NotFoundException('Session not found or access denied');
        }

        this.logger.log(`Session ${sessionId} closed`);

        return data as AttendanceSession;
    }

    /**
     * Regenerate QR code for a session (new token)
     */
    async regenerateQRCode(
        sessionId: string,
        userId: string,
        validityMinutes: number = 30,
    ): Promise<{ session: AttendanceSession; qrCode: string }> {
        const adminClient = this.supabaseService.getAdminClient();

        // Generate new token and validity
        const newToken = uuidv4();
        const validUntil = new Date();
        validUntil.setMinutes(validUntil.getMinutes() + validityMinutes);

        const { data: session, error } = await adminClient
            .from('attendance_sessions')
            .update({
                qr_token: newToken,
                valid_until: validUntil.toISOString(),
                is_active: true,
                updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId)
            .eq('creator_id', userId)
            .select()
            .single();

        if (error || !session) {
            throw new NotFoundException('Session not found or access denied');
        }

        // Generate new QR code
        const qrData = JSON.stringify({
            sessionId: session.id,
            token: newToken,
            validUntil: validUntil.toISOString(),
        });

        const qrCode = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
        });

        this.logger.log(`Regenerated QR for session ${sessionId}`);

        return {
            session: session as AttendanceSession,
            qrCode,
        };
    }
}
