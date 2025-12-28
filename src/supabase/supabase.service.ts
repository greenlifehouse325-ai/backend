import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
    private readonly logger = new Logger(SupabaseService.name);
    private client: SupabaseClient;
    private adminClient: SupabaseClient;

    constructor(private readonly configService: ConfigService) { }

    onModuleInit() {
        const supabaseUrl = this.configService.get<string>('supabase.url');
        const supabaseAnonKey = this.configService.get<string>('supabase.anonKey');
        const supabaseServiceRoleKey = this.configService.get<string>(
            'supabase.serviceRoleKey',
        );

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
            throw new Error('Supabase configuration is missing');
        }

        // Public client - for user-facing operations
        this.client = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: false,
                detectSessionInUrl: false,
            },
        });

        // Admin client - for server-side operations with elevated privileges
        this.adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        this.logger.log('Supabase clients initialized successfully');
    }

    /**
     * Get the public Supabase client (uses anon key)
     * Use for user authentication flows
     */
    getClient(): SupabaseClient {
        return this.client;
    }

    /**
     * Get the admin Supabase client (uses service role key)
     * Use for server-side operations that bypass RLS
     * ⚠️ Use with caution - has full database access
     */
    getAdminClient(): SupabaseClient {
        return this.adminClient;
    }

    /**
     * Get client with user's access token for RLS-protected queries
     */
    getClientWithToken(accessToken: string): SupabaseClient {
        const supabaseUrl = this.configService.get<string>('supabase.url');
        const supabaseAnonKey = this.configService.get<string>('supabase.anonKey');

        return createClient(supabaseUrl!, supabaseAnonKey!, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
}
