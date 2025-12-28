import {
    IsEmail,
    IsString,
    IsNotEmpty,
    IsOptional,
} from 'class-validator';

/**
 * DTO for teacher registration request
 * Teacher registers with these details, then waits for admin approval
 */
export class SignupTeacherDto {
    @IsString()
    @IsNotEmpty()
    nip: string;

    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsEmail({}, { message: 'Email tidak valid' })
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
