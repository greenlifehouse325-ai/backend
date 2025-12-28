import { IsOptional, IsString, MaxLength, IsUrl, IsDateString } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    fullName?: string;

    @IsOptional()
    @IsUrl({}, { message: 'Invalid avatar URL format' })
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    bio?: string;

    @IsOptional()
    @IsDateString({}, { message: 'Invalid date format' })
    dateOfBirth?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    location?: string;

    @IsOptional()
    @IsUrl({}, { message: 'Invalid website URL format' })
    website?: string;
}
