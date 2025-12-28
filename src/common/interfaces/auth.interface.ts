import { UserRole, UserStatus } from '../enums';

// Re-export from jwt-payload for convenience
export type { AuthUser, JwtPayload } from './jwt-payload.interface';
import type { AuthUser } from './jwt-payload.interface';

/**
 * JWT tokens response
 */
export interface JwtTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

/**
 * Base user data (from users table)
 */
export interface BaseUser {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    emailVerified: boolean;
    oauthProvider?: string;
    mustChangePassword: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Student profile
 */
export interface StudentProfile {
    id: string;
    userId: string;
    nisn: string;
    fullName: string;
    kelas: string;
    jurusan: string;
    waliKelas?: string;
    tahunAjaran: string;
    dateOfBirth?: Date;
    phone?: string;
    address?: string;
    avatarUrl?: string;
    isVerified: boolean;
    verifiedAt?: Date;
}

/**
 * Teacher profile
 */
export interface TeacherProfile {
    id: string;
    userId: string;
    nip: string;
    fullName: string;
    subject: string;
    phone?: string;
    address?: string;
    avatarUrl?: string;
    isVerified: boolean;
    verifiedAt?: Date;
}

/**
 * Parent profile
 */
export interface ParentProfile {
    id: string;
    userId: string;
    studentId?: string;
    fullName: string;
    phone?: string;
    address?: string;
    relationship: string;
    linkStatus: string;
    linkRequestedAt?: Date;
    linkApprovedAt?: Date;
}

/**
 * Admin profile
 */
export interface AdminProfile {
    id: string;
    userId: string;
    fullName: string;
    phone?: string;
    isSuperAdmin: boolean;
    permissions: Record<string, unknown>;
}

/**
 * Authenticated user with profile
 */
export interface AuthenticatedUser extends BaseUser {
    profile?: StudentProfile | TeacherProfile | ParentProfile | AdminProfile;
}

/**
 * Auth session response
 * user can be either the simple AuthUser (for backward compat) or full AuthenticatedUser
 */
export interface AuthSession {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    user: AuthUser | AuthenticatedUser;
}

/**
 * Registration request
 */
export interface RegistrationRequest {
    id: string;
    userId: string;
    type: string;
    formData: Record<string, unknown>;
    status: string;
    rejectionReason?: string;
    reviewedBy?: string;
    submittedAt: Date;
    reviewedAt?: Date;
}

/**
 * Notification
 */
export interface Notification {
    id: string;
    senderId?: string;
    recipientId?: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    isRead: boolean;
    sentAt: Date;
    readAt?: Date;
}
