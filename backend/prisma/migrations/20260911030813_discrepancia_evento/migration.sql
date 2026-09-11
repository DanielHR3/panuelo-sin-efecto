-- CreateTable
CREATE TABLE "DiscrepanciaEvento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partidoId" TEXT NOT NULL,
    "eventoAId" TEXT NOT NULL,
    "eventoBId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "eventoDescartadoId" TEXT,
    "resueltoPorId" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscrepanciaEvento_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DiscrepanciaEvento_eventoAId_fkey" FOREIGN KEY ("eventoAId") REFERENCES "EventoPartido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DiscrepanciaEvento_eventoBId_fkey" FOREIGN KEY ("eventoBId") REFERENCES "EventoPartido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DiscrepanciaEvento_eventoDescartadoId_fkey" FOREIGN KEY ("eventoDescartadoId") REFERENCES "EventoPartido" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DiscrepanciaEvento_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventoPartido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoEvento" TEXT NOT NULL,
    "clientEventId" TEXT,
    "descartado" BOOLEAN NOT NULL DEFAULT false,
    "partidoId" TEXT NOT NULL,
    "equipoId" TEXT,
    "jugadorId" TEXT,
    "arbitroId" TEXT NOT NULL,
    CONSTRAINT "EventoPartido_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventoPartido_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventoPartido_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventoPartido_arbitroId_fkey" FOREIGN KEY ("arbitroId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EventoPartido" ("arbitroId", "clientEventId", "equipoId", "id", "jugadorId", "partidoId", "timestamp", "tipoEvento") SELECT "arbitroId", "clientEventId", "equipoId", "id", "jugadorId", "partidoId", "timestamp", "tipoEvento" FROM "EventoPartido";
DROP TABLE "EventoPartido";
ALTER TABLE "new_EventoPartido" RENAME TO "EventoPartido";
CREATE INDEX "EventoPartido_partidoId_timestamp_idx" ON "EventoPartido"("partidoId", "timestamp");
CREATE UNIQUE INDEX "EventoPartido_partidoId_clientEventId_key" ON "EventoPartido"("partidoId", "clientEventId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DiscrepanciaEvento_partidoId_estado_idx" ON "DiscrepanciaEvento"("partidoId", "estado");
