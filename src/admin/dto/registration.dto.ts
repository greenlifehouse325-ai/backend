import {
    IsString,
    IsOptional,
    IsUUID,
} from 'class-validator';

/**
 * DTO for approving a registration request
 */
export class ApproveRegistrationDto {
    @IsOptional()
    @IsString()
    notes?: string;
}

/**
 * DTO for rejecting a registration request
 */
export class RejectRegistrationDto {
    @IsString()
    reason: string;
}
