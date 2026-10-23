# Rediseño "Transmisión de estadio" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the "Transmisión de estadio" identity to the whole web app: tokens, fonts, logo, its own SVG icons in place of emojis, and every screen. Flows and copy stay as they are.

**Architecture:**
- Colors live as CSS variables in `globals.css`, with light and dark values, exposed to Tailwind v4 through `@theme inline`. Screens use the token classes (`bg-fondo`, `text-suave`, …) instead of literal slate, zinc, blue and green classes.
- One `Icono` component holds the whole icon set.
- One logo SVG is the source for the favicon and the PWA PNGs.
- Screens are restyled one group per task.

**Tech Stack:** Next.js (App Router, read `web/CLAUDE.md`: this version differs from your training data), Tailwind v4, next-themes, Vitest, Playwright for screenshots.

**Spec:** `docs/superpowers/specs/2026-10-23-rediseno-transmision-estadio-design.md`

## Global Constraints

- Fonts: **Barlow Condensed** (600, 700, and 800 italic for titles and scoreboard numbers) and **Barlow** (400–700) through `next/font/google`. They replace Outfit.
- Color tokens (dark / light):

| Token | Dark | Light |
|---|---|---|
| `fondo` | `#0A1A33` | `#F4F6FA` |
| `panel` | `#13284A` | `#FFFFFF` |
| `panel-alterno` | `#102240` | `#EAF0F7` |
| `texto` | `#EEF2F8` | `#0A1A33` |
| `suave` | `#B8C4D6` | `#3D4F6B` |
| `franja-1` | `#1E5631` | `#1E5631` |
| `franja-2` | `#256B3D` | `#256B3D` |
| `panuelo` | `#FFD23F` | `#FFD23F` |
| `panuelo-texto` | `#FFD23F` | `#8A6A00` |
| `local` | `#3B82F6` | `#1D4ED8` |
| `visitante` | `#EF4444` | `#B91C1C` |

- The primary button is `panuelo` with `#0A1A33` text in both modes.
- Panels are solid. No `backdrop-filter`, no translucent glass. Corners are 8–10 px. Titles are uppercase, condensed and italic.
- Theme stays with next-themes (system default plus the existing toggle). Every screen must look right in light AND dark.
- No emoji as an icon anywhere under `web/src/app` or `web/src/components`.
- Do not change flows, routes, copy (except icon labels), the referee's touch-target sizes, vibration or lock behaviour. Any test that asserts copy or behaviour must keep passing unchanged.
- Text contrast is ≥ 4.5:1 for every text/background token pair used.
- Before committing, run `cd web && npm test && npx tsc --noEmit && npm run lint`. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Light mode under sunlight: the referee scoreboard in light mode keeps team colors and numbers at ≥ 4.5:1. → Task 1's contrast test covers the token pairs; Task 4's screenshot step checks the scoreboard in light.
2. A team-colored panel showing `panel` text on `local`/`visitante` must stay readable. → Task 1's contrast test includes white on `local` and `visitante` for both modes.
3. Icon-only buttons (theme toggle, lock, close, menu) lose their accessible name once the emoji goes. → Task 2 tests that `Icono` is `aria-hidden` by default; Tasks 4 and 5 keep or add `aria-label` on each icon-only button.
4. The hydration-safe theme toggle (`AdminShell` had a hydration bug before) breaks when its icon changes. → Task 5's screenshot step loads `/admin` fresh and checks the console for hydration errors.
5. A stale emoji survives in a rarely seen state (offline banner, error page, MVP modal). → Task 6's test scans every `.tsx` file.

---

### Task 1: Tokens, fonts and the contrast guard

**Files:**
- Modify: `web/src/app/globals.css`, `web/src/app/layout.tsx`, `web/src/app/manifest.ts`
- Create: `web/src/lib/contraste.ts`, `web/src/lib/contraste.test.ts`, `web/src/lib/tema.ts`

