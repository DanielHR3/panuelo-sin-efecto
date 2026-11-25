# Guía de IA (CLAUDE.md) - Backend (API REST)

## Stack Tecnológico
- NestJS.
- Prisma ORM.
- PostgreSQL en todos los entornos (en desarrollo, vía `docker compose up -d` desde la raíz; ver `backend/.env.example`).
- TypeScript.

## Reglas de Arquitectura y Patrones
1. **Event Sourcing (Caja Negra):** Las puntuaciones y sucesos del partido **NO** se mutan con operaciones UPDATE en el marcador. Se registran insertando en una tabla de `Eventos` (con su timestamp y tipo de evento). El marcador se calcula reduciendo/sumando estos eventos.
2. **Validación:** Uso riguroso de `class-validator` y `class-transformer` en los DTOs.
3. **Documentación:** Cada endpoint debe estar perfectamente decorado con Swagger (`@nestjs/swagger`) para que los agentes de IA que programan el frontend puedan leer el contrato.
4. **Controladores Limpios:** Toda la lógica de negocio pesada va en los Servicios, no en los Controladores.
5. **Idempotencia:** Los endpoints de sincronización offline deben ser idempotentes para evitar duplicar puntos si el celular del árbitro reintenta el envío de la cola de eventos.

---

<!-- auditores:inicio -->
## 🛡️ Auditores del proyecto

Skills `auditor-*` en `~/.claude/skills/` (fuente: bóveda `01 Proyectos/Auditores/`; ciclo en `01 Proyectos/Marcos Metodologicos Freelance/Sistema de Auditoria y Calidad.md`). Los auditores **ponen a prueba, no corrigen**: exigen evidencia y emiten veredicto (Listo · Ajustes puntuales · Iteración profunda).

| Momento | Auditor | Qué entregarle |
|---|---|---|
| Al exponer o consumir endpoints | `auditor-api` | URL base, contrato/OpenAPI y colección Postman con casos negativos (sin token, token ajeno, id inexistente, página fuera de rango) |
| Antes de producción (servidor y datos) | `auditor-seguridad` | Código, `.env.example`, permisos por ruta, migraciones, RLS/roles probados con usuario ajeno, respaldo **restaurado** (R5) |
| Al cambiar esquema o permisos de BD | `auditor-seguridad` + `auditor-api` | Migraciones versionadas, índices de paginación, `updated_at`/baja lógica, bitácora solo-inserción, seeds ficticios |

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
