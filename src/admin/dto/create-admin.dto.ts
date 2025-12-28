import {
    IsEmail,
    IsString,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
} from 'class-validator';

/**
 * DTO for creating a new admin user
 * Only super admin can create new admins
 */
export class CreateAdminDto {
    @IsEmail({}, { message: 'Email tidak valid' })
    email: string;

    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsBoolean()
    isSuperAdmin?: boolean;
}
