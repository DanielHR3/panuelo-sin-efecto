import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Payload del JWT que el `JwtAuthGuard` adjunta a `request.user`. */
export interface AuthUser {
  sub: string;
  email: string;
  rol: string;
}

/**
 * Inyecta el usuario autenticado (o una de sus propiedades) en un handler.
 *
 *   create(@CurrentUser() user: AuthUser) { ... }
 *   create(@CurrentUser('sub') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);
