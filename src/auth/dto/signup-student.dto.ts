import {
    IsEmail,
    IsString,
    IsNotEmpty,
    Length,
    Matches,
    IsOptional,
    IsDateString,
} from 'class-validator';

/**
 * DTO for student registration request
 * Student registers with these details, then waits for admin approval
 */
export class SignupStudentDto {
    @IsString()
    @IsNotEmpty()
    @Length(10, 10, { message: 'NISN harus 10 digit' })
    @Matches(/^[0-9]+$/, { message: 'NISN hanya boleh berisi angka' })
    nisn: string;

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
    kelas: string;

    @IsString()
    @IsNotEmpty()
    jurusan: string;

    @IsString()
    @IsNotEmpty()
    tahunAjaran: string;

    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @IsOptional()
    @IsString()
    address?: string;
}
