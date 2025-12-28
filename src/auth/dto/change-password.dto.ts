import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

/**
 * DTO for changing password (required on first login for admin-created accounts)
 */
export class ChangePasswordDto {
    @IsString()
    @IsNotEmpty()
    currentPassword: string;

    @IsString()
    @MinLength(8, { message: 'Password minimal 8 karakter' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        {
            message:
                'Password harus mengandung huruf besar, huruf kecil, angka, dan karakter spesial',
        },
    )
    newPassword: string;

    @IsString()
    @IsNotEmpty()
    confirmPassword: string;
}
