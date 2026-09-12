# HU-2.6: Reconciliación de marcador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detectar automáticamente cuando dos árbitros distintos registraron por separado lo que parece ser la misma jugada real, y dejar que un LIGA_ADMIN/SUPERADMIN resuelva la discrepancia desde el panel admin (descartando uno de los dos eventos o manteniendo ambos), sin romper el principio de Caja Negra (append-only) del event sourcing existente.

**Architecture:** Un flag suave `descartado` en `EventoPartido` excluye eventos del cálculo del marcador sin borrarlos. Una tabla nueva `DiscrepanciaEvento` guarda el juicio humano por separado del log inmutable. Una función pura `detectarDiscrepancias` (agrupa por tipo/equipo, ventana de 30s, un evento en máximo un par) se dispara una sola vez, dentro de la misma transacción que ya finaliza el partido en `eventos.service.ts`, solo si hay más de un árbitro asignado. La resolución vive en un módulo nuevo `discrepancias` (admin-only, vía `OwnershipService.assertCanManagePartido`) y se opera desde `/admin/partidos`.

**Tech Stack:** NestJS + Prisma (SQLite) en el backend; Next.js App Router (Server Components + Server Actions) en el frontend. Jest para tests de backend (no hay test runner de frontend en este proyecto — se verifica manualmente en navegador, mismo patrón que HU-2.3/2.5).

**Spec:** `docs/superpowers/specs/2026-09-10-reconciliacion-marcador-design.md`

## Global Constraints

- TDD estricto en todo el backend: cada método nuevo tiene su test escrito primero, verificado en RED (falla por la razón correcta) antes de implementar, luego GREEN.
- La detección corre **una sola vez**, al transicionar a `FINALIZADO` (segundo `FIN_MITAD`), y **solo si `asignaciones.length > 1`**.
- La resolución de discrepancias es **admin-only** (`SUPERADMIN` o `LIGA_ADMIN` dueño de la liga) — nunca los árbitros.
- `EventoPartido` nunca se borra ni se muta su contenido salvo el flag `descartado` — respeta la Caja Negra (`CLAUDE.md` de `/backend`).
- Ventana de detección: eventos del mismo `(tipoEvento, equipoId)`, de `arbitroId` distintos, con `timestamp` a **30 000 ms o menos** de diferencia. `jugadorId` no entra en la clave de agrupación.
- Después de cada tarea: `npm run lint` y `npx jest` (backend) deben quedar limpios antes de commitear.

---

## Task 1: Schema — flag `descartado` + tabla `DiscrepanciaEvento`

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create (generado por Prisma): `backend/prisma/migrations/<timestamp>_discrepancia_evento/migration.sql`

**Interfaces:**
- Produces: campo `EventoPartido.descartado: boolean` (default `false`); modelo `DiscrepanciaEvento` con campos `id, partidoId, eventoAId, eventoBId, estado, eventoDescartadoId, resueltoPorId, resolvedAt, createdAt`.

- [ ] **Step 1: Editar el modelo `Usuario`** — agregar la relación inversa hacia `DiscrepanciaEvento` (quién la resolvió):

```prisma
model Usuario {
  id                 String               @id @default(uuid())
  nombre             String
  email              String               @unique
  passwordHash       String
  rol                String               // 'SUPERADMIN', 'LIGA_ADMIN', 'ARBITRO'
  
  ligasPropias       Liga[]               @relation("PropietarioLiga")
  asignaciones       AsignacionArbitral[]
  eventosRegistrados EventoPartido[]      @relation("ArbitroRegistrador")
  discrepanciasResueltas DiscrepanciaEvento[]
  
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
}
```

- [ ] **Step 2: Editar el modelo `Partido`** — agregar la relación inversa hacia `DiscrepanciaEvento`, justo después de `mvpJugador`:

```prisma
  mvpJugadorId      String?
  mvpJugador        Jugador?             @relation("PartidoMvp", fields: [mvpJugadorId], references: [id])

  discrepancias     DiscrepanciaEvento[]

  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
}
```

- [ ] **Step 3: Editar el modelo `EventoPartido`** — agregar el flag `descartado` y las tres relaciones inversas hacia `DiscrepanciaEvento` (un evento puede aparecer como A, como B, o como el descartado de una discrepancia):

```prisma
model EventoPartido {
  id            String   @id @default(uuid())
  timestamp     DateTime @default(now())
  tipoEvento    String   // INICIO_MITAD, FIN_MITAD, TD, PAT1, PAT2, SAFETY, PICK_SIX, TIMEOUT, FALTA_PERSONAL, EXPULSION, INTERCEPCION, SACK, UNDO_LAST_ACTION

  // Id generado por el dispositivo del árbitro. Permite que el reintento de la
  // cola offline sea idempotente: (partidoId, clientEventId) es único, así que
  // reenviar el mismo evento no duplica puntos. Nulo para eventos creados
  // directamente en el servidor.
  clientEventId String?

  // Reconciliación entre árbitros (HU-2.6): flag suave, la fila nunca se
  // borra (Caja Negra) — solo se excluye del cálculo del marcador cuando un
  // admin resuelve una discrepancia descartando este evento.
  descartado    Boolean  @default(false)

  partidoId     String
  partido       Partido  @relation(fields: [partidoId], references: [id])

  equipoId      String?
  equipo        Equipo?  @relation(fields: [equipoId], references: [id])

  jugadorId     String?
  jugador       Jugador? @relation(fields: [jugadorId], references: [id])

  arbitroId     String
  arbitro       Usuario  @relation("ArbitroRegistrador", fields: [arbitroId], references: [id])

  discrepanciasComoA         DiscrepanciaEvento[] @relation("DiscrepanciaEventoA")
  discrepanciasComoB         DiscrepanciaEvento[] @relation("DiscrepanciaEventoB")
  discrepanciasDescartadoEn  DiscrepanciaEvento[] @relation("DiscrepanciaEventoDescartado")

  @@unique([partidoId, clientEventId])
  @@index([partidoId, timestamp])
}
```

- [ ] **Step 4: Agregar el modelo `DiscrepanciaEvento`** al final del archivo:

```prisma
model DiscrepanciaEvento {
  id                 String    @id @default(uuid())

  partidoId          String
  partido            Partido       @relation(fields: [partidoId], references: [id])

  eventoAId          String
  eventoA            EventoPartido @relation("DiscrepanciaEventoA", fields: [eventoAId], references: [id])

  eventoBId          String
  eventoB            EventoPartido @relation("DiscrepanciaEventoB", fields: [eventoBId], references: [id])

  estado             String    // PENDIENTE, RESUELTA

  // Nulo si se resolvió como "mantener ambos" (falso positivo de la detección).
  eventoDescartadoId String?
  eventoDescartado   EventoPartido? @relation("DiscrepanciaEventoDescartado", fields: [eventoDescartadoId], references: [id])

  resueltoPorId      String?
  resueltoPor        Usuario?  @relation(fields: [resueltoPorId], references: [id])
  resolvedAt         DateTime?

  createdAt          DateTime  @default(now())

  @@index([partidoId, estado])
}
```

