import { hashPassword } from './hashing';

const EMAIL_POR_DEFECTO = 'danielhrubio3@gmail.com';
const NOMBRE_POR_DEFECTO = 'Daniel Hernandez Rubio';

/** Subconjunto de PrismaClient que necesita el bootstrap (facilita el test). */
export interface PrismaUsuarios {
  usuario: {
    upsert: (args: {
      where: { email: string };
      update: Record<string, never>;
      create: {
        nombre: string;
        email: string;
        passwordHash: string;
        rol: string;
      };
    }) => Promise<{ id: string; email: string; nombre: string; rol: string }>;
  };
}

export interface EnvSuperadmin {
  SEED_SUPERADMIN_PASSWORD?: string;
  SEED_SUPERADMIN_EMAIL?: string;
  SEED_SUPERADMIN_NOMBRE?: string;
}

/**
 * Garantiza que exista el SUPERADMIN inicial. Se ejecuta al arrancar la API
 * (main.ts) y desde `prisma db seed`, así en producción no hace falta una
 * shell: basta con definir SEED_SUPERADMIN_PASSWORD en el entorno. Es
 * idempotente: si el usuario ya existe no se toca (ni la contraseña), y sin
 * contraseña configurada no hace nada.
 */
export async function asegurarSuperadmin(
  prisma: PrismaUsuarios,
  env: EnvSuperadmin,
): Promise<{ email: string; nombre: string; rol: string } | null> {
  const password = env.SEED_SUPERADMIN_PASSWORD;
  if (!password) return null;

  const email = env.SEED_SUPERADMIN_EMAIL?.trim() || EMAIL_POR_DEFECTO;
  const nombre = env.SEED_SUPERADMIN_NOMBRE?.trim() || NOMBRE_POR_DEFECTO;

  return prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nombre,
      email,
      passwordHash: hashPassword(password),
      rol: 'SUPERADMIN',
    },
  });
}
