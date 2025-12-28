import {
    Controller,
    Get,
    Patch,
    Delete,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import type { AuthUser } from '../common/interfaces';

@Controller('v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    /**
     * GET /api/v1/users/profile
     * Get current user's profile
     */
    @Get('profile')
    async getProfile(@CurrentUser() user: AuthUser) {
        const profile = await this.usersService.getProfile(user.id);
        return {
            success: true,
            data: { profile },
        };
    }

    /**
     * PATCH /api/v1/users/profile
     * Update current user's profile
     */
    @Patch('profile')
    async updateProfile(
        @CurrentUser() user: AuthUser,
        @Body() updateUserDto: UpdateUserDto,
    ) {
        const profile = await this.usersService.updateProfile(user.id, updateUserDto);
        return {
            success: true,
            message: 'Profile updated successfully',
            data: { profile },
        };
    }

    /**
     * DELETE /api/v1/users/account
     * Delete current user's account
     */
    @Delete('account')
    @HttpCode(HttpStatus.OK)
    async deleteAccount(@CurrentUser() user: AuthUser) {
        await this.usersService.deleteAccount(user.id);
        return {
            success: true,
            message: 'Account deleted successfully',
        };
    }
}
