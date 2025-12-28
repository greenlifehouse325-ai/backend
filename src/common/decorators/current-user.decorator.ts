import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../interfaces';

/**
 * Extract the current authenticated user from the request
 * Use this decorator on controller method parameters to get the user
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthUser) {
 *   return user;
 * }
 *
 * @example
 * // Get specific property
 * @Get('my-email')
 * getMyEmail(@CurrentUser('email') email: string) {
 *   return { email };
 * }
 */
export const CurrentUser = createParamDecorator(
    (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as AuthUser;

        return data ? user?.[data] : user;
    },
);
