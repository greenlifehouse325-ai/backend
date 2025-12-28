import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, AuthUser } from '../../common/interfaces';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly configService: ConfigService,
        private readonly supabaseService: SupabaseService,
    ) {
        const jwtSecret = configService.get<string>('jwt.secret');
        if (!jwtSecret) {
            throw new Error('JWT_SECRET is not configured');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
        });
    }

    /**
     * Validate JWT payload and return user info
     * This is called after the JWT is verified
     */
    async validate(payload: JwtPayload): Promise<AuthUser> {
        const { sub: userId, email } = payload;

        if (!userId || !email) {
            throw new UnauthorizedException('Invalid token payload');
        }

        // Optionally fetch fresh user data from Supabase
        // This ensures the user still exists and isn't deleted/banned
        const adminClient = this.supabaseService.getAdminClient();
        const { data: userData, error } = await adminClient.auth.admin.getUserById(userId);

        if (error || !userData.user) {
            throw new UnauthorizedException('User not found or session expired');
        }

        const user = userData.user;

        // Return AuthUser object that will be attached to request
        const authUser: AuthUser = {
            id: user.id,
            email: user.email || email,
            emailConfirmedAt: user.email_confirmed_at
                ? new Date(user.email_confirmed_at)
                : undefined,
            phone: user.phone || undefined,
            fullName: user.user_metadata?.full_name,
            avatarUrl: user.user_metadata?.avatar_url,
            provider: user.app_metadata?.provider,
            createdAt: new Date(user.created_at),
            updatedAt: new Date(user.updated_at || user.created_at),
        };

        return authUser;
    }
}
