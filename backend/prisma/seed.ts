import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed (Poblando BD)...');

  const superAdmin = await prisma.usuario.upsert({
    where: { email: 'danielhrubio3@gmail.com' },
    update: {},
    create: {
      nombre: 'Daniel Hernandez Rubio',
      email: 'danielhrubio3@gmail.com',
      passwordHash: 'hash_seguro_provisional',
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
