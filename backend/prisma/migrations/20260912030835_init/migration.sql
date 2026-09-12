-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Liga" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "propietarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Liga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ligaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "colorPrimario" TEXT,
    "categoriaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jugador" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "numeroJersey" TEXT NOT NULL,
    "equipoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jugador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partido" (
    "id" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "dificultad" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "marcadorLocal" INTEGER NOT NULL DEFAULT 0,
    "marcadorVisitante" INTEGER NOT NULL DEFAULT 0,
    "categoriaId" TEXT NOT NULL,
    "equipoLocalId" TEXT NOT NULL,
    "equipoVisitanteId" TEXT NOT NULL,
    "mvpJugadorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionArbitral" (
    "partidoId" TEXT NOT NULL,
    "arbitroId" TEXT NOT NULL,
    "rolEnCampo" TEXT NOT NULL,

    CONSTRAINT "AsignacionArbitral_pkey" PRIMARY KEY ("partidoId","arbitroId")
);

-- CreateTable
CREATE TABLE "EventoPartido" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoEvento" TEXT NOT NULL,
    "clientEventId" TEXT,
    "descartado" BOOLEAN NOT NULL DEFAULT false,
    "partidoId" TEXT NOT NULL,
    "equipoId" TEXT,
    "jugadorId" TEXT,
    "arbitroId" TEXT NOT NULL,

    CONSTRAINT "EventoPartido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscrepanciaEvento" (
    "id" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "eventoAId" TEXT NOT NULL,
    "eventoBId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "eventoDescartadoId" TEXT,
    "resueltoPorId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscrepanciaEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "EventoPartido_partidoId_timestamp_idx" ON "EventoPartido"("partidoId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "EventoPartido_partidoId_clientEventId_key" ON "EventoPartido"("partidoId", "clientEventId");

-- CreateIndex
CREATE INDEX "DiscrepanciaEvento_partidoId_estado_idx" ON "DiscrepanciaEvento"("partidoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "DiscrepanciaEvento_eventoAId_eventoBId_key" ON "DiscrepanciaEvento"("eventoAId", "eventoBId");

-- AddForeignKey
ALTER TABLE "Liga" ADD CONSTRAINT "Liga_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_ligaId_fkey" FOREIGN KEY ("ligaId") REFERENCES "Liga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipo" ADD CONSTRAINT "Equipo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jugador" ADD CONSTRAINT "Jugador_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_equipoLocalId_fkey" FOREIGN KEY ("equipoLocalId") REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_equipoVisitanteId_fkey" FOREIGN KEY ("equipoVisitanteId") REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_mvpJugadorId_fkey" FOREIGN KEY ("mvpJugadorId") REFERENCES "Jugador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionArbitral" ADD CONSTRAINT "AsignacionArbitral_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionArbitral" ADD CONSTRAINT "AsignacionArbitral_arbitroId_fkey" FOREIGN KEY ("arbitroId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoPartido" ADD CONSTRAINT "EventoPartido_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoPartido" ADD CONSTRAINT "EventoPartido_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoPartido" ADD CONSTRAINT "EventoPartido_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoPartido" ADD CONSTRAINT "EventoPartido_arbitroId_fkey" FOREIGN KEY ("arbitroId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscrepanciaEvento" ADD CONSTRAINT "DiscrepanciaEvento_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscrepanciaEvento" ADD CONSTRAINT "DiscrepanciaEvento_eventoAId_fkey" FOREIGN KEY ("eventoAId") REFERENCES "EventoPartido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscrepanciaEvento" ADD CONSTRAINT "DiscrepanciaEvento_eventoBId_fkey" FOREIGN KEY ("eventoBId") REFERENCES "EventoPartido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscrepanciaEvento" ADD CONSTRAINT "DiscrepanciaEvento_eventoDescartadoId_fkey" FOREIGN KEY ("eventoDescartadoId") REFERENCES "EventoPartido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscrepanciaEvento" ADD CONSTRAINT "DiscrepanciaEvento_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
