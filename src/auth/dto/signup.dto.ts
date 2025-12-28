import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    Matches,
    IsOptional,
} from 'class-validator';

export class SignupDto {
    @IsEmail({}, { message: 'Invalid email format' })
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @MaxLength(72, { message: 'Password must be at most 72 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message:
            'Password must contain at least one uppercase, lowercase, number, and special character',
    })
    password: string;

    @IsOptional()
    @IsString()
    @MaxLength(100, { message: 'Full name must be at most 100 characters' })
    fullName?: string;
}
