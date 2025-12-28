import { UserRole } from '../enums';

export interface JwtPayload {
    sub: string; // User ID
    email: string;
    role?: UserRole;
    iat?: number; // Issued at
    exp?: number; // Expiration
}

/**
 * User returned from Supabase auth
 * Used for backward compatibility with existing auth flow
 */
export interface AuthUser {
    id: string;
    email: string;
    role?: UserRole;
    emailConfirmedAt?: Date;
    phone?: string;
    fullName?: string;
    avatarUrl?: string;
    provider?: string;
    createdAt?: Date;
    updatedAt?: Date;
    userMetadata?: Record<string, unknown>;
}

