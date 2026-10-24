-- CreateTable
CREATE TABLE "ReglamentoLiga" (
    "id" TEXT NOT NULL,
    "ligaId" TEXT NOT NULL,
    "archivo" BYTEA NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReglamentoLiga_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReglamentoLiga_ligaId_key" ON "ReglamentoLiga"("ligaId");

-- AddForeignKey
ALTER TABLE "ReglamentoLiga" ADD CONSTRAINT "ReglamentoLiga_ligaId_fkey" FOREIGN KEY ("ligaId") REFERENCES "Liga"("id") ON DELETE CASCADE ON UPDATE CASCADE;
