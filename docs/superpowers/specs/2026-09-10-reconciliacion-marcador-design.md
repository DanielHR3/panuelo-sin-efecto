# HU-2.6: Reconciliación de marcador entre árbitros

**Estado:** Aprobado por el usuario en brainstorming (2026-09-10). Listo para plan de implementación.

## Contexto y problema real

El sistema permite asignar varios árbitros a un mismo partido (roles `Referee`,
`Umpire`, `Line Judge`, ver `AsignacionArbitral`), y **cualquiera** de los
asignados puede registrar eventos de juego desde su propio dispositivo
(`eventos.service.ts`, `assertPuedeRegistrar`). Cada dispositivo tiene su
propia cola offline (IndexedDB) y sincroniza quand puede.

Esto no crea "dos historiales" separados a nivel de datos — todos los
eventos de un partido caen en la misma tabla `EventoPartido`, el campo
`arbitroId` solo registra quién lo metió. El riesgo real es **duplicación**:
si dos árbitros ven la misma jugada y ambos la registran por separado (p. ej.
los dos tocan "TD equipo local" en su teléfono, sin saber que el otro ya lo
hizo), el evento se cuenta dos veces y el marcador queda mal — sin que el
mecanismo de idempotencia existente (`clientEventId`) lo detecte, porque son
dos envíos genuinamente distintos, no un reintento del mismo.

HU-2.6 construye la detección y resolución de esa duplicación.

## Decisiones tomadas en brainstorming

1. **Modelo base**: se mantiene el modelo actual (varios árbitros escriben en
   paralelo); no se restringe a un solo árbitro-escritor. La reconciliación
   es una capa encima, no un rediseño del modelo de escritura.
2. **Momento**: la detección corre **una vez**, al finalizar el partido (al
   llegar a `FINALIZADO` por el segundo `FIN_MITAD`) — no en vivo. Encaja con
   el modelo offline-first: no depende de que dos dispositivos estén online
   al mismo tiempo durante el juego.
3. **Qué produce**: detección automática de pares sospechosos + una decisión
   guiada (no solo un resumen para revisar a ojo).
4. **Quién resuelve**: solo `LIGA_ADMIN` (dueño de la liga) o `SUPERADMIN`,
   desde el panel admin — no los árbitros en cancha.

## Modelo de datos

### `EventoPartido.descartado: Boolean @default(false)`

Flag suave. La fila **nunca se borra** — respeta el principio de Caja Negra
(el evento "existe", solo se excluye del cálculo del marcador). Las dos
consultas que alimentan `calcularMarcador` en `eventos.service.ts`
(`registrar()` y `getMarcador()`) agregan `descartado: false` a su `where`.
La función pura `calcularMarcador` (backend y frontend) no cambia.

### Tabla nueva `DiscrepanciaEvento`

```prisma
model DiscrepanciaEvento {
  id                 String    @id @default(uuid())
  partidoId          String
  partido            Partido   @relation(fields: [partidoId], references: [id])

  eventoAId          String
  eventoA            EventoPartido @relation("DiscrepanciaEventoA", fields: [eventoAId], references: [id])
  eventoBId          String
  eventoB            EventoPartido @relation("DiscrepanciaEventoB", fields: [eventoBId], references: [id])

  estado             String    // PENDIENTE, RESUELTA
  eventoDescartadoId String?   // null si se resolvió como "mantener ambos"
  eventoDescartado   EventoPartido? @relation("DiscrepanciaEventoDescartado", fields: [eventoDescartadoId], references: [id])

  resueltoPorId      String?
  resueltoPor        Usuario?  @relation(fields: [resueltoPorId], references: [id])
  resolvedAt         DateTime?

  createdAt          DateTime  @default(now())
}
```

Mantiene el juicio humano ("esto sí era un duplicado") separado del log
inmutable de lo que pasó. Tres relaciones nombradas hacia `EventoPartido`
porque una discrepancia referencia hasta tres eventos distintos (A, B, y
cuál de los dos se descartó).

## Algoritmo de detección

Función pura y testeable, análoga a `calcularMarcador` en estilo:

```ts
function detectarDiscrepancias(
  eventos: { id: string; tipoEvento: string; equipoId: string | null; arbitroId: string; timestamp: Date }[],
): { eventoAId: string; eventoBId: string }[]
```

1. Filtrar a eventos "de jugada": `TD, PAT1, PAT2, SAFETY, PICK_SIX, SACK,
   INTERCEPCION, FALTA_PERSONAL, EXPULSION` (excluye `INICIO_MITAD`,
   `FIN_MITAD`, `TIMEOUT`, `UNDO_LAST_ACTION` — no son "jugadas").
2. Agrupar por `(tipoEvento, equipoId)`. **`jugadorId` no entra en la clave**:
   si un árbitro registra el TD con jugador y otro sin jugador (usó
   "Continuar sin jugador específico"), sigue siendo el mismo hecho.
