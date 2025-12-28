import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for admin login using email
 */
export class LoginAdminDto {
    @IsEmail({}, { message: 'Email tidak valid' })
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
