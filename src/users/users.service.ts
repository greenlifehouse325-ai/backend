import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateUserDto } from './dto';
import { AuthUser } from '../common/interfaces';

export interface UserProfile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    bio: string | null;
    date_of_birth: string | null;
    location: string | null;
    website: string | null;
    created_at: string;
    updated_at: string;
}

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(private readonly supabaseService: SupabaseService) { }

    /**
     * Get user profile by ID
     */
    async getProfile(userId: string): Promise<UserProfile> {
        const adminClient = this.supabaseService.getAdminClient();

        const { data, error } = await adminClient
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            this.logger.warn(`Profile not found for user: ${userId}`);
            throw new NotFoundException('User profile not found');
        }

        return data as UserProfile;
    }

    /**
     * Update user profile
     */
    async updateProfile(
        userId: string,
        updateUserDto: UpdateUserDto,
    ): Promise<UserProfile> {
        const adminClient = this.supabaseService.getAdminClient();

        // Map DTO to database columns
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (updateUserDto.fullName !== undefined) {
            updateData.full_name = updateUserDto.fullName;
        }
        if (updateUserDto.avatarUrl !== undefined) {
            updateData.avatar_url = updateUserDto.avatarUrl;
        }
        if (updateUserDto.phone !== undefined) {
            updateData.phone = updateUserDto.phone;
        }
        if (updateUserDto.bio !== undefined) {
            updateData.bio = updateUserDto.bio;
        }
        if (updateUserDto.dateOfBirth !== undefined) {
            updateData.date_of_birth = updateUserDto.dateOfBirth;
        }
        if (updateUserDto.location !== undefined) {
            updateData.location = updateUserDto.location;
        }
        if (updateUserDto.website !== undefined) {
            updateData.website = updateUserDto.website;
        }

        const { data, error } = await adminClient
            .from('user_profiles')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            this.logger.error(`Failed to update profile: ${error.message}`);
            throw new NotFoundException('Failed to update profile');
        }

        // Also update Supabase Auth user metadata
        await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: {
                full_name: updateUserDto.fullName,
                avatar_url: updateUserDto.avatarUrl,
            },
        });

        return data as UserProfile;
    }

    /**
     * Delete user account
     */
    async deleteAccount(userId: string): Promise<void> {
        const adminClient = this.supabaseService.getAdminClient();

        // Delete user from Supabase Auth (will cascade to profile via FK)
        const { error } = await adminClient.auth.admin.deleteUser(userId);

        if (error) {
            this.logger.error(`Failed to delete user: ${error.message}`);
            throw new NotFoundException('Failed to delete account');
        }

        this.logger.log(`User account deleted: ${userId}`);
    }

    /**
     * Get all users (admin only - for future use)
     */
    async getAllUsers(
        page: number = 1,
        limit: number = 10,
    ): Promise<{ users: UserProfile[]; total: number }> {
        const adminClient = this.supabaseService.getAdminClient();
        const offset = (page - 1) * limit;

        const { data, error, count } = await adminClient
            .from('user_profiles')
            .select('*', { count: 'exact' })
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (error) {
            this.logger.error(`Failed to get users: ${error.message}`);
            throw new NotFoundException('Failed to get users');
        }

        return {
            users: (data as UserProfile[]) || [],
            total: count || 0,
        };
    }

    /**
     * Map UserProfile to AuthUser
     */
    mapProfileToAuthUser(profile: UserProfile, email: string): AuthUser {
        return {
            id: profile.id,
            email,
            fullName: profile.full_name || undefined,
            avatarUrl: profile.avatar_url || undefined,
            phone: profile.phone || undefined,
            createdAt: new Date(profile.created_at),
            updatedAt: new Date(profile.updated_at),
        };
    }
}
