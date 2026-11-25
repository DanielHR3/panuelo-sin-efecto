# Guía de IA (CLAUDE.md) - Frontend Web (PWA)

## Stack Tecnológico
- Next.js (App Router).
- Tailwind CSS.
- TypeScript (Strict Mode).
- (Próximamente) shadcn/ui.

## Reglas de Estilo y Desarrollo (UXD)
1. **Responsividad (Mobile-First):** La vista del árbitro será consumida en dispositivos móviles bajo presión y luz solar. Tailwind debe usarse empezando por tamaños pequeños.
2. **Botones e Interfaz:** Los botones (especialmente los del marcador) deben tener áreas táctiles enormes.
3. **Temas (Claro/Oscuro):** No se debe forzar a los usuarios a usar Dark Mode. Todo componente de UI debe soportar ambos modos usando las clases de Tailwind (`dark:bg-black`).
4. **Haptic Feedback:** Cada interacción crítica del árbitro (anotar puntos, tiempos fuera, deshacer) debe disparar la Web Vibration API para confirmar la acción sin tener que mirar la pantalla.
5. **Componentes Server vs Client:** Aprovechar los Server Components de Next.js para el panel administrativo, y Client Components (`"use client"`) para la PWA del árbitro que requiere interactividad y Service Workers (Offline-First).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

<!-- auditores:inicio -->
## 🛡️ Auditores del proyecto

Skills `auditor-*` en `~/.claude/skills/` (fuente: bóveda `01 Proyectos/Auditores/`; ciclo en `01 Proyectos/Marcos Metodologicos Freelance/Sistema de Auditoria y Calidad.md`). Los auditores **ponen a prueba, no corrigen**: exigen evidencia y emiten veredicto (Listo · Ajustes puntuales · Iteración profunda).

| Momento | Auditor | Qué entregarle |
|---|---|---|
| Al terminar una pantalla o flujo (escritorio + `390px` / dispositivo) | `auditor-ux` | URL o capturas, rol y tarea crítica; estados carga/vacío/error |
| Antes de fijar logo, favicon o icono de la app | `auditor-logos` | Archivos, dónde aparecen y con qué marcas conviven |
| Antes de producción (capa cliente) | `auditor-seguridad` | Código, `.env.example`, config de build; cero llaves en el bundle, cero seguridad de fachada |

**Regla de trabajo para el agente**
- No declares nada «listo» sin evidencia (build, prueba, captura o petición ejecutada); lo no probado se reporta «no probado».
- Ante «audita …», entra en modo auditor: no reescribas código en ese paso; hallazgos con severidad, evidencia y pregunta crítica.
- Informe en la carpeta `Auditorias/` del proyecto en Obsidian: `AAAA-MM-DD - Auditoria {Tipo} - {Proyecto}.md`. Un hallazgo se cierra con evidencia (commit, prueba), no con «ya quedó».

**Obligatorio sí o sí antes de entregar** (bloqueante; se cierra con evidencia; lista completa en `01 Proyectos/Marcos Metodologicos Freelance/Obligatorios de Auditoria por Proyecto.md`):
- [ ] Sync offline idempotente: la misma cola 3 veces no duplica puntos (e2e)
- [ ] Marcador solo por inserción de `Eventos`, nunca `UPDATE`
- [ ] Árbitro no anota en partido ajeno (token ajeno → 403/404)
- [ ] Swagger completo + colección con casos negativos
- [ ] Cortar la red a mitad del partido no pierde eventos (teléfono real)
- [ ] Marcador usable con una mano y al sol, en modo claro
<!-- auditores:fin -->
