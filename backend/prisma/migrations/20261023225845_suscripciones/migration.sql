-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" TEXT NOT NULL,
    "ligaId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "pruebaHasta" TIMESTAMP(3),
    "pagadoHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_ligaId_key" ON "Suscripcion"("ligaId");

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_ligaId_fkey" FOREIGN KEY ("ligaId") REFERENCES "Liga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Las ligas que ya existían quedan en CORTESIA (sin vencimiento). Las ligas
-- RAPIDA (partidos rápidos de invitados) no llevan suscripción.
INSERT INTO "Suscripcion" ("id", "ligaId", "plan", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'CORTESIA', NOW(), NOW()
FROM "Liga"
WHERE "tipo" = 'LIGA';
