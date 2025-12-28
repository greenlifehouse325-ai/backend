/**
 * User roles in the system
 */
export enum UserRole {
    STUDENT = 'student',
    TEACHER = 'teacher',
    PARENT = 'parent',
    ADMIN = 'admin',
    SUPER_ADMIN = 'super_admin',
    OAUTH_USER = 'oauth_user',
}

/**
 * User account status
 */
export enum UserStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    REJECTED = 'rejected',
}

/**
 * Parent relationship to student
 */
export enum ParentRelationship {
    AYAH = 'ayah',
    IBU = 'ibu',
    WALI = 'wali',
}

/**
 * Registration request type
 */
export enum RegistrationType {
    STUDENT = 'student',
    TEACHER = 'teacher',
}

/**
 * Registration request status
 */
export enum RegistrationStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    NEEDS_INFO = 'needs_info',
}

/**
 * Parent-student link status
 */
export enum LinkStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

/**
 * Notification type
 */
export enum NotificationType {
    BROADCAST = 'broadcast',
    TARGETED = 'targeted',
    SYSTEM = 'system',
    PARENT_LINK = 'parent_link',
}

/**
 * OAuth providers
 */
export enum OAuthProvider {
    GOOGLE = 'google',
    FACEBOOK = 'facebook',
}
