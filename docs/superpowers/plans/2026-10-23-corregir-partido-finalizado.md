# Corregir un partido finalizado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un partido `FINALIZADO` se pueda reabrir, anular eventos puntuales y volver a finalizar, sin mutar ni borrar eventos (Caja Negra), más el atajo "los equipos estaban al revés" para partidos rápidos.

**Architecture:** Dos tipos de evento nuevos (`REABRIR_PARTIDO`, `ANULAR_EVENTO`) y una columna nullable `EventoPartido.eventoAnuladoId`. Toda la lógica de "qué evento cuenta" vive en `marcarCancelaciones` (`backend/src/eventos/marcador.ts`), con su copia en `web/src/lib/marcador.ts`. Las reglas de cuándo se acepta cada evento viven en `EventosService`. El atajo de partidos rápidos es un endpoint aparte en `RapidoController` que intercambia los nombres de los dos `Equipo`.

**Tech Stack:** NestJS + Prisma (PostgreSQL), Jest; Next.js + Vitest.

**Spec:** `docs/superpowers/specs/2026-10-23-ligas-autoservicio-design.md` — Parte 1.

## Global Constraints

- Nunca se hace UPDATE sobre `marcadorLocal/Visitante` salvo el recálculo existente desde eventos, ni se borran eventos.
- Los Swagger decorators van en cada endpoint nuevo; los DTOs usan `class-validator`; la lógica va en servicios.
- Los botones del árbitro tienen áreas táctiles grandes, vibración en acciones críticas y soportan modo claro y oscuro.
- Todo el texto visible está en español de México.
- Antes de tocar `web/`, lee `web/CLAUDE.md`: la versión de Next.js difiere de lo conocido.
- Plazo para el árbitro asignado: **48 h** desde el `timestamp` del último `FIN_MITAD` vigente. El dueño de la liga y el `SUPERADMIN` no tienen plazo.
- Eventos anulables (`ANULABLES`): `TD`, `PAT1`, `PAT2`, `SAFETY`, `PICK_SIX`, `FALTA_PERSONAL`, `EXPULSION`, `INTERCEPCION`, `SACK`.

## Review Focus

1. **Anular dos veces el mismo evento:** debe responder 400 (ya anulado), no volver a restar puntos ni fallar en silencio. → Prueba en Task 2.
2. **Cola offline con `REABRIR_PARTIDO` encolado y el partido todavía `EN_CURSO`** (por ejemplo, en otro dispositivo): el servidor debe rechazarlo con 400 y la cola debe descartarlo, no quedarse atascada. → Prueba en Task 2 (rechazo); la cola ya descarta en errores que no son de red.
3. **UNDO justo después de reabrir:** no puede cancelar el `FIN_MITAD` ni el `REABRIR_PARTIDO`; es un no-op. → Prueba en Task 1.
4. **Refinalizar un partido con varios árbitros:** la detección de discrepancias corre otra vez sin romper la restricción única ni duplicar pares. → Prueba en Task 2.
5. **Intercambiar equipos en un partido de liga normal:** debe responder 400, porque esos equipos se comparten con otros partidos. → Prueba en Task 3.

---

### Task 1: Tipos de evento nuevos y reglas de cancelación (backend)

**Files:**
- Modify: `backend/prisma/schema.prisma` (modelo `EventoPartido`)
- Create: `backend/prisma/migrations/<timestamp>_reabrir_anular_evento/migration.sql` (con `npx prisma migrate dev --name reabrir_anular_evento`)
- Modify: `backend/src/eventos/evento.constants.ts`
- Modify: `backend/src/eventos/marcador.ts`
- Test: `backend/src/eventos/marcador.spec.ts`

**Interfaces:**
- Produces:
  - `TIPOS_EVENTO` incluye `'REABRIR_PARTIDO'` y `'ANULAR_EVENTO'`.
  - `export const ANULABLES: readonly TipoEvento[]` (la lista de Global Constraints) y `export function esAnulable(tipo: string): boolean`.
  - `EventoParaMarcador` pasa a ser `{ id: string; tipoEvento: string; equipoId: string | null; eventoAnuladoId?: string | null }`.
  - `EventoConId` pasa a ser `{ id: string; tipoEvento: string; eventoAnuladoId?: string | null }`.
  - Las firmas de `calcularMarcador` y `filtrarEventosVigentes` no cambian.
