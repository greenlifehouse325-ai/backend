import {
    Controller,
    Post,
    Get,
    Body,
    Query,
    Res,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto, RefreshTokenDto, OAuthDto, OAuthCallbackDto } from './dto';
import { JwtAuthGuard } from '../common/guards';
import { Public, CurrentUser } from '../common/decorators';
import type { AuthUser } from '../common/interfaces';

@Controller('v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /**
     * POST /api/v1/auth/signup
     * Register a new user with email and password
     */
    @Public()
    @Post('signup')
    @HttpCode(HttpStatus.CREATED)
    async signup(@Body() signupDto: SignupDto) {
        const session = await this.authService.signup(signupDto);
        return {
            success: true,
            message: 'Account created successfully',
            data: session,
        };
    }

    /**
     * POST /api/v1/auth/login
     * Login with email and password
     */
    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        const session = await this.authService.login(loginDto);
        return {
            success: true,
            message: 'Login successful',
            data: session,
        };
    }

    /**
     * POST /api/v1/auth/logout
     * Logout and revoke refresh token
     */
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(
        @CurrentUser() user: AuthUser,
        @Body('refreshToken') refreshToken?: string,
    ) {
        await this.authService.logout(user.id, refreshToken);
        return {
            success: true,
            message: 'Logged out successfully',
        };
    }

    /**
     * POST /api/v1/auth/refresh
     * Refresh access token using refresh token
     */
    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
        const session = await this.authService.refreshAccessToken(
            refreshTokenDto.refreshToken,
        );
        return {
            success: true,
            message: 'Token refreshed successfully',
            data: session,
        };
    }

    /**
     * GET /api/v1/auth/me
     * Get current authenticated user
     */
    @Get('me')
    @UseGuards(JwtAuthGuard)
    async me(@CurrentUser() user: AuthUser) {
        return {
            success: true,
            data: { user },
        };
    }

    /**
     * GET /api/v1/auth/oauth/:provider
     * Get OAuth URL for provider (Google, Facebook)
     */
    @Public()
    @Get('oauth')
    async getOAuthUrl(
        @Query() oauthDto: OAuthDto,
        @Res() res: Response,
    ) {
        const url = await this.authService.getOAuthUrl(
            oauthDto.provider,
            oauthDto.redirectUrl,
        );

        // Redirect to OAuth provider
        return res.redirect(url);
    }

    /**
     * POST /api/v1/auth/oauth/callback
     * Handle OAuth callback and exchange code for tokens
     */
    @Public()
    @Post('oauth/callback')
    @HttpCode(HttpStatus.OK)
    async handleOAuthCallback(@Body() callbackDto: OAuthCallbackDto) {
        const session = await this.authService.handleOAuthCallback(
            callbackDto.provider,
            callbackDto.code,
        );
        return {
            success: true,
            message: `${callbackDto.provider} login successful`,
            data: session,
        };
    }

    /**
     * GET /api/v1/auth/oauth/google/callback
     * Handle Google OAuth redirect callback
     */
    @Public()
    @Get('oauth/google/callback')
    async handleGoogleCallback(
        @Query('code') code: string,
        @Res() res: Response,
    ) {
        try {
            const session = await this.authService.handleOAuthCallback('google', code);

            // Redirect to frontend with tokens
            const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
            const params = new URLSearchParams({
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
            });

            return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
        } catch {
            const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/auth/error?message=OAuth failed`);
        }
    }

    /**
     * GET /api/v1/auth/oauth/facebook/callback
     * Handle Facebook OAuth redirect callback
     */
    @Public()
    @Get('oauth/facebook/callback')
    async handleFacebookCallback(
        @Query('code') code: string,
        @Res() res: Response,
    ) {
        try {
            const session = await this.authService.handleOAuthCallback('facebook', code);

            // Redirect to frontend with tokens
            const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
            const params = new URLSearchParams({
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
            });

            return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
        } catch {
            const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/auth/error?message=OAuth failed`);
        }
    }
}
