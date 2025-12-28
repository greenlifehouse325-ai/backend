import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ParentLinkModule } from './parent-link/parent-link.module';
import { ProfileModule } from './profile/profile.module';
import { JwtAuthGuard } from './common/guards';
import { HttpExceptionFilter } from './common/filters';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule,

    // Supabase integration
    SupabaseModule,

    // Authentication (includes multi-role auth)
    AuthModule,

    // User management
    UsersModule,

    // Admin dashboard & management
    AdminModule,

    // Notifications
    NotificationsModule,

    // Parent-Student linking
    ParentLinkModule,

    // Profile & security (sessions, activity log)
    ProfileModule,

    // Attendance with QR Code
    AttendanceModule,

    // Rate limiting untuk mencegah brute-force attacks
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 detik
        limit: 3, // Max 3 requests per detik
      },
      {
        name: 'medium',
        ttl: 10000, // 10 detik
        limit: 20, // Max 20 requests per 10 detik
      },
      {
        name: 'long',
        ttl: 60000, // 1 menit
        limit: 100, // Max 100 requests per menit
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT auth guard (use @Public() to skip)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule { }

