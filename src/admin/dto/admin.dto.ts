import { IsString, IsOptional, IsUUID, IsNotEmpty, IsEnum, IsArray } from 'class-validator';
import { UserRole } from '../../common/enums';

/**
 * DTO for sending broadcast notification to ALL users
 */
export class BroadcastNotificationDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    message: string;
}

/**
 * DTO for role-based broadcast notification
 * Can target specific roles: students, teachers, parents, or multiple
 */
export class RoleBroadcastNotificationDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    message: string;

    /**
     * Target roles to receive this notification
     * Example: ['student'] for exam notification
     * Example: ['parent'] for report card pickup
     * Example: ['student', 'teacher'] for holiday notice
     */
    @IsArray()
    @IsEnum(UserRole, { each: true })
    targetRoles: UserRole[];
}

/**
 * DTO for sending targeted notification
 */
export class SendNotificationDto {
    @IsUUID()
    recipientId: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    message: string;
}

/**
 * DTO for creating a student by admin (bypasses registration request)
 */
export class AdminCreateStudentDto {
    @IsString()
    @IsNotEmpty()
    nisn: string;

    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsString()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    kelas: string;

    @IsString()
    @IsNotEmpty()
    jurusan: string;

    @IsString()
    @IsNotEmpty()
    tahunAjaran: string;

    @IsOptional()
    @IsString()
    waliKelas?: string;

    @IsOptional()
    @IsString()
    address?: string;
}

/**
 * DTO for creating a teacher by admin
 */
export class AdminCreateTeacherDto {
    @IsString()
    @IsNotEmpty()
    nip: string;

    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsString()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    subject: string;

    @IsOptional()
    @IsString()
    address?: string;
}