**Interfaces:**
- Produces:
  - Tailwind color utilities `fondo`, `panel`, `panel-alterno`, `texto`, `suave`, `franja-1`, `franja-2`, `panuelo`, `panuelo-texto`, `local`, `visitante` (e.g. `bg-panel`, `text-suave`), switching with the `.dark` class.
  - Font variables `--font-barlow` and `--font-barlow-condensed`, with utilities `font-sans` (Barlow) and `font-display` (Barlow Condensed).
  - CSS classes:
    - `.panel`: solid panel with a 1 px border.
    - `.titulo-estadio`: display font, italic 800, uppercase.
    - `.franjas-campo`: the turf stripes, alternating `franja-1`/`franja-2` vertical stripes 30 px wide.
  - `.glass-panel` is removed. Its 5 users switch to `.panel` in this task.
  - `export const TOKENS: Record<'oscuro' | 'claro', Record<NombreToken, string>>` in `web/src/lib/tema.ts`, with the Global Constraints values. This is the single source the contrast test reads. The `globals.css` values must match it.
  - `export function ratioContraste(a: string, b: string): number` in `contraste.ts`: WCAG 2.x relative-luminance contrast of two `#RRGGBB` colors.

- [ ] **Step 1: Write the failing tests** (`contraste.test.ts`):
  - `ratioContraste('#000000', '#FFFFFF')` ≈ 21 and `ratioContraste('#FFFFFF', '#FFFFFF')` = 1.
  - For both modes, every pair is ≥ 4.5:
    - `texto` on `fondo`, `panel` and `panel-alterno`
    - `suave` on `fondo` and `panel`
    - `panuelo-texto` on `fondo` and `panel`
    - `#0A1A33` on `panuelo`
    - `#FFFFFF` on `local` and on `visitante`
    - `#FFFFFF` on `franja-1` and `franja-2`
  - If a spec value fails a pair, darken only that light/dark value just enough to pass, and record the change in the report. The spec requires ≥ 4.5.
- [ ] **Step 2:** `cd web && npx vitest run src/lib/contraste.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement.**
  - `tema.ts` and `contraste.ts`.
  - `globals.css`: `:root` holds the light values and `.dark` the dark values, plus the `@theme inline` mappings and the three classes above.
  - Keep `--team-a`/`--team-b` as aliases of `local`/`visitante` until Task 4 removes their last uses.
  - `layout.tsx`: load both fonts and drop Outfit.
  - `manifest.ts`: `background_color: "#0A1A33"`, `theme_color: "#0A1A33"`.
  - Replace `.glass-panel` with `.panel` in its 5 files.
- [ ] **Step 4:** `npm test && npx tsc --noEmit && npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(web): tokens y tipografía Transmisión de estadio`.

### Task 2: Icon set and logo

**Files:**
- Create: `web/src/components/icons/Icono.tsx`, `web/src/components/icons/Icono.test.tsx`, `web/src/components/marca/Logo.tsx`
- Replace: `web/public/icon.svg`, `web/public/icon-maskable.svg`, `web/public/icon-192.png`, `web/public/icon-512.png`, `web/public/icon-maskable-512.png`, `web/public/apple-touch-icon.png`

**Interfaces:**
- Produces:
  - `export type NombreIcono = 'touchdown' | 'falta' | 'campo' | 'reloj' | 'tabla' | 'jugador' | 'reglamento' | 'compartir' | 'trofeo' | 'finalizar' | 'corregir' | 'intercambiar' | 'candado' | 'candado-abierto' | 'sol' | 'luna' | 'alerta' | 'silbato' | 'corredor' | 'escudo' | 'recargar' | 'sin-senal' | 'menu' | 'cerrar' | 'saludo' | 'monitor' | 'grafica'`
  - `export function Icono(props: { nombre: NombreIcono; className?: string; titulo?: string }): JSX.Element`
    - It renders `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`, sized `1em` by default.
    - Without `titulo` it is `aria-hidden="true"`. With `titulo` it gets `role="img"` and `aria-label`.
  - `export function Logo(props: { tamano?: number; className?: string }): JSX.Element`: the yard-50 mark, inline SVG.
    - Stripes `franja-1`/`franja-2`, a center chalk line `#EEF2F8`, the numerals "5" and "0" drawn as **paths** (no `<text>`), and the `panuelo` flag with its knot.
    - The lienzo's artboard C is the reference: https://claude.ai/artifact/YGAXDdG2YKsBQkAh21sUQc
