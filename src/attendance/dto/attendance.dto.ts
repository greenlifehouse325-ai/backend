import {
    IsString,
    IsOptional,
    IsDateString,
    IsNumber,
    Min,
    Max,
    IsUUID,
} from 'class-validator';

export class CreateAttendanceSessionDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(1440) // Max 24 hours in minutes
    validityMinutes?: number;
}

export class CheckInDto {
    @IsUUID()
    sessionId: string;

    @IsString()
    qrToken: string;

    @IsOptional()
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @IsNumber()
    longitude?: number;
}
