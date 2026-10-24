-- CreateTable
CREATE TABLE "Bitacora" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "usuarioEmail" TEXT,
    "rol" TEXT,
    "metodo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "params" JSONB,
    "detalle" JSONB,
    "estado" INTEGER NOT NULL,

    CONSTRAINT "Bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PruebaUsada" (
    "email" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PruebaUsada_pkey" PRIMARY KEY ("email")
);

-- CreateIndex
CREATE INDEX "Bitacora_fecha_idx" ON "Bitacora"("fecha");

-- CreateIndex
CREATE INDEX "Bitacora_usuarioEmail_fecha_idx" ON "Bitacora"("usuarioEmail", "fecha");