3. Dentro de cada grupo, ordenar por `timestamp`. Recorrer y emparejar
   secuencialmente: un evento no emparejado con el siguiente evento no
   emparejado de un `arbitroId` **distinto**, si la diferencia de
   `timestamp` es `<= 30_000` ms. Al emparejar, ambos quedan "consumidos"
   (no vuelven a ofrecerse) — así tres árbitros tocando la misma jugada
   producen como máximo dos pares (A-B, y si sobra C, un segundo intento
   con el siguiente evento libre), no una combinatoria completa.
4. Se ejecuta una sola vez, disparada dentro de la misma transacción que
   fija `estado = FINALIZADO` (segundo `FIN_MITAD`), y **solo si
   `partido.asignaciones.length > 1`** — con un solo árbitro asignado no hay
   nada que discrepar, se salta el trabajo.

## Endpoints

### `GET /partidos/:id/discrepancias`

Lista las discrepancias del partido (pendientes y resueltas) con el detalle
de ambos eventos (tipo, equipo, jugador si lo hay, árbitro, hora). **No es
`@Public()`** (a diferencia de `GET /partidos/:id`): expone quién registró
qué y el historial de resoluciones, así que requiere `@Roles('SUPERADMIN',
'LIGA_ADMIN')` — coherente con que la reconciliación completa es
admin-only, sin excepción para lectura.

### `PATCH /partidos/:id/discrepancias/:discrepanciaId`

Body: `{ accion: "DESCARTAR_A" | "DESCARTAR_B" | "MANTENER_AMBOS" }`.

Autorización: **solo admin** — reutiliza `OwnershipService.assertCanManagePartido`
(el mismo que ya usan `update`/`remove` de partidos), no el patrón
"árbitro asignado" de eventos/MVP, porque aquí decide expresamente el
LIGA_ADMIN o SUPERADMIN, no el árbitro en cancha.

- `DESCARTAR_A` / `DESCARTAR_B`: marca `descartado = true` en el evento
  correspondiente, la discrepancia pasa a `RESUELTA` con
  `eventoDescartadoId`, `resueltoPorId`, `resolvedAt`, y se recalcula +
  persiste `marcadorLocal`/`marcadorVisitante` del partido (mismo patrón que
  ya usa `eventos.service.ts` al registrar un evento).
- `MANTENER_AMBOS`: pasa a `RESUELTA` con `eventoDescartadoId = null`, sin
  tocar ningún evento ni el marcador. Cubre el falso positivo (dos jugadas
  reales que coincidieron en tiempo).
- Rechaza (`BadRequestException`) si la discrepancia ya está `RESUELTA`.

## Frontend (panel admin)

En `/admin/partidos`, dentro de `PartidoCard`: cuando `estado === "FINALIZADO"`
y el partido tiene discrepancias `PENDIENTE`, una caja de alerta
"⚠️ N discrepancias por resolver" que expande, por cada par, los dos eventos
lado a lado (tipo, equipo, jugador, árbitro, hora) con tres botones
(`ActionForm` + nueva Server Action `resolverDiscrepancia`, mismo patrón que
`avanzarEstado`/`asignarArbitro` en `actions.ts`): **Descartar A** /
**Descartar B** / **Mantener ambos**.

`PartidosPage` ya carga `partidos` por categoría; se añade un `Promise.all`
que trae `GET .../discrepancias` para los partidos `FINALIZADO` de esa
categoría (aceptable a esta escala de panel admin — N+1 pero acotado a los
partidos finalizados de una sola categoría a la vez).

## Testing

**Backend (TDD, igual que HU-2.3/2.5 — test primero, RED confirmado antes de
implementar):**
- `detectarDiscrepancias`: función pura, tests de agrupación por tipo/equipo,
  ventana de 30s, no-repetición de eventos ya emparejados, caso de 3+
  árbitros en la misma jugada, `jugadorId` no afecta el agrupado.
- Servicio de resolución: autorización solo-admin (rechaza árbitro sin ser
  dueño), `DESCARTAR_A`/`DESCARTAR_B` marcan `descartado` y recalculan
  marcador, `MANTENER_AMBOS` no toca nada, rechaza resolver una discrepancia
  ya `RESUELTA`.
- Controller: tests de delegación (mismo patrón que `partidos.controller.spec.ts`).
- Integración con `registrar()`/`resolverTransicionEstado`: la detección se
  dispara solo en la transición a `FINALIZADO` con `asignaciones.length > 1`.

**Frontend:** sin test runner (confirmado en HU-2.3/2.5) — verificación
manual en navegador: asignar 2 árbitros a un partido, simular que ambos
registran el mismo TD por separado (dentro de la ventana de 30s), finalizar,
confirmar que la discrepancia aparece en el panel admin, resolverla con cada
una de las tres acciones y confirmar que el marcador se corrige (o no
cambia, en el caso de "mantener ambos").

## Fuera de alcance (YAGNI)

- Reconciliación en vivo durante el partido (descartado explícitamente por
  el usuario).
- Resolución por los árbitros mismos (solo admin, por decisión del usuario).
- Detección de discrepancias en eventos no-jugada (`TIMEOUT`,
  `INICIO_MITAD`/`FIN_MITAD`, `UNDO_LAST_ACTION`) — no representan puntos ni
  estadísticas, no hay nada que reconciliar ahí.
