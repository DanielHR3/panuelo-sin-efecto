-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "ligaArbitroId" TEXT;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_ligaArbitroId_fkey" FOREIGN KEY ("ligaArbitroId") REFERENCES "Liga"("id") ON DELETE SET NULL ON UPDATE CASCADE;