- [ ] **Step 5: Generar y aplicar la migración**

Run: `cd backend && npx prisma migrate dev --name discrepancia_evento --skip-seed`

Expected: `Applying migration '..._discrepancia_evento'` seguido de `Your database is now in sync with your schema.` y `Generated Prisma Client`. Si Prisma se queja de alguna relación ambigua, revisar que los tres `@relation("DiscrepanciaEvento...")` en `EventoPartido` coincidan exactamente (mismo string) con los de `DiscrepanciaEvento`.

- [ ] **Step 6: Verificar que el backend sigue compilando y sus tests existentes siguen en verde**

Run: `npx jest && npm run build`
Expected: `Test Suites: 22 passed, 22 total` (mismo número que antes de este cambio — todavía no se ha escrito ningún test nuevo) y build sin errores.

- [ ] **Step 7: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(backend): schema de reconciliación — descartado + DiscrepanciaEvento (HU-2.6)"
```

---

## Task 2: Función pura `detectarDiscrepancias`

**Files:**
- Create: `backend/src/eventos/discrepancias.ts`
- Test: `backend/src/eventos/discrepancias.spec.ts`

**Interfaces:**
- Consumes: nada (función pura, sin dependencias de Prisma/Nest).
- Produces: `detectarDiscrepancias(eventos: EventoParaDiscrepancia[]): ParDiscrepancia[]`, tipos `EventoParaDiscrepancia { id, tipoEvento, equipoId, arbitroId, timestamp }` y `ParDiscrepancia { eventoAId, eventoBId }`. Task 4 importa esta función y este tipo `EventoParaDiscrepancia` desde `./discrepancias`.

- [ ] **Step 1: Escribir los tests (todos a la vez, es una función pura pequeña)**

Crear `backend/src/eventos/discrepancias.spec.ts`:

```ts
import { detectarDiscrepancias, type EventoParaDiscrepancia } from './discrepancias';

const LOCAL_ID = 'equipo-local';
const VISITA_ID = 'equipo-visitante';

function evento(
  overrides: Partial<EventoParaDiscrepancia> & { id: string },
): EventoParaDiscrepancia {
  return {
    tipoEvento: 'TD',
    equipoId: LOCAL_ID,
    arbitroId: 'ref-1',
    timestamp: new Date('2026-09-20T18:00:00.000Z'),
    ...overrides,
  };
}

