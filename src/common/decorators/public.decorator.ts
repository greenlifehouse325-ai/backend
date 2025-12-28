import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public (no authentication required)
 * Use this decorator on controller methods that should be accessible without JWT
 *
 * @example
 * @Public()
 * @Get('health')
 * checkHealth() {
 *   return { status: 'ok' };
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
