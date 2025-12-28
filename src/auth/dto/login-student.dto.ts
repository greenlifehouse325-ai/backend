import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

/**
 * DTO for student login using NISN
 */
export class LoginStudentDto {
    @IsString()
    @IsNotEmpty()
    @Length(10, 10, { message: 'NISN harus 10 digit' })
    @Matches(/^[0-9]+$/, { message: 'NISN hanya boleh berisi angka' })
    nisn: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