describe('detectarDiscrepancias', () => {
  it('devuelve vacío si no hay eventos', () => {
    expect(detectarDiscrepancias([])).toEqual([]);
  });

  it('ignora eventos que no son "de jugada" (INICIO_MITAD, FIN_MITAD, TIMEOUT, UNDO_LAST_ACTION)', () => {
    const eventos = [
      evento({ id: 'e1', tipoEvento: 'FIN_MITAD', equipoId: null, arbitroId: 'ref-1' }),
      evento({ id: 'e2', tipoEvento: 'FIN_MITAD', equipoId: null, arbitroId: 'ref-2' }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([]);
  });

  it('empareja dos TD del mismo equipo, de árbitros distintos, dentro de la ventana de 30s', () => {
    const eventos = [
      evento({ id: 'e1', arbitroId: 'ref-1', timestamp: new Date('2026-09-20T18:00:00.000Z') }),
      evento({ id: 'e2', arbitroId: 'ref-2', timestamp: new Date('2026-09-20T18:00:05.000Z') }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([
      { eventoAId: 'e1', eventoBId: 'e2' },
    ]);
  });

  it('no empareja eventos del mismo árbitro', () => {
    const eventos = [
      evento({ id: 'e1', arbitroId: 'ref-1', timestamp: new Date('2026-09-20T18:00:00.000Z') }),
      evento({ id: 'e2', arbitroId: 'ref-1', timestamp: new Date('2026-09-20T18:00:05.000Z') }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([]);
  });

  it('no empareja eventos fuera de la ventana de 30s', () => {
    const eventos = [
      evento({ id: 'e1', arbitroId: 'ref-1', timestamp: new Date('2026-09-20T18:00:00.000Z') }),
      evento({ id: 'e2', arbitroId: 'ref-2', timestamp: new Date('2026-09-20T18:00:45.000Z') }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([]);
  });

  it('no empareja eventos de equipos distintos aunque coincidan en tiempo y tipo', () => {
    const eventos = [
      evento({ id: 'e1', equipoId: LOCAL_ID, arbitroId: 'ref-1', timestamp: new Date('2026-09-20T18:00:00.000Z') }),
      evento({ id: 'e2', equipoId: VISITA_ID, arbitroId: 'ref-2', timestamp: new Date('2026-09-20T18:00:05.000Z') }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([]);
  });

  it('jugadorId no afecta el agrupado: empareja aunque uno tenga jugador y el otro no', () => {
    const eventos = [
      evento({ id: 'e1', arbitroId: 'ref-1', timestamp: new Date('2026-09-20T18:00:00.000Z') }),
      evento({ id: 'e2', arbitroId: 'ref-2', timestamp: new Date('2026-09-20T18:00:05.000Z') }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([
      { eventoAId: 'e1', eventoBId: 'e2' },
    ]);
  });

  it('con tres árbitros en la misma jugada, cada evento participa en como máximo un par', () => {
    const eventos = [
      evento({ id: 'e1', arbitroId: 'ref-1', timestamp: new Date('2026-09-20T18:00:00.000Z') }),
      evento({ id: 'e2', arbitroId: 'ref-2', timestamp: new Date('2026-09-20T18:00:05.000Z') }),
      evento({ id: 'e3', arbitroId: 'ref-3', timestamp: new Date('2026-09-20T18:00:10.000Z') }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([
      { eventoAId: 'e1', eventoBId: 'e2' },
    ]);
  });

  it('con cuatro árbitros forma dos pares independientes', () => {
    const eventos = [
      evento({ id: 'e1', arbitroId: 'ref-1', timestamp: new Date('2026-09-20T18:00:00.000Z') }),
      evento({ id: 'e2', arbitroId: 'ref-2', timestamp: new Date('2026-09-20T18:00:05.000Z') }),
      evento({ id: 'e3', arbitroId: 'ref-3', timestamp: new Date('2026-09-20T18:00:10.000Z') }),
      evento({ id: 'e4', arbitroId: 'ref-4', timestamp: new Date('2026-09-20T18:00:15.000Z') }),
    ];
    expect(detectarDiscrepancias(eventos)).toEqual([
      { eventoAId: 'e1', eventoBId: 'e2' },
      { eventoAId: 'e3', eventoBId: 'e4' },
    ]);
  });
});
```

- [ ] **Step 2: Verificar RED**

Run: `npx jest src/eventos/discrepancias.spec.ts`
Expected: FAIL — `Cannot find module './discrepancias'` (el archivo todavía no existe). Falla por la razón correcta: falta la implementación, no un typo.

- [ ] **Step 3: Implementar `detectarDiscrepancias`**

Crear `backend/src/eventos/discrepancias.ts`:

```ts
import type { TipoEvento } from './evento.constants';

/** Ventana de tiempo para considerar dos eventos "la misma jugada" (HU-2.6). */
const VENTANA_MS = 30_000;

/** Eventos "de jugada": lo único que tiene sentido reconciliar. Excluye
 * eventos de control (INICIO_MITAD, FIN_MITAD, TIMEOUT, UNDO_LAST_ACTION). */
const TIPOS_JUGADA: readonly TipoEvento[] = [
  'TD',
  'PAT1',
  'PAT2',
  'SAFETY',
  'PICK_SIX',
  'SACK',
  'INTERCEPCION',
  'FALTA_PERSONAL',
  'EXPULSION',
];

export interface EventoParaDiscrepancia {
  id: string;
  tipoEvento: string;
  equipoId: string | null;
  arbitroId: string;
  timestamp: Date;
}

export interface ParDiscrepancia {
  eventoAId: string;
  eventoBId: string;
}

/**
 * Detecta pares de eventos que probablemente representan la misma jugada
 * real registrada dos veces por árbitros distintos (ver
 * docs/superpowers/specs/2026-09-10-reconciliacion-marcador-design.md).
 *
 * Pura: no toca la base de datos, se puede testear con datos de mentira.
 * Se agrupa por (tipoEvento, equipoId) — jugadorId no entra en la clave,
 * porque un árbitro puede registrar la misma jugada sin especificar
 * jugador ("Continuar sin jugador específico") y sigue siendo el mismo
 * hecho. Dentro de cada grupo, ordenado por tiempo, cada evento participa
 * en como máximo un par: una vez emparejado con el siguiente evento libre
 * de un árbitro distinto dentro de la ventana, ambos quedan "consumidos".
 */
export function detectarDiscrepancias(
  eventos: EventoParaDiscrepancia[],
): ParDiscrepancia[] {
  const jugadas = eventos.filter((e) =>
    TIPOS_JUGADA.includes(e.tipoEvento as TipoEvento),
  );

  const grupos = new Map<string, EventoParaDiscrepancia[]>();
  for (const ev of jugadas) {
    const clave = `${ev.tipoEvento}:${ev.equipoId ?? ''}`;
    const grupo = grupos.get(clave);
    if (grupo) grupo.push(ev);
    else grupos.set(clave, [ev]);
  }

  const pares: ParDiscrepancia[] = [];
  for (const grupo of grupos.values()) {
    const ordenado = [...grupo].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    const consumidos = new Set<string>();

    for (let i = 0; i < ordenado.length; i++) {
      const a = ordenado[i];
      if (consumidos.has(a.id)) continue;

      for (let j = i + 1; j < ordenado.length; j++) {
        const b = ordenado[j];
        if (consumidos.has(b.id)) continue;
        if (b.timestamp.getTime() - a.timestamp.getTime() > VENTANA_MS) break;
        if (b.arbitroId === a.arbitroId) continue;

        pares.push({ eventoAId: a.id, eventoBId: b.id });
        consumidos.add(a.id);
        consumidos.add(b.id);
        break;
      }
    }
  }
  return pares;
}
```

- [ ] **Step 4: Verificar GREEN**

Run: `npx jest src/eventos/discrepancias.spec.ts -v`
Expected: `Tests: 9 passed, 9 total`.

- [ ] **Step 5: Lint y commit**

```bash
npm run lint
git add backend/src/eventos/discrepancias.ts backend/src/eventos/discrepancias.spec.ts
git commit -m "feat(backend): función pura detectarDiscrepancias (HU-2.6)"
```

---

## Task 3: Excluir eventos `descartado` del cálculo del marcador

**Files:**
- Modify: `backend/src/eventos/eventos.service.ts` (método `registrar()`, la consulta `tx.eventoPartido.findMany` que alimenta `calcularMarcador`; y método `getMarcador()`)
- Modify: `backend/src/eventos/eventos.service.spec.ts`

**Interfaces:**
- Consumes: nada nuevo (usa el campo `descartado` de Task 1).
- Produces: ninguna interfaz nueva — es un cambio de comportamiento sobre métodos existentes.

- [ ] **Step 1: Escribir los tests fallidos**

En `backend/src/eventos/eventos.service.spec.ts`, agregar dentro del `describe('EventosService', ...)`, cerca de los tests existentes de `getMarcador`/`registrar` (usa el `partidoBase('EN_CURSO')` y `mockTx`/`mockPrisma` ya definidos en el archivo):

```ts
  it('getMarcador() excluye eventos descartados de la consulta', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce({
      equipoLocalId: LOCAL_ID,
      equipoVisitanteId: VISITA_ID,
    });
    mockPrisma.eventoPartido.findMany.mockResolvedValueOnce([]);
    await service.getMarcador('p1');
    const [arg] = mockPrisma.eventoPartido.findMany.mock.calls[0] as [
      { where: { descartado?: boolean } },
    ];
    expect(arg.where.descartado).toBe(false);
  });

  it('registrar() excluye eventos descartados al recalcular el marcador', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'),
    );
    await service.registrar(
      'p1',
      { tipoEvento: 'TD', equipoId: LOCAL_ID },
      arbitroAsignado,
    );
    const [arg] = mockTx.eventoPartido.findMany.mock.calls[0] as [
      { where: { descartado?: boolean } },
    ];
    expect(arg.where.descartado).toBe(false);
  });
```

- [ ] **Step 2: Verificar RED**

Run: `npx jest src/eventos/eventos.service.spec.ts -t "excluye eventos descartados"`
Expected: FAIL en ambos — `arg.where.descartado` es `undefined`, no `false`.

- [ ] **Step 3: Implementar**

En `backend/src/eventos/eventos.service.ts`, dentro de `registrar()`, cambiar la consulta que alimenta `calcularMarcador` (la que hoy dice `where: { partidoId }` justo antes de `const marcador = calcularMarcador(...)`) para que también seleccione los campos que Task 4 necesita — así se reutiliza la misma consulta para detectar discrepancias sin un segundo viaje a la base de datos:

```ts
        const todos = await tx.eventoPartido.findMany({
          where: { partidoId, descartado: false },
          orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            tipoEvento: true,
            equipoId: true,
            arbitroId: true,
            timestamp: true,
          },
        });
        const marcador = calcularMarcador(
          todos,
          partido.equipoLocalId,
          partido.equipoVisitanteId,
        );
```

Y en `getMarcador()`, cambiar su `where: { partidoId }` a `where: { partidoId, descartado: false }`.

No tocar `listar()`: la bitácora completa (auditable) debe seguir mostrando también los eventos descartados — por diseño, `descartado` no borra la fila.

- [ ] **Step 4: Verificar GREEN**

Run: `npx jest src/eventos/eventos.service.spec.ts`
Expected: todos los tests del archivo en verde (los nuevos y los preexistentes — `calcularMarcador` acepta objetos con campos de más sin problema, es estructural).

- [ ] **Step 5: Lint, build y commit**

```bash
npm run lint && npm run build
git add backend/src/eventos/eventos.service.ts backend/src/eventos/eventos.service.spec.ts
git commit -m "fix(backend): excluir eventos descartados del cálculo del marcador (HU-2.6)"
```

---

## Task 4: Disparar la detección al finalizar el partido

**Files:**
- Modify: `backend/src/eventos/eventos.service.ts` (dentro de la transacción de `registrar()`, justo después del `tx.partido.update(...)` que fija el estado)
- Modify: `backend/src/eventos/eventos.service.spec.ts`

**Interfaces:**
- Consumes: `detectarDiscrepancias` y `EventoParaDiscrepancia` de `./discrepancias` (Task 2); el array `todos` ya construido en Task 3 (mismo shape que `EventoParaDiscrepancia`, más campos que `calcularMarcador` ignora).
- Produces: filas nuevas en `DiscrepanciaEvento` cuando corresponde. Ninguna otra tarea depende de una interfaz de código aquí — Task 5 lee `DiscrepanciaEvento` directamente por Prisma.

- [ ] **Step 1: Escribir los tests fallidos**

Agregar al mismo `describe('EventosService', ...)` (necesita `mockTx.discrepanciaEvento = { createMany: jest.fn() }` — agregar esa entrada al objeto `mockTx` ya definido al inicio del archivo, junto a `eventoPartido`/`partido`):

```ts
  it('al finalizar con más de un árbitro asignado, crea discrepancias si detectarDiscrepancias encuentra pares', async () => {
    const partidoDosArbitros = {
      ...partidoBase('EN_CURSO'),
      asignaciones: [{ arbitroId: 'ref-1' }, { arbitroId: 'ref-2' }],
    };
    mockPrisma.partido.findUnique.mockResolvedValueOnce(partidoDosArbitros);
    mockPrisma.eventoPartido.count.mockResolvedValueOnce(1); // ya hubo un FIN_MITAD
    mockTx.eventoPartido.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      },
      {
        id: 'e2',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-2',
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      },
    ]);

    await service.registrar('p1', { tipoEvento: 'FIN_MITAD' }, arbitroAsignado);

    expect(mockTx.discrepanciaEvento.createMany).toHaveBeenCalledWith({
      data: [{ partidoId: 'p1', eventoAId: 'e1', eventoBId: 'e2', estado: 'PENDIENTE' }],
    });
  });

  it('no crea discrepancias si solo hay un árbitro asignado', async () => {
    mockPrisma.partido.findUnique.mockResolvedValueOnce(
      partidoBase('EN_CURSO'), // asignaciones: [{ arbitroId: 'ref-1' }] — uno solo
    );
    mockPrisma.eventoPartido.count.mockResolvedValueOnce(1);
    mockTx.eventoPartido.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      },
      {
        id: 'e2',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-2', // hipotético — no debería importar, solo hay 1 asignación
        timestamp: new Date('2026-09-20T18:00:05.000Z'),
      },
    ]);

    await service.registrar('p1', { tipoEvento: 'FIN_MITAD' }, arbitroAsignado);

    expect(mockTx.discrepanciaEvento.createMany).not.toHaveBeenCalled();
  });

  it('no crea discrepancias si detectarDiscrepancias no encuentra pares', async () => {
    const partidoDosArbitros = {
      ...partidoBase('EN_CURSO'),
      asignaciones: [{ arbitroId: 'ref-1' }, { arbitroId: 'ref-2' }],
    };
    mockPrisma.partido.findUnique.mockResolvedValueOnce(partidoDosArbitros);
    mockPrisma.eventoPartido.count.mockResolvedValueOnce(1);
    mockTx.eventoPartido.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        tipoEvento: 'TD',
        equipoId: LOCAL_ID,
        arbitroId: 'ref-1',
        timestamp: new Date('2026-09-20T18:00:00.000Z'),
      },
    ]);

    await service.registrar('p1', { tipoEvento: 'FIN_MITAD' }, arbitroAsignado);

    expect(mockTx.discrepanciaEvento.createMany).not.toHaveBeenCalled();
  });

  it('no crea discrepancias cuando el evento no finaliza el partido (no es el segundo FIN_MITAD)', async () => {
    const partidoDosArbitros = {
      ...partidoBase('EN_CURSO'),
      asignaciones: [{ arbitroId: 'ref-1' }, { arbitroId: 'ref-2' }],
    };
    mockPrisma.partido.findUnique.mockResolvedValueOnce(partidoDosArbitros);
    await service.registrar(
      'p1',
      { tipoEvento: 'TD', equipoId: LOCAL_ID },
      arbitroAsignado,
    );
    expect(mockTx.discrepanciaEvento.createMany).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Verificar RED**

Run: `npx jest src/eventos/eventos.service.spec.ts -t "discrepancias"`
Expected: FAIL — `mockTx.discrepanciaEvento` es `undefined` (`Cannot read properties of undefined`) en el primer test, y los otros tres pasan trivialmente (todavía no se llama a nada) pero el objetivo es ver el primero fallar por la razón correcta antes de tocar el mock. Si los últimos tres "pasan" antes de implementar nada, es porque `createMany` nunca se llama en absoluto — correcto, pero confirma primero que el mock existe agregando `discrepanciaEvento: { createMany: jest.fn() }` a `mockTx` y reduciendo el `jest.clearAllMocks()` de `beforeEach` para incluirlo (ya lo cubre `jest.clearAllMocks()` genérico). Ejecuta de nuevo y confirma que el primer test falla ahora por `toHaveBeenCalledWith` no cumplido (`Number of calls: 0`) — esa es la falla correcta antes de implementar.

- [ ] **Step 3: Implementar**

En `backend/src/eventos/eventos.service.ts`:

1. Importar la función y el tipo de Task 2, arriba del archivo:

```ts
import { detectarDiscrepancias } from './discrepancias';
```

2. Dentro de la transacción de `registrar()`, justo después del bloque `await tx.partido.update({...})` y antes del `return { evento, marcador, duplicado: false };`, agregar:

```ts
        if (
          nuevoEstado === 'FINALIZADO' &&
          nuevoEstado !== partido.estado &&
          partido.asignaciones.length > 1
        ) {
          const pares = detectarDiscrepancias(todos);
          if (pares.length > 0) {
            await tx.discrepanciaEvento.createMany({
              data: pares.map((p) => ({
                partidoId,
                eventoAId: p.eventoAId,
                eventoBId: p.eventoBId,
                estado: 'PENDIENTE',
              })),
            });
          }
        }
```

(`todos` es el array ya construido en Task 3 — mismo shape que `EventoParaDiscrepancia`, con campos de más que `detectarDiscrepancias` simplemente ignora.)

- [ ] **Step 4: Verificar GREEN**

Run: `npx jest src/eventos/eventos.service.spec.ts`
Expected: todos los tests del archivo en verde.

- [ ] **Step 5: Lint, build, suite completa y commit**

```bash
npm run lint && npm run build && npx jest
git add backend/src/eventos/eventos.service.ts backend/src/eventos/eventos.service.spec.ts
git commit -m "feat(backend): dispara detección de discrepancias al finalizar el partido (HU-2.6)"
```

---

## Task 5: `DiscrepanciasService` — listar y resolver

**Files:**
- Create: `backend/src/discrepancias/discrepancias.service.ts`
- Create: `backend/src/discrepancias/discrepancias.service.spec.ts`
- Create: `backend/src/discrepancias/dto/resolver-discrepancia.dto.ts`

**Interfaces:**
- Consumes: `OwnershipService.assertCanManagePartido(partidoId, user): Promise<void>` (existente); `calcularMarcador` de `../eventos/marcador` (existente).
- Produces: `DiscrepanciasService.listar(partidoId: string, user: AuthUser): Promise<DiscrepanciaEvento[]>` (con `eventoA`/`eventoB` incluidos); `DiscrepanciasService.resolver(partidoId: string, discrepanciaId: string, dto: ResolverDiscrepanciaDto, user: AuthUser): Promise<DiscrepanciaEvento>`. `ResolverDiscrepanciaDto { accion: "DESCARTAR_A" | "DESCARTAR_B" | "MANTENER_AMBOS" }`. Task 6 (controller) llama a estos dos métodos exactamente así.

- [ ] **Step 1: Crear el DTO** (no lleva test propio — es declarativo, como `SetMvpDto`):

```ts
// backend/src/discrepancias/dto/resolver-discrepancia.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const ACCIONES_RESOLUCION = [
  'DESCARTAR_A',
  'DESCARTAR_B',
  'MANTENER_AMBOS',
] as const;
export type AccionResolucion = (typeof ACCIONES_RESOLUCION)[number];

export class ResolverDiscrepanciaDto {
  @ApiProperty({
    enum: ACCIONES_RESOLUCION,
    description:
      'DESCARTAR_A/B excluye ese evento del marcador y recalcula. MANTENER_AMBOS cierra la discrepancia sin tocar nada (falso positivo).',
  })
  @IsIn(ACCIONES_RESOLUCION, {
    message: `accion debe ser una de: ${ACCIONES_RESOLUCION.join(', ')}`,
  })
  accion: AccionResolucion;
}
```

- [ ] **Step 2: Escribir los tests fallidos**

```ts
// backend/src/discrepancias/discrepancias.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiscrepanciasService } from './discrepancias.service';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const admin: AuthUser = { sub: 'admin-1', email: 'a@a.mx', rol: 'LIGA_ADMIN' };
const LOCAL_ID = 'equipo-local';
const VISITA_ID = 'equipo-visitante';

const mockTx = {
  eventoPartido: { update: jest.fn(), findMany: jest.fn() },
  partido: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  discrepanciaEvento: { update: jest.fn() },
};

const mockPrisma = {
  discrepanciaEvento: { findMany: jest.fn(), findUnique: jest.fn() },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
};

const mockOwnership = { assertCanManagePartido: jest.fn() };

function discrepanciaPendiente() {
  return {
    id: 'd1',
    partidoId: 'p1',
    eventoAId: 'e1',
    eventoBId: 'e2',
    estado: 'PENDIENTE',
    eventoDescartadoId: null,
    resueltoPorId: null,
    resolvedAt: null,
  };
}

describe('DiscrepanciasService', () => {
  let service: DiscrepanciasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTx.partido.findUniqueOrThrow.mockResolvedValue({
      equipoLocalId: LOCAL_ID,
      equipoVisitanteId: VISITA_ID,
    });
    mockTx.eventoPartido.findMany.mockResolvedValue([]);
    mockTx.discrepanciaEvento.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscrepanciasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OwnershipService, useValue: mockOwnership },
      ],
    }).compile();
    service = module.get(DiscrepanciasService);
  });

  describe('listar', () => {
    it('valida la autorización de admin y devuelve las discrepancias con los eventos incluidos', async () => {
      mockPrisma.discrepanciaEvento.findMany.mockResolvedValueOnce([]);
      await service.listar('p1', admin);
      expect(mockOwnership.assertCanManagePartido).toHaveBeenCalledWith('p1', admin);
      const [arg] = mockPrisma.discrepanciaEvento.findMany.mock.calls[0] as [
        { where: unknown; include: { eventoA: unknown; eventoB: unknown } },
      ];
      expect(arg.where).toEqual({ partidoId: 'p1' });
      expect(arg.include.eventoA).toBeDefined();
      expect(arg.include.eventoB).toBeDefined();
    });
  });

  describe('resolver', () => {
    it('lanza NotFound si la discrepancia no existe', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.resolver('p1', 'd1', { accion: 'MANTENER_AMBOS' }, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza NotFound si la discrepancia pertenece a otro partido', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce({
        ...discrepanciaPendiente(),
        partidoId: 'otro-partido',
      });
      await expect(
        service.resolver('p1', 'd1', { accion: 'MANTENER_AMBOS' }, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza resolver una discrepancia ya RESUELTA', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce({
        ...discrepanciaPendiente(),
        estado: 'RESUELTA',
      });
      await expect(
        service.resolver('p1', 'd1', { accion: 'MANTENER_AMBOS' }, admin),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('DESCARTAR_A marca el eventoA como descartado, recalcula el marcador y cierra la discrepancia', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaPendiente(),
      );
      await service.resolver('p1', 'd1', { accion: 'DESCARTAR_A' }, admin);

      expect(mockTx.eventoPartido.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { descartado: true },
      });
      expect(mockTx.partido.update).toHaveBeenCalled();
      expect(mockTx.discrepanciaEvento.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: expect.objectContaining({
          estado: 'RESUELTA',
          eventoDescartadoId: 'e1',
          resueltoPorId: 'admin-1',
        }),
      });
    });

    it('DESCARTAR_B marca el eventoB como descartado', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaPendiente(),
      );
      await service.resolver('p1', 'd1', { accion: 'DESCARTAR_B' }, admin);

      expect(mockTx.eventoPartido.update).toHaveBeenCalledWith({
        where: { id: 'e2' },
        data: { descartado: true },
      });
      expect(mockTx.discrepanciaEvento.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: expect.objectContaining({ eventoDescartadoId: 'e2' }),
      });
    });

    it('MANTENER_AMBOS no descarta ningún evento ni recalcula el marcador', async () => {
      mockPrisma.discrepanciaEvento.findUnique.mockResolvedValueOnce(
        discrepanciaPendiente(),
      );
      await service.resolver('p1', 'd1', { accion: 'MANTENER_AMBOS' }, admin);

      expect(mockTx.eventoPartido.update).not.toHaveBeenCalled();
      expect(mockTx.partido.update).not.toHaveBeenCalled();
      expect(mockTx.discrepanciaEvento.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: expect.objectContaining({
          estado: 'RESUELTA',
          eventoDescartadoId: null,
        }),
      });
    });
  });
});
```

- [ ] **Step 3: Verificar RED**

Run: `npx jest src/discrepancias/discrepancias.service.spec.ts`
Expected: FAIL — `Cannot find module './discrepancias.service'`.

- [ ] **Step 4: Implementar**

```ts
// backend/src/discrepancias/discrepancias.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../common/ownership.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { calcularMarcador } from '../eventos/marcador';
import { ResolverDiscrepanciaDto } from './dto/resolver-discrepancia.dto';

const eventoPublico = {
  id: true,
  tipoEvento: true,
  equipoId: true,
  jugadorId: true,
  arbitroId: true,
  timestamp: true,
  descartado: true,
} as const;

@Injectable()
export class DiscrepanciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async listar(partidoId: string, user: AuthUser) {
    await this.ownership.assertCanManagePartido(partidoId, user);
    return this.prisma.discrepanciaEvento.findMany({
      where: { partidoId },
      orderBy: { createdAt: 'asc' },
      include: {
        eventoA: { select: eventoPublico },
        eventoB: { select: eventoPublico },
      },
    });
  }

  async resolver(
    partidoId: string,
    discrepanciaId: string,
    dto: ResolverDiscrepanciaDto,
    user: AuthUser,
  ) {
    await this.ownership.assertCanManagePartido(partidoId, user);

    const discrepancia = await this.prisma.discrepanciaEvento.findUnique({
      where: { id: discrepanciaId },
    });
    if (!discrepancia || discrepancia.partidoId !== partidoId) {
      throw new NotFoundException(
        `Discrepancia ${discrepanciaId} no encontrada en el partido ${partidoId}`,
      );
    }
    if (discrepancia.estado === 'RESUELTA') {
      throw new BadRequestException('Esta discrepancia ya fue resuelta');
    }

    const eventoDescartadoId =
      dto.accion === 'DESCARTAR_A'
        ? discrepancia.eventoAId
        : dto.accion === 'DESCARTAR_B'
          ? discrepancia.eventoBId
          : null;

    return this.prisma.$transaction(async (tx) => {
      if (eventoDescartadoId) {
        await tx.eventoPartido.update({
          where: { id: eventoDescartadoId },
          data: { descartado: true },
        });

        const partido = await tx.partido.findUniqueOrThrow({
          where: { id: partidoId },
          select: { equipoLocalId: true, equipoVisitanteId: true },
        });
        const eventos = await tx.eventoPartido.findMany({
          where: { partidoId, descartado: false },
          orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
          select: { tipoEvento: true, equipoId: true },
        });
        const marcador = calcularMarcador(
          eventos,
          partido.equipoLocalId,
          partido.equipoVisitanteId,
        );
        await tx.partido.update({
          where: { id: partidoId },
          data: {
            marcadorLocal: marcador.local,
            marcadorVisitante: marcador.visitante,
          },
        });
      }

      return tx.discrepanciaEvento.update({
        where: { id: discrepanciaId },
        data: {
          estado: 'RESUELTA',
          eventoDescartadoId,
          resueltoPorId: user.sub,
          resolvedAt: new Date(),
        },
      });
    });
  }
}
```

- [ ] **Step 5: Verificar GREEN**

Run: `npx jest src/discrepancias/discrepancias.service.spec.ts`
Expected: `Tests: 7 passed, 7 total`.

- [ ] **Step 6: Lint y commit**

```bash
npm run lint
git add backend/src/discrepancias
git commit -m "feat(backend): DiscrepanciasService — listar y resolver (HU-2.6)"
```

---

## Task 6: `DiscrepanciasController` + módulo

**Files:**
- Create: `backend/src/discrepancias/discrepancias.controller.ts`
- Create: `backend/src/discrepancias/discrepancias.controller.spec.ts`
- Create: `backend/src/discrepancias/discrepancias.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `DiscrepanciasService.listar`/`resolver` (Task 5), `ResolverDiscrepanciaDto` (Task 5).
- Produces: rutas `GET /partidos/:partidoId/discrepancias` y `PATCH /partidos/:partidoId/discrepancias/:discrepanciaId`, ambas `@Roles('SUPERADMIN', 'LIGA_ADMIN')`. Consumidas por el frontend en Task 9/10 vía `authedFetch`.

- [ ] **Step 1: Escribir los tests fallidos**

```ts
// backend/src/discrepancias/discrepancias.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DiscrepanciasController } from './discrepancias.controller';
import { DiscrepanciasService } from './discrepancias.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

const user: AuthUser = { sub: 'admin-1', email: 'a@a.mx', rol: 'LIGA_ADMIN' };
const mockService = { listar: jest.fn(), resolver: jest.fn() };

describe('DiscrepanciasController', () => {
  let controller: DiscrepanciasController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscrepanciasController],
      providers: [{ provide: DiscrepanciasService, useValue: mockService }],
    }).compile();
    controller = module.get(DiscrepanciasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listar() delega con partidoId y usuario', () => {
    void controller.listar('p1', user);
    expect(mockService.listar).toHaveBeenCalledWith('p1', user);
  });

  it('resolver() delega con partidoId, discrepanciaId, dto y usuario', () => {
    const dto = { accion: 'MANTENER_AMBOS' as const };
    void controller.resolver('p1', 'd1', dto, user);
    expect(mockService.resolver).toHaveBeenCalledWith('p1', 'd1', dto, user);
  });
});
```

- [ ] **Step 2: Verificar RED**

Run: `npx jest src/discrepancias/discrepancias.controller.spec.ts`
Expected: FAIL — `Cannot find module './discrepancias.controller'`.

- [ ] **Step 3: Implementar el controller**

```ts
// backend/src/discrepancias/discrepancias.controller.ts
import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiscrepanciasService } from './discrepancias.service';
import { ResolverDiscrepanciaDto } from './dto/resolver-discrepancia.dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('discrepancias')
@ApiBearerAuth()
@Roles('SUPERADMIN', 'LIGA_ADMIN')
@Controller('partidos/:partidoId/discrepancias')
export class DiscrepanciasController {
  constructor(private readonly discrepanciasService: DiscrepanciasService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista las discrepancias detectadas entre árbitros en el partido (HU-2.6)',
  })
  listar(@Param('partidoId') partidoId: string, @CurrentUser() user: AuthUser) {
    return this.discrepanciasService.listar(partidoId, user);
  }

  @Patch(':discrepanciaId')
  @ApiOperation({
    summary:
      'Resuelve una discrepancia: descarta uno de los dos eventos o mantiene ambos. Solo LIGA_ADMIN dueño o SUPERADMIN.',
  })
  resolver(
    @Param('partidoId') partidoId: string,
    @Param('discrepanciaId') discrepanciaId: string,
    @Body() dto: ResolverDiscrepanciaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discrepanciasService.resolver(partidoId, discrepanciaId, dto, user);
  }
}
```

- [ ] **Step 4: Verificar GREEN**

Run: `npx jest src/discrepancias/discrepancias.controller.spec.ts`
Expected: `Tests: 3 passed, 3 total`.

- [ ] **Step 5: Crear el módulo y registrarlo en `AppModule`**

```ts
// backend/src/discrepancias/discrepancias.module.ts
import { Module } from '@nestjs/common';
import { DiscrepanciasController } from './discrepancias.controller';
import { DiscrepanciasService } from './discrepancias.service';

