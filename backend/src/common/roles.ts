/**
 * Roles del sistema. Se guardan como `String` en la columna `Usuario.rol`
 * (SQLite) y se validan con `class-validator`; no es un enum de Prisma para
 * evitar una migración por cada ajuste durante el desarrollo temprano.
 */
export const ROLES = ['SUPERADMIN', 'LIGA_ADMIN', 'ARBITRO'] as const;

export type Rol = (typeof ROLES)[number];
