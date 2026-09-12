import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/roles';

/**
 * Guard global: si el handler (o su controlador) declara `@Roles(...)`, exige
 * que `request.user.rol` esté entre ellos. Sin `@Roles(...)` no restringe nada
 * (basta con estar autenticado, cosa que ya garantiza `JwtAuthGuard`).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const rol = request.user?.rol;
    if (!rol || !requiredRoles.includes(rol as Rol)) {
      throw new ForbiddenException(
        `Requiere uno de los roles: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
