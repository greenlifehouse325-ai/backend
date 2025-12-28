import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseService } from '../supabase/supabase.service';
import { SignupDto, LoginDto, OAuthProvider } from './dto';
import { AuthUser, AuthSession, JwtPayload, JwtTokens } from '../common/interfaces';

interface RefreshTokenRecord {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: string;
    revoked: boolean;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
    ) { }

    /**
     * Register a new user with email and password
     */
    async signup(signupDto: SignupDto): Promise<AuthSession> {
        const { email, password, fullName } = signupDto;

        const supabase = this.supabaseService.getClient();

        // Sign up via Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            this.logger.warn(`Signup failed for ${email}: ${error.message}`);

            if (error.message.includes('already registered')) {
                throw new ConflictException('Email already registered');
            }
            throw new BadRequestException(error.message);
        }

        if (!data.user) {
            throw new BadRequestException('Failed to create user');
        }

        // If email confirmation is required, user won't have a session yet
        if (!data.session) {
            // Create profile in database
            await this.createUserProfile(data.user.id, fullName);

            // Generate our own tokens for immediate access
            const tokens = await this.generateTokens(data.user.id, email);
            await this.storeRefreshToken(data.user.id, tokens.refreshToken);

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: Date.now() + tokens.expiresIn * 1000,
                user: this.mapSupabaseUser(data.user),
            };
        }

        // Create profile in database
        await this.createUserProfile(data.user.id, fullName);

        // Store refresh token hash
        await this.storeRefreshToken(data.user.id, data.session.refresh_token);

        return {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at
                ? data.session.expires_at * 1000
                : Date.now() + 3600000,
            user: this.mapSupabaseUser(data.user),
        };
    }

    /**
     * Login with email and password
     */
    async login(loginDto: LoginDto): Promise<AuthSession> {
        const { email, password } = loginDto;

        const supabase = this.supabaseService.getClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            this.logger.warn(`Login failed for ${email}: ${error.message}`);
            throw new UnauthorizedException('Invalid email or password');
        }

        if (!data.session || !data.user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Store refresh token hash for tracking
        await this.storeRefreshToken(data.user.id, data.session.refresh_token);

        return {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at
                ? data.session.expires_at * 1000
                : Date.now() + 3600000,
            user: this.mapSupabaseUser(data.user),
        };
    }

    /**
     * Logout and revoke refresh token
     */
    async logout(userId: string, refreshToken?: string): Promise<void> {
        const supabase = this.supabaseService.getClient();

        // Sign out from Supabase
        await supabase.auth.signOut();

        // Revoke refresh token in our database
        if (refreshToken) {
            await this.revokeRefreshToken(userId, refreshToken);
        } else {
            // Revoke all tokens for user
            await this.revokeAllUserTokens(userId);
        }

        this.logger.log(`User ${userId} logged out`);
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken: string): Promise<AuthSession> {
        const supabase = this.supabaseService.getClient();

        // First, verify the refresh token exists and isn't revoked
        const isValid = await this.validateRefreshToken(refreshToken);
        if (!isValid) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // Refresh session with Supabase
        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
        });

        if (error || !data.session || !data.user) {
            this.logger.warn(`Token refresh failed: ${error?.message}`);
            throw new UnauthorizedException('Failed to refresh token');
        }

        // Revoke old refresh token
        await this.revokeRefreshTokenByHash(refreshToken);

        // Store new refresh token
        await this.storeRefreshToken(data.user.id, data.session.refresh_token);

        return {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at
                ? data.session.expires_at * 1000
                : Date.now() + 3600000,
            user: this.mapSupabaseUser(data.user),
        };
    }

    /**
     * Get OAuth URL for provider login
     */
    async getOAuthUrl(
        provider: OAuthProvider,
        redirectUrl?: string,
    ): Promise<string> {
        const supabase = this.supabaseService.getClient();

        const defaultRedirectUrl = this.configService.get<string>(
            `oauth.${provider}.redirectUrl`,
        );

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: redirectUrl || defaultRedirectUrl,
                skipBrowserRedirect: true,
            },
        });

        if (error || !data.url) {
            this.logger.error(`OAuth URL generation failed: ${error?.message}`);
            throw new BadRequestException(`Failed to initialize ${provider} login`);
        }

        return data.url;
    }

    /**
     * Handle OAuth callback and exchange code for session
     */
    async handleOAuthCallback(
        provider: OAuthProvider,
        code: string,
    ): Promise<AuthSession> {
        const supabase = this.supabaseService.getClient();

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.session || !data.user) {
            this.logger.warn(`OAuth callback failed for ${provider}: ${error?.message}`);
            throw new UnauthorizedException('OAuth authentication failed');
        }

        // Create or update user profile
        await this.upsertUserProfile(
            data.user.id,
            data.user.user_metadata?.full_name,
            data.user.user_metadata?.avatar_url,
        );

        // Store refresh token
        await this.storeRefreshToken(data.user.id, data.session.refresh_token);

        return {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at
                ? data.session.expires_at * 1000
                : Date.now() + 3600000,
            user: this.mapSupabaseUser(data.user),
        };
    }

    /**
     * Get current user from access token
     */
    async getCurrentUser(accessToken: string): Promise<AuthUser> {
        const supabase = this.supabaseService.getClientWithToken(accessToken);

        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            throw new UnauthorizedException('Invalid or expired token');
        }

        return this.mapSupabaseUser(data.user);
    }

    // ==================== Private Helper Methods ====================

    /**
     * Generate JWT tokens
     */
    private async generateTokens(
        userId: string,
        email: string,
    ): Promise<JwtTokens> {
        const payload: JwtPayload = { sub: userId, email };

        // Use default expiration from JwtModule config
        const accessToken = this.jwtService.sign(payload);

        const refreshToken = uuidv4();

        return {
            accessToken,
            refreshToken,
            expiresIn: 900, // 15 minutes in seconds
        };
    }

    /**
     * Store refresh token hash in database
     */
    private async storeRefreshToken(
        userId: string,
        refreshToken: string,
    ): Promise<void> {
        const adminClient = this.supabaseService.getAdminClient();
        const tokenHash = await bcrypt.hash(refreshToken, 10);

        const expirationDays = parseInt(
            this.configService.get<string>('jwt.refreshExpiration')?.replace('d', '') ||
            '7',
        );
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expirationDays);

        await adminClient.from('refresh_tokens').insert({
            user_id: userId,
            token_hash: tokenHash,
            expires_at: expiresAt.toISOString(),
            revoked: false,
        });
    }

    /**
     * Validate refresh token exists and is not revoked
     */
    private async validateRefreshToken(refreshToken: string): Promise<boolean> {
        const adminClient = this.supabaseService.getAdminClient();

        const { data: tokens } = await adminClient
            .from('refresh_tokens')
            .select('*')
            .eq('revoked', false)
            .gt('expires_at', new Date().toISOString());

        if (!tokens || tokens.length === 0) {
            return false;
        }

        // Check if any token matches the hash
        for (const token of tokens as RefreshTokenRecord[]) {
            const isMatch = await bcrypt.compare(refreshToken, token.token_hash);
            if (isMatch) {
                return true;
            }
        }

        return false;
    }

    /**
     * Revoke a specific refresh token
     */
    private async revokeRefreshToken(
        userId: string,
        refreshToken: string,
    ): Promise<void> {
        const adminClient = this.supabaseService.getAdminClient();

        const { data: tokens } = await adminClient
            .from('refresh_tokens')
            .select('*')
            .eq('user_id', userId)
            .eq('revoked', false);

        if (!tokens) return;

        for (const token of tokens as RefreshTokenRecord[]) {
            const isMatch = await bcrypt.compare(refreshToken, token.token_hash);
            if (isMatch) {
                await adminClient
                    .from('refresh_tokens')
                    .update({ revoked: true })
                    .eq('id', token.id);
                break;
            }
        }
    }

    /**
     * Revoke refresh token by hash
     */
    private async revokeRefreshTokenByHash(refreshToken: string): Promise<void> {
        const adminClient = this.supabaseService.getAdminClient();

        const { data: tokens } = await adminClient
            .from('refresh_tokens')
            .select('*')
            .eq('revoked', false);

        if (!tokens) return;

        for (const token of tokens as RefreshTokenRecord[]) {
            const isMatch = await bcrypt.compare(refreshToken, token.token_hash);
            if (isMatch) {
                await adminClient
                    .from('refresh_tokens')
                    .update({ revoked: true })
                    .eq('id', token.id);
                break;
            }
        }
    }

    /**
     * Revoke all refresh tokens for a user
     */
    private async revokeAllUserTokens(userId: string): Promise<void> {
        const adminClient = this.supabaseService.getAdminClient();

        await adminClient
            .from('refresh_tokens')
            .update({ revoked: true })
            .eq('user_id', userId);
    }

    /**
     * Create user profile in database
     */
    private async createUserProfile(
        userId: string,
        fullName?: string,
    ): Promise<void> {
        const adminClient = this.supabaseService.getAdminClient();

        await adminClient.from('user_profiles').insert({
            id: userId,
            full_name: fullName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    }

    /**
     * Create or update user profile
     */
    private async upsertUserProfile(
        userId: string,
        fullName?: string,
        avatarUrl?: string,
    ): Promise<void> {
        const adminClient = this.supabaseService.getAdminClient();

        await adminClient.from('user_profiles').upsert({
            id: userId,
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
        });
    }

    /**
     * Map Supabase user to AuthUser
     */
    private mapSupabaseUser(user: {
        id: string;
        email?: string;
        email_confirmed_at?: string;
        phone?: string;
        user_metadata?: Record<string, unknown>;
        app_metadata?: Record<string, unknown>;
        created_at: string;
        updated_at?: string;
    }): AuthUser {
        return {
            id: user.id,
            email: user.email || '',
            emailConfirmedAt: user.email_confirmed_at
                ? new Date(user.email_confirmed_at)
                : undefined,
            phone: user.phone,
            fullName: user.user_metadata?.full_name as string | undefined,
            avatarUrl: user.user_metadata?.avatar_url as string | undefined,
            provider: user.app_metadata?.provider as string | undefined,
            createdAt: new Date(user.created_at),
            updatedAt: new Date(user.updated_at || user.created_at),
        };
    }
}
