import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MultiRoleAuthController } from './multi-role-auth.controller';
import { MultiRoleAuthService } from './multi-role-auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const expiresIn = configService.get<string>('jwt.expiration') || '15m';
                return {
                    secret: configService.get<string>('jwt.secret'),
                    signOptions: {
                        expiresIn: expiresIn as unknown as number,
                    },
                };
            },
        }),
    ],
    controllers: [AuthController, MultiRoleAuthController],
    providers: [AuthService, MultiRoleAuthService, JwtStrategy],
    exports: [AuthService, MultiRoleAuthService, JwtModule, PassportModule],
})
export class AuthModule { }