- Schema: `eventoAnuladoId String?` en `EventoPartido`, con una relación a sí mismo (`eventoAnulado` y `anuladoPor`, nombre de relación `"EventoAnulado"`).

- [ ] **Step 1: Escribir las pruebas que fallan** en `marcador.spec.ts` (`describe('ANULAR_EVENTO y REABRIR_PARTIDO')`):
  - `anula un TD que no es el último`: TD(local, id a), PAT1(local, b), ANULAR(→a) ⇒ `{local: 1, visitante: 0}`.
  - `UNDO deshace una anulación`: TD(a), ANULAR(→a), UNDO ⇒ `{local: 6}`.
  - `UNDO tras REABRIR es no-op`: TD(a), FIN_MITAD, FIN_MITAD, REABRIR, UNDO ⇒ `{local: 6}`, y `filtrarEventosVigentes` conserva los dos `FIN_MITAD` y `REABRIR`.
  - `UNDO después de un TD posterior a la reapertura cancela ese TD`: TD(a), FIN, FIN, REABRIR, TD(visitante, c), UNDO ⇒ `{local: 6, visitante: 0}`.
  - `filtrarEventosVigentes excluye el evento anulado` y conserva el propio `ANULAR_EVENTO`.
  - `ANULAR_EVENTO que apunta a un id inexistente es no-op`.
  - Las pruebas existentes se actualizan para que cada evento tenga `id`.
- [ ] **Step 2:** Ejecuta `cd backend && npx jest src/eventos/marcador.spec.ts`. Esperado: FALLA.
- [ ] **Step 3: Implementar.** En `marcarCancelaciones`:
  - Primer recorrido: el `UNDO` actual, con un tope. El `UNDO` busca hacia atrás el último elemento no cancelado, pero si encuentra un `REABRIR_PARTIDO` antes de dar con un candidato, se detiene sin cancelar nada. Nunca cancela un `REABRIR_PARTIDO` ni lo que hay antes de él.
  - Segundo recorrido: cada `ANULAR_EVENTO` no cancelado marca `cancelado = true` en el elemento cuyo `original.id === eventoAnuladoId`.
  - Actualiza el comentario de la función con las reglas nuevas.
  - En la migración, agrega la columna y la FK.
- [ ] **Step 4:** Ejecuta `cd backend && npx jest src/eventos && npx tsc --noEmit`. Esperado: PASA.
- [ ] **Step 5: Commit** con el mensaje `feat(eventos): REABRIR_PARTIDO y ANULAR_EVENTO en la pila de cancelación`.

### Task 2: Reglas de aceptación en `EventosService` y selects

**Files:**
- Modify: `backend/src/eventos/dto/registrar-evento.dto.ts`
- Modify: `backend/src/eventos/eventos.service.ts`
- Modify: `backend/src/discrepancias/discrepancias.service.ts` (select de `recalcularMarcador`)
- Modify: `backend/src/publico/publico.service.ts` (`eventoSelect`) y `backend/src/publico/estadisticas.ts` (`EventoPublico`)
- Test: `backend/src/eventos/eventos.service.spec.ts`

**Interfaces:**
- Consumes: `esAnulable` y el `EventoParaMarcador` de Task 1.
- Produces: `POST /partidos/:id/eventos` acepta `{ tipoEvento: 'REABRIR_PARTIDO' }` y `{ tipoEvento: 'ANULAR_EVENTO', eventoAnuladoId: uuid }`. `GET /partidos/:id/eventos` devuelve `eventoAnuladoId` en cada evento.

- [ ] **Step 1: Escribir las pruebas que fallan** (mocks de Prisma, siguiendo el estilo del spec actual):
  - `REABRIR_PARTIDO en FINALIZADO lo pasa a EN_CURSO`.
  - `REABRIR_PARTIDO en EN_CURSO → 400 'El partido no está finalizado'`.
  - `árbitro asignado puede reabrir dentro de 48 h` (último `FIN_MITAD` hace 47 h).
  - `árbitro asignado no puede reabrir después de 48 h → 403 'El plazo para corregir este partido (48 h) ya terminó; pídeselo al organizador de la liga'`.
  - `dueño de la liga puede reabrir después de 48 h`.
  - `ANULAR_EVENTO sin eventoAnuladoId → 400`.
  - `ANULAR_EVENTO sin haber reabierto (partido EN_CURSO de su primera vuelta) → 400 'Solo se pueden anular eventos al corregir un partido finalizado'`.
  - `ANULAR_EVENTO a un evento de otro partido → 400`.
  - `ANULAR_EVENTO a un FIN_MITAD → 400 'Ese evento no se puede anular'`.
  - `ANULAR_EVENTO a un evento ya anulado (vigente) → 400 'Ese evento ya está anulado'` (Review Focus 1).
  - `refinalizar con varios árbitros llama a createMany con skipDuplicates` (Review Focus 4).
