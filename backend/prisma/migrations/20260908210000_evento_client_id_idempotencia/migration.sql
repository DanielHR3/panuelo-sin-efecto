-- AlterTable: id de evento generado por el cliente (cola offline idempotente)
ALTER TABLE "EventoPartido" ADD COLUMN "clientEventId" TEXT;

-- CreateIndex: (partidoId, clientEventId) único -> reenviar el mismo evento no lo duplica
CREATE UNIQUE INDEX "EventoPartido_partidoId_clientEventId_key" ON "EventoPartido"("partidoId", "clientEventId");

-- CreateIndex: lectura de la bitácora de un partido en orden
CREATE INDEX "EventoPartido_partidoId_timestamp_idx" ON "EventoPartido"("partidoId", "timestamp");