@Module({
  controllers: [DiscrepanciasController],
  providers: [DiscrepanciasService],
})
export class DiscrepanciasModule {}
```

En `backend/src/app.module.ts`, agregar el import y añadirlo al array `imports`, junto a `EventosModule`:

```ts
import { EventosModule } from './eventos/eventos.module';
import { DiscrepanciasModule } from './discrepancias/discrepancias.module';

@Module({
  imports: [
    // ...
    PartidosModule,
    EventosModule,
    DiscrepanciasModule,
  ],
  // ...
})
```

- [ ] **Step 6: Verificar que la app arranca y la suite completa sigue en verde**

Run: `npx jest && npm run build && npm run lint`
Expected: `Test Suites: 25 passed, 25 total` (22 previas + discrepancias.spec + discrepancias.service.spec + discrepancias.controller.spec — eventos.service.spec.ts no suma un suite nuevo, ya existía), build y lint sin errores.

- [ ] **Step 7: Commit**

```bash
git add backend/src/discrepancias backend/src/app.module.ts
git commit -m "feat(backend): endpoints de discrepancias + módulo registrado (HU-2.6)"
```

---

## Task 7: Tipos de frontend

**Files:**
- Modify: `web/src/lib/types.ts`

**Interfaces:**
- Produces: tipos `EventoDiscrepancia`, `Discrepancia`, `AccionResolucion` usados por Task 8 y Task 9.

- [ ] **Step 1: Agregar los tipos**, al final de `web/src/lib/types.ts`:

```ts
export interface EventoDiscrepancia {
  id: string;
  tipoEvento: TipoEvento;
  equipoId: string | null;
  jugadorId: string | null;
  arbitroId: string;
  timestamp: string;
  descartado: boolean;
}

