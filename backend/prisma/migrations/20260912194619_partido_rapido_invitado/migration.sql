-- AlterTable
ALTER TABLE "Liga" ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'LIGA';

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "esInvitado" BOOLEAN NOT NULL DEFAULT false;
