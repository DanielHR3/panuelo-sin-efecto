// Carga .env igual que main.ts, para que `npx prisma db seed` lea
// SEED_SUPERADMIN_PASSWORD y DATABASE_URL sin exportarlas a mano.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { asegurarSuperadmin } from '../src/common/superadmin-bootstrap';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed (Poblando BD)...');

  // Misma lógica que corre la API al arrancar (src/common/superadmin-bootstrap.ts).
  const superAdmin = await asegurarSuperadmin(prisma, process.env);
  if (!superAdmin) {
    throw new Error(
      'SEED_SUPERADMIN_PASSWORD no está definida. Define esta variable de entorno antes de correr el seed (no uses contraseñas hardcodeadas).',
    );
  }

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