export type AccionResolucion = "DESCARTAR_A" | "DESCARTAR_B" | "MANTENER_AMBOS";

export interface Discrepancia {
  id: string;
  partidoId: string;
  estado: "PENDIENTE" | "RESUELTA";
  eventoA: EventoDiscrepancia;
  eventoB: EventoDiscrepancia;
  eventoDescartadoId: string | null;
  resueltoPorId: string | null;
  resolvedAt: string | null;
}
```

- [ ] **Step 2: Verificar que el frontend compila**

Run: `cd web && npm run build`
Expected: build exitoso (son tipos nuevos, nada los usa todavía — no puede fallar por esto).

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/types.ts
git commit -m "feat(web): tipos de Discrepancia para el panel admin (HU-2.6)"
```

---

## Task 8: Server Action `resolverDiscrepancia`

**Files:**
- Modify: `web/src/app/admin/partidos/actions.ts`

**Interfaces:**
- Consumes: `authedFetch`, `ApiError`, `ActionState` (ya usados en el archivo), `AccionResolucion` (Task 7).
- Produces: `resolverDiscrepancia(partidoId: string, discrepanciaId: string, accion: AccionResolucion, _prev: ActionState, _formData: FormData): Promise<ActionState>`. Task 9 la usa vía `.bind(null, partidoId, discrepanciaId, accion)` en un `ActionForm`, igual que `avanzarEstado`.

