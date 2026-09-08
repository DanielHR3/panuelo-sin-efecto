import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca una ruta (o un controlador entero) como accesible sin token JWT.
 * El `JwtAuthGuard` global la deja pasar. Úsalo en endpoints de lectura
 * pública y en `POST /auth/login`.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