- The paths for the touchdown, falta, reloj, tabla, jugador, reglamento, compartir and campo icons can be copied from that artboard. The rest are drawn in the same style.

- [ ] **Step 1: Write the failing tests** (`Icono.test.tsx`):
  - `each NombreIcono renders an svg with at least one path/circle/line`, iterating a `NOMBRES_ICONO` array exported alongside the type.
  - `is aria-hidden without titulo`.
  - `has role img and aria-label with titulo`.
  - `Logo contains no <text> element`.
- [ ] **Step 2:** `npx vitest run src/components`. Expected: FAIL.
- [ ] **Step 3: Implement** the icon set and `Logo`.
  - Write `public/icon.svg` with the same mark (no `<text>`), and `public/icon-maskable.svg` with the mark inside the 80% safe zone on a `#0A1A33` background.
  - Generate the PNGs (192, 512, maskable 512, apple-touch 180, opaque) from the SVGs with any available tool. Playwright's screenshot of the SVG works; don't add a runtime dependency.
- [ ] **Step 4:** `npm test && npx tsc --noEmit && npm run lint`. Expected: PASS. Open `public/icon-512.png` (Read tool) to eyeball it.
- [ ] **Step 5: Commit**: `feat(web): íconos propios y logo yarda 50`.

### Task 3: Public pages, arbitrar, login, mis-partidos

**Files:**
- Modify:
  - `web/src/app/page.tsx`
  - `web/src/app/_publico/*.tsx`
  - `web/src/app/categoria/[id]/page.tsx`
  - `web/src/app/jugador/[id]/page.tsx`
  - `web/src/app/resultado/[id]/page.tsx` and `CompartirResultado.tsx`
  - `web/src/app/arbitrar/*.tsx`
  - `web/src/app/login/*.tsx`
  - `web/src/app/mis-partidos/page.tsx`

**Interfaces:**
- Consumes: Task 1's tokens and classes, plus `Icono` and `Logo` from Task 2.

- [ ] **Step 1: Restyle.**
  - `EncabezadoPublico` uses `Logo` and the "PAÑUELO / SIN EFECTO" wordmark in `font-display` italic.
  - Hero titles use `.titulo-estadio`. The primary CTA is the pañuelo button.
  - Public scoreboards (`_publico/Marcador.tsx`, resultado) follow the artboard: end-zone bands in `local`/`visitante` with the team name vertical, `.franjas-campo` center, score plate in `fondo` at 88% opacity.
  - Tables use alternating `panel`/`panel-alterno` rows, with the leader's points in `panuelo-texto`.
  - Replace every emoji in these files with `Icono`.
- [ ] **Step 2:** `npm test && npx tsc --noEmit && npm run lint`. Expected: PASS, with existing tests unchanged.
- [ ] **Step 3: Screenshots.** Start the API and web locally. Port 3000 may be taken by someone else's process; use API `:3006` and web `:3005` with `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS` set accordingly.
  - Capture at 390 and 1280 px, light and dark: `/`, a `/categoria/:id`, a `/jugador/:id`, a `/resultado/:id`, `/arbitrar`, `/login` and `/mis-partidos`. Seed what's needed locally.
  - Save to `<scratchpad>/rediseno/task3/`.
  - View a few yourself and fix anything clipped, overflowing or low-contrast.
