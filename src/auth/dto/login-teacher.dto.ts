import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for teacher login using NIP or Email
 */
export class LoginTeacherDto {
    @IsString()
    @IsNotEmpty({ message: 'NIP atau Email harus diisi' })
    nipOrEmail: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