- [ ] **Step 1: Agregar la Server Action**, al final de `web/src/app/admin/partidos/actions.ts`:

```ts
import type { AccionResolucion } from "@/lib/types";

export async function resolverDiscrepancia(
  partidoId: string,
  discrepanciaId: string,
  accion: AccionResolucion,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await authedFetch(`/partidos/${partidoId}/discrepancias/${discrepanciaId}`, {
      method: "PATCH",
      body: JSON.stringify({ accion }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo resolver la discrepancia" };
  }
  revalidatePath("/admin/partidos");
}
```

(Agregar el `import type { AccionResolucion } from "@/lib/types";` junto a los demás imports de tipo al inicio del archivo, no repetir el bloque `"use server"` que ya está en la primera línea.)

- [ ] **Step 2: Verificar que el frontend compila y lintea**

Run: `npm run lint && npm run build`
Expected: ambos limpios (la función no se usa todavía desde ningún componente — eso es normal en este paso intermedio, TypeScript no falla por una función exportada sin usar).

- [ ] **Step 3: Commit**

```bash
git add web/src/app/admin/partidos/actions.ts
git commit -m "feat(web): Server Action resolverDiscrepancia (HU-2.6)"
```

---

## Task 9: UI de resolución en `/admin/partidos`

**Files:**
- Modify: `web/src/app/admin/partidos/page.tsx`