- [ ] **Step 4: Commit**: `feat(web): páginas públicas con identidad de estadio`.

### Task 4: Referee scoreboard

**Files:**
- Modify: `web/src/app/partido/[id]/ScoreboardClient.tsx`, `ActionModal.tsx`, `MvpModal.tsx`, `ConfirmModal.tsx`, `CorregirPanel.tsx`, `LockOverlay.tsx`, `NoAsignado.tsx`

**Interfaces:**
- Consumes: Tasks 1 and 2.

- [ ] **Step 1: Restyle.**
  - The header uses `fondo`/`panel`. Team panels use the `local`/`visitante` end-zone treatment, with score numbers in `font-display` italic 800.
  - Big buttons keep their current sizes. The primary actions (Finalizar, Finalizar de nuevo) use the pañuelo button.
  - "Corregir resultado", "Compartir resultado", "Elegir MVP", lock and theme toggle get `Icono`. Every icon-only button keeps or gains `aria-label`.
  - Remove the last uses of `--team-a`/`--team-b` and delete those aliases from `globals.css`.
- [ ] **Step 2:** `npm test && npx tsc --noEmit && npm run lint`. Expected: PASS, with the scoreboard tests unchanged.
- [ ] **Step 3: Screenshots** at 390 px, light and dark:
  - a quick match in progress;
  - the TD flow modal;
  - finalized with "Compartir / Corregir";
  - the correcting state;
  - the lock overlay;
  - the NoAsignado screen.

  Save them to `<scratchpad>/rediseno/task4/`. Check the light-mode scoreboard reads clearly.
- [ ] **Step 4: Commit**: `feat(web): marcador del árbitro con identidad de estadio`.

### Task 5: Admin panel

**Files:**
- Modify: `web/src/app/admin/_components/*.tsx`, `web/src/app/admin/**/page.tsx`, `web/src/app/admin/error.tsx`

**Interfaces:**
- Consumes: Tasks 1 and 2.

- [ ] **Step 1: Restyle.**
  - `AdminShell` sidebar and header: `fondo`, `panel`, `Logo` and the wordmark. Nav items use `Icono`, and the active item is marked with a `panuelo` bar.
  - Forms and tables use the panel and table styles from Task 3. Destructive buttons keep a red that passes contrast in both modes.
  - Replace every emoji, including `☰` and `✕`, with `Icono` plus `aria-label`.
- [ ] **Step 2:** `npm test && npx tsc --noEmit && npm run lint`. Expected: PASS.
- [ ] **Step 3: Screenshots** at 1280 and 390 px, light and dark, as superadmin: `/admin`, ligas, equipos, an equipo roster, partidos, árbitros and discrepancias (if reachable).
  - Load `/admin` fresh and confirm the console has no hydration errors (Review Focus 4).
  - Save to `<scratchpad>/rediseno/task5/`.
- [ ] **Step 4: Commit**: `feat(web): panel admin con identidad de estadio`.

### Task 6: No-emoji guard and release

**Files:**
- Create: `web/src/sin-emojis.test.ts`

- [ ] **Step 1: Write the test** `no .tsx under src/app or src/components contains emoji used as UI`.
  - Read every `.tsx` file and fail with `file:line` on any match of `/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{21C4}\u{2630}\u{2715}]/u`.
  - Skip `*.test.tsx`.
- [ ] **Step 2:** `npx vitest run src/sin-emojis.test.ts`. Expected: PASS if Tasks 3–5 got everything; otherwise replace what it names, then PASS.
- [ ] **Step 3:** Full `npm test && npx tsc --noEmit && npm run lint && npm run build`. Expected: PASS.
- [ ] **Step 4: Commit**: `test(web): ningún emoji como ícono`.
- [ ] **Step 5:** PR to `main` (web only, so `deploy-api.yml` does not fire), CI green, merge (the user already said "empuja a producción"), wait for Vercel production, then check the live landing and a `/resultado/:id` at 390 px light and dark.
