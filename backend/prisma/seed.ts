// Carga .env igual que main.ts, para que `npx prisma db seed` lea
// SEED_SUPERADMIN_PASSWORD y DATABASE_URL sin exportarlas a mano.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/hashing';

const prisma = new PrismaClient();

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

  console.log(
    `✅ Super Administrador creado: ${superAdmin.nombre} (${superAdmin.email}) - Rol: ${superAdmin.rol}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
