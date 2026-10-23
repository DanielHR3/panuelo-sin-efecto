-- AlterTable
ALTER TABLE "EventoPartido" ADD COLUMN     "eventoAnuladoId" TEXT;

-- AddForeignKey
ALTER TABLE "EventoPartido" ADD CONSTRAINT "EventoPartido_eventoAnuladoId_fkey" FOREIGN KEY ("eventoAnuladoId") REFERENCES "EventoPartido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
