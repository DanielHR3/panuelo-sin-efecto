import { SetMetadata } from '@nestjs/common';
import { Rol } from '../roles';

export const ROLES_KEY = 'roles';

/**
 * Restringe una ruta a los roles indicados. Requiere que `RolesGuard` esté
 * activo (lo está de forma global). Sin este decorador, cualquier usuario
 * autenticado puede acceder.
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
