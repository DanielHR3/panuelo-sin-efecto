-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Partido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fechaHora" DATETIME NOT NULL,
    "dificultad" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "marcadorLocal" INTEGER NOT NULL DEFAULT 0,
    "marcadorVisitante" INTEGER NOT NULL DEFAULT 0,
    "categoriaId" TEXT NOT NULL,
    "equipoLocalId" TEXT NOT NULL,
    "equipoVisitanteId" TEXT NOT NULL,
    "mvpJugadorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Partido_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Partido_equipoLocalId_fkey" FOREIGN KEY ("equipoLocalId") REFERENCES "Equipo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Partido_equipoVisitanteId_fkey" FOREIGN KEY ("equipoVisitanteId") REFERENCES "Equipo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Partido_mvpJugadorId_fkey" FOREIGN KEY ("mvpJugadorId") REFERENCES "Jugador" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Partido" ("categoriaId", "createdAt", "dificultad", "equipoLocalId", "equipoVisitanteId", "estado", "fechaHora", "id", "marcadorLocal", "marcadorVisitante", "updatedAt") SELECT "categoriaId", "createdAt", "dificultad", "equipoLocalId", "equipoVisitanteId", "estado", "fechaHora", "id", "marcadorLocal", "marcadorVisitante", "updatedAt" FROM "Partido";
DROP TABLE "Partido";
ALTER TABLE "new_Partido" RENAME TO "Partido";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
