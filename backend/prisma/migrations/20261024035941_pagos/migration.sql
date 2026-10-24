-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "ligaId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "montoCentavos" INTEGER NOT NULL,
    "referencia" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "motivoRechazo" TEXT,
    "comprobante" BYTEA,
    "comprobanteTipo" TEXT,
    "comprobanteNombre" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "resueltoPorId" TEXT,
    "resueltoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pago_referencia_key" ON "Pago"("referencia");

-- CreateIndex
CREATE INDEX "Pago_estado_createdAt_idx" ON "Pago"("estado", "createdAt");

-- CreateIndex
CREATE INDEX "Pago_ligaId_createdAt_idx" ON "Pago"("ligaId", "createdAt");

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_ligaId_fkey" FOREIGN KEY ("ligaId") REFERENCES "Liga"("id") ON DELETE CASCADE ON UPDATE CASCADE;