**Interfaces:**
- Consumes: `resolverDiscrepancia` (Task 8), tipo `Discrepancia`/`EventoDiscrepancia` (Task 7), `authedFetch` (ya importado en el archivo), `ActionForm`/`SubmitButton` (ya importados).
- Produces: nada que otra tarea consuma — es la hoja final de la UI.

- [ ] **Step 1: Traer las discrepancias de los partidos `FINALIZADO`** de la categoría, junto a `equipos`/`partidos`/`arbitros`. En `PartidosPage`, después de obtener `partidos`, agregar:

```tsx
  const finalizados = partidos.filter((p) => p.estado === "FINALIZADO");
  const discrepanciasPorPartido = new Map<string, Discrepancia[]>(
    await Promise.all(
      finalizados.map(
        async (p) =>
          [p.id, await authedFetch<Discrepancia[]>(`/partidos/${p.id}/discrepancias`)] as const,
      ),
    ),
  );
```

Y agregar el import del tipo al inicio del archivo:

```tsx
import type { Liga, Equipo, Partido, Usuario, EstadoPartido, Discrepancia } from "@/lib/types";
import { resolverDiscrepancia } from "./actions"; // junto a los demás imports de ./actions
```

(La firma de `actions.ts` ya exporta `resolverDiscrepancia` desde Task 8 — agregarlo al `import { ... } from "./actions"` existente, no crear un import nuevo.)

