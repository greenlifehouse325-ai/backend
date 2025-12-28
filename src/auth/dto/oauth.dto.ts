import { IsString, IsIn, IsOptional } from 'class-validator';

export type OAuthProvider = 'google' | 'facebook';

export class OAuthDto {
    @IsString()
    @IsIn(['google', 'facebook'], {
        message: 'Provider must be google or facebook',
    })
    provider: OAuthProvider;

    @IsOptional()
    @IsString()
    redirectUrl?: string;
}

export class OAuthCallbackDto {
    @IsString()
    @IsIn(['google', 'facebook'])
    provider: OAuthProvider;

    @IsString()
    code: string;
}
