import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca una ruta (o un controlador entero) como accesible sin token JWT.
 * El `JwtAuthGuard` global la deja pasar. Reservado al sitio público
 * (`/publico/*`, que solo devuelve columnas públicas), `POST /rapido/partidos`,
 * `POST /auth/login` y el health check. Las lecturas CRUD (ligas, categorías,
 * equipos, jugadores, partidos, eventos) NO son públicas: exponen datos
 * privados y se acotan por propiedad en `OwnershipService`.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