- [ ] **Step 2:** Ejecuta `cd backend && npx jest src/eventos/eventos.service.spec.ts`. Esperado: FALLA.
- [ ] **Step 3: Implementar.**
  - DTO: `eventoAnuladoId?: string` con `@IsOptional() @IsUUID('4')` y su Swagger.
  - `resolverTransicionEstado`: en `FINALIZADO`, solo `REABRIR_PARTIDO` pasa y regresa `'EN_CURSO'`; cualquier otro evento lanza el error actual. `REABRIR_PARTIDO` en otro estado lanza 400.
  - Método privado nuevo `assertPuedeReabrir(tx, partidoId, partido, usuario)`: dueño o superadmin pasan; si no, se busca el último `FIN_MITAD` y se compara contra `Date.now() - 48 * 3600_000`.
  - Método privado nuevo `assertPuedeAnular(tx, partidoId, eventoAnuladoId)`: debe existir un `REABRIR_PARTIDO` en el partido. El objetivo debe ser del partido, cumplir `esAnulable` y estar vigente según `filtrarEventosVigentes` sobre los eventos del partido.
  - Guarda `eventoAnuladoId` en el `create`.
  - Agrega `id` y `eventoAnuladoId` a todos los `select` que alimentan `calcularMarcador` o `filtrarEventosVigentes` (los dos de `eventos.service.ts`, `discrepancias.service.ts:166` y `eventoSelect` de publico).
- [ ] **Step 4:** Ejecuta `cd backend && npx jest && npx tsc --noEmit && npm run lint`. Esperado: PASA.
- [ ] **Step 5: Commit** con el mensaje `feat(eventos): reabrir partido finalizado y anular eventos con plazo de 48 h`.

### Task 3: Atajo "los equipos estaban al revés" (partidos rápidos)

**Files:**
- Modify: `backend/src/rapido/rapido.controller.ts`, `backend/src/rapido/rapido.service.ts`
- Test: `backend/src/rapido/rapido.service.spec.ts`

**Interfaces:**
- Produces: `POST /rapido/partidos/:id/intercambiar-equipos` (autenticado, no `@Public`), que responde `{ equipoLocal: { id, nombre }, equipoVisitante: { id, nombre } }`. Método `RapidoService.intercambiarEquipos(partidoId: string, usuario: AuthUser)`.

- [ ] **Step 1: Escribir las pruebas que fallan:**
  - `intercambia los nombres de los dos equipos en una transacción`.
  - `solo dueño, superadmin o árbitro asignado → si no, 403`.
  - `partido de liga tipo LIGA → 400 'Solo disponible en partidos rápidos'` (Review Focus 5).
  - `no toca eventos` (no se llama a `eventoPartido.*`).
- [ ] **Step 2:** Ejecuta `cd backend && npx jest src/rapido`. Esperado: FALLA.
- [ ] **Step 3: Implementar.** Lee el partido con `categoria.liga.tipo`, `propietarioId`, las asignaciones y los dos equipos. Dentro de `$transaction`, haz dos `equipo.update` intercambiando `nombre` y `colorPrimario`. Se permite en cualquier estado del partido.
- [ ] **Step 4:** Ejecuta `cd backend && npx jest && npx tsc --noEmit`. Esperado: PASA.
- [ ] **Step 5: Commit** con el mensaje `feat(rapido): intercambiar equipos de un partido rápido`.

### Task 4: Web — tipos, marcador optimista y payload

**Files:**
- Modify: `web/src/lib/types.ts` (`TIPOS_EVENTO`, `GameEvent.eventoAnuladoId: string | null`, `Liga.tipo: "LIGA" | "RAPIDA"`)
- Modify: `web/src/lib/marcador.ts`
- Modify: `web/src/lib/offline-queue.ts` y el tipo `EventoPayload` en `ScoreboardClient.tsx` (que acepten `eventoAnuladoId`)
- Test: `web/src/lib/marcador.test.ts`

**Interfaces:**
- Consumes: el contrato de Task 2.
- Produces: el `calcularMarcador` web con las mismas reglas que el backend, y `EventoPayload` con `eventoAnuladoId?: string`.