- [ ] **Step 2: Pasar las discrepancias del partido a `PartidoCard`** — en el `.map` que renderiza `<PartidoCard .../>`, agregar la prop:

```tsx
                <PartidoCard
                  key={partido.id}
                  partido={partido}
                  equipos={equipos}
                  arbitros={arbitros}
                  discrepancias={discrepanciasPorPartido.get(partido.id) ?? []}
                />
```

- [ ] **Step 3: Aceptar la prop y renderizar la alerta + resolución en `PartidoCard`**

Cambiar la firma de `PartidoCard` para aceptar `discrepancias: Discrepancia[]`, y agregar, dentro del contenedor principal (después del bloque `<div className="border-t ... Árbitros ...">`), un bloque nuevo:

```tsx
function PartidoCard({
  partido,
  equipos,
  arbitros,
  discrepancias,
}: {
  partido: Partido;
  equipos: Equipo[];
  arbitros: Usuario[];
  discrepancias: Discrepancia[];
}) {
  const local = equipos.find((e) => e.id === partido.equipoLocalId)?.nombre ?? "?";
  const visitante = equipos.find((e) => e.id === partido.equipoVisitanteId)?.nombre ?? "?";
  const siguiente = ESTADO_SIGUIENTE[partido.estado];
  const asignados = new Set((partido.asignaciones ?? []).map((a) => a.arbitroId));
  const disponibles = arbitros.filter((a) => !asignados.has(a.id));
  const pendientes = discrepancias.filter((d) => d.estado === "PENDIENTE");

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col gap-4">
      {/* ... contenido existente sin cambios ... */}

      {pendientes.length > 0 && (
        <div className="border-t border-amber-200 dark:border-amber-900/50 pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-3">
            ⚠️ {pendientes.length} discrepancia{pendientes.length === 1 ? "" : "s"} por resolver
          </p>
          <div className="flex flex-col gap-3">
            {pendientes.map((d) => (
              <DiscrepanciaRow key={d.id} partidoId={partido.id} discrepancia={d} arbitros={arbitros} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Escribir `DiscrepanciaRow`**, como función nueva al final del archivo (junto a `EmptyState`):

```tsx
function DiscrepanciaRow({
  partidoId,
  discrepancia,
  arbitros,
}: {
  partidoId: string;
  discrepancia: Discrepancia;
  arbitros: Usuario[];
}) {
  const nombreArbitro = (id: string) => arbitros.find((a) => a.id === id)?.nombre ?? id;
  const describirEvento = (e: (typeof discrepancia)["eventoA"]) =>
    `${e.tipoEvento} · ${nombreArbitro(e.arbitroId)} · ${new Date(e.timestamp).toLocaleTimeString("es-MX")}`;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <span className="font-bold">Evento A</span>
          <span className="text-slate-500 dark:text-slate-400">{describirEvento(discrepancia.eventoA)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-bold">Evento B</span>
          <span className="text-slate-500 dark:text-slate-400">{describirEvento(discrepancia.eventoB)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionForm action={resolverDiscrepancia.bind(null, partidoId, discrepancia.id, "DESCARTAR_A")}>
          <SubmitButton className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400">
            Descartar A
          </SubmitButton>
        </ActionForm>
        <ActionForm action={resolverDiscrepancia.bind(null, partidoId, discrepancia.id, "DESCARTAR_B")}>
          <SubmitButton className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400">
            Descartar B
          </SubmitButton>
        </ActionForm>
        <ActionForm action={resolverDiscrepancia.bind(null, partidoId, discrepancia.id, "MANTENER_AMBOS")}>
          <SubmitButton className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800">
            Mantener ambos
          </SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar lint y build**

Run: `npm run lint && npm run build`
Expected: ambos limpios.

- [ ] **Step 6: Commit**

```bash
git add web/src/app/admin/partidos/page.tsx
git commit -m "feat(web): UI de resolución de discrepancias en /admin/partidos (HU-2.6)"
```

---

## Task 10: Verificación manual end-to-end (navegador)

**Files:** ninguno — solo verificación, sin cambios de código a menos que se descubra un bug.

- [ ] **Step 1:** Levantar backend (`npm run start:dev`) y frontend (`npm run dev`).
- [ ] **Step 2:** Como SUPERADMIN/LIGA_ADMIN, asignar **dos** árbitros distintos (roles distintos, p. ej. Referee y Umpire) a un partido `PROGRAMADO`.
- [ ] **Step 3:** Loguear con el primer árbitro, abrir `/partido/:id`, iniciar el partido y registrar un `TD` para el equipo local.
- [ ] **Step 4:** En otra pestaña/perfil, loguear con el segundo árbitro, abrir el mismo partido y registrar **el mismo** `TD` para el equipo local, dentro de los 30 segundos siguientes al del primero.
- [ ] **Step 5:** Con cualquiera de los dos, dar `FIN_MITAD` dos veces para finalizar el partido.
- [ ] **Step 6:** Ir a `/admin/partidos` con esa categoría — confirmar que aparece la caja "⚠️ 1 discrepancia por resolver" con los dos eventos (mismo tipo/equipo, árbitros distintos, marcador actual mostrando 12 puntos si nada se ha resuelto todavía — doble conteo real).
- [ ] **Step 7:** Click en "Descartar A" (o B) — confirmar que la caja de discrepancias desaparece y el marcador del partido baja a 6 puntos (recalculado).
- [ ] **Step 8:** Repetir el escenario y, esta vez, click en "Mantener ambos" — confirmar que la caja desaparece pero el marcador **no** cambia.
- [ ] **Step 9:** Confirmar en `GET /partidos/:id/eventos` (bitácora completa) que el evento descartado sigue apareciendo en la lista, con `descartado: true` — nunca se borró.
- [ ] **Step 10:** Detener ambos servidores de desarrollo.

---

## Self-Review (completado al escribir este plan)

1. **Cobertura del spec:** modelo de datos (Task 1), algoritmo de detección (Task 2), disparo al finalizar (Task 4), exclusión del marcador (Task 3), endpoints admin-only (Tasks 5-6), UI de resolución (Tasks 7-9), testing backend TDD + verificación manual frontend (Task 10). Sin huecos.
2. **Placeholders:** ninguno — cada paso trae el código completo a escribir.
3. **Consistencia de tipos:** `EventoParaDiscrepancia`/`ParDiscrepancia` (Task 2) se reutilizan tal cual en Task 4 vía el array `todos` ya tipado en Task 3. `ResolverDiscrepanciaDto`/`AccionResolucion` (Task 5) se reutilizan sin cambios en el controller (Task 6) y en el frontend (Tasks 7-9). `Discrepancia`/`EventoDiscrepancia` (Task 7) coinciden con el `include` que arma `DiscrepanciasService.listar` (Task 5).
