import {
    IsEmail,
    IsString,
    IsNotEmpty,
    MinLength,
    Matches,
    IsEnum,
    IsOptional,
    Length,
} from 'class-validator';

export enum ParentRelationshipDto {
    AYAH = 'ayah',
    IBU = 'ibu',
    WALI = 'wali',
}

/**
 * DTO for parent self-registration
 * Parent can register directly and set their own password
 */
export class SignupParentDto {
    @IsEmail({}, { message: 'Email tidak valid' })
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password minimal 8 karakter' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        {
            message:
                'Password harus mengandung huruf besar, huruf kecil, angka, dan karakter spesial',
        },
    )
    password: string;

    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsEnum(ParentRelationshipDto, {
        message: 'Hubungan harus ayah, ibu, atau wali',
    })
    relationship: ParentRelationshipDto;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    @Length(10, 10, { message: 'NISN harus 10 digit' })
    @Matches(/^[0-9]+$/, { message: 'NISN hanya boleh berisi angka' })
    childNisn?: string;
}