- [ ] **Step 1: Escribir las pruebas que fallan:** los mismos seis casos de Task 1, Step 1, en Vitest.
- [ ] **Step 2:** Ejecuta `cd web && npx vitest run src/lib/marcador.test.ts`. Esperado: FALLA.
- [ ] **Step 3: Implementar:** porta el algoritmo de dos recorridos. En `drenarCola`, incluye `eventoAnuladoId` en el payload cuando venga.
- [ ] **Step 4:** Ejecuta `cd web && npm test && npx tsc --noEmit && npm run lint`. Esperado: PASA.
- [ ] **Step 5: Commit** con el mensaje `feat(web): marcador optimista con REABRIR/ANULAR`.

### Task 5: Web — flujo "Corregir resultado" en el marcador

**Files:**
- Create: `web/src/app/partido/[id]/CorregirPanel.tsx` (lista de eventos anulables vigentes con el botón "Anular")
- Create: `web/src/app/partido/[id]/corregir.ts` + `corregir.test.ts` (función pura `eventosAnulables(eventos: GameEvent[]): GameEvent[]`, que devuelve los vigentes y anulables, del más reciente al más antiguo)
- Modify: `web/src/app/partido/[id]/ScoreboardClient.tsx`

**Interfaces:**
- Consumes: Task 4 (tipos, `calcularMarcador`); `describe.ts` para el texto de cada evento; el endpoint de Task 3.

- [ ] **Step 1: Escribir las pruebas que fallan** en `corregir.test.ts`: excluye `FIN_MITAD`, `UNDO` y los eventos ya anulados; ordena del más reciente al más antiguo.
- [ ] **Step 2:** Ejecuta `cd web && npx vitest run src/app/partido`. Esperado: FALLA.
- [ ] **Step 3: Implementar.**
  - Con el partido finalizado se muestra el botón **"✏️ Corregir resultado"** junto a "Compartir resultado". Pide confirmación ("¿Reabrir el partido para corregirlo?") con el modal propio del proyecto, no `window.confirm`. Después manda `REABRIR_PARTIDO` y pone `estado` en `EN_CURSO`.
  - Mientras el partido esté reabierto (`EN_CURSO` y con un `REABRIR_PARTIDO` vigente en `eventos`), se muestra:
    - un aviso "Corrigiendo resultado";
    - `CorregirPanel`, donde cada fila dice algo como "TD · Toros · #12" y tiene el botón "Anular", que manda `ANULAR_EVENTO` con vibración `[50, 50, 50]`;
    - los botones normales, para registrar lo correcto;
    - el botón "🏁 Finalizar de nuevo", que reutiliza `handleFinMitad`.
  - Si el servidor responde 403 por el plazo, se muestra el mensaje del backend tal cual.
  - En ligas `RAPIDA` (`partido.categoria?.liga.tipo === "RAPIDA"`) aparece además **"⇄ Los equipos estaban al revés"**, también con confirmación. Llama al endpoint de Task 3 y actualiza los nombres en pantalla sin recargar.
  - Al refinalizar no se vuelve a pedir el MVP si ya hay uno (`mvpJugadorId` existente).
- [ ] **Step 4:** Ejecuta `cd web && npm test && npx tsc --noEmit && npm run lint`. Esperado: PASA. Después, con la API y la web locales levantadas, recorre en Playwright con viewport de 390 px: partido rápido → TD local → finalizar → "Corregir resultado" → anular el TD → TD visitante → finalizar de nuevo → `/resultado/:id` muestra 0-6. Repite con "Los equipos estaban al revés". Toma capturas en modo claro y oscuro.
- [ ] **Step 5: Commit** con el mensaje `feat(web): corregir resultado de un partido finalizado`.

### Task 6: PR, despliegue y verificación en producción

- [ ] **Step 1:** Abre un PR contra `main` con un resumen y el plan de pruebas. No lo apiles sobre otro PR.
- [ ] **Step 2:** Pide al usuario que confirme el merge. Después del merge, confirma que el workflow `deploy-api.yml` terminó en verde y que Render aplicó la migración (`prisma migrate deploy` en el arranque). Revisa con `gh run list --workflow deploy-api.yml --limit 1`.
- [ ] **Step 3:** En producción, crea un partido rápido desde `/arbitrar` y repite el recorrido de Task 5, Step 4. Esperado: el marcador corregido aparece en `/resultado/:id`.
