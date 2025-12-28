import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for parent login using email
 */
export class LoginParentDto {
    @IsEmail({}, { message: 'Email tidak valid' })
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
