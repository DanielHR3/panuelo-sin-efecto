import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

/**
 * Hashes a password with scrypt (Node's built-in KDF) using a random salt.
 * Format: "<salt-hex>:<derivedKey-hex>" so it can be verified later without
 * an extra dependency. Swap for a dedicated library (bcrypt/argon2) once the
 * usuarios/auth module is implemented.
 */
function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

async function main() {
  console.log('Iniciando seed (Poblando BD)...');

  const seedPassword = process.env.SEED_SUPERADMIN_PASSWORD;
  if (!seedPassword) {
    throw new Error(
      'SEED_SUPERADMIN_PASSWORD no está definida. Define esta variable de entorno antes de correr el seed (no uses contraseñas hardcodeadas).',
    );
  }

  const superAdmin = await prisma.usuario.upsert({
    where: { email: 'danielhrubio3@gmail.com' },
    update: {},
    create: {
      nombre: 'Daniel Hernandez Rubio',
      email: 'danielhrubio3@gmail.com',
      passwordHash: hashPassword(seedPassword),
      rol: 'SUPERADMIN',
    },
  });

  console.log(`✅ Super Administrador creado: ${superAdmin.nombre} (${superAdmin.email}) - Rol: ${superAdmin.rol}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
