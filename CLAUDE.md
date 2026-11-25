# Guía de IA (CLAUDE.md) - Monorepo Root

## Comandos Útiles del Monorepo
- Instalar dependencias globales: `npm install` (en cada subcarpeta).
- Levantar todo (Próximamente con Turborepo/Concurrently, por ahora manual).

## Reglas de Arquitectura
- El proyecto sigue el **Marco Metodológico AIDLC** de la COEMERE.
- Mantenemos estricta separación de responsabilidades entre el frontend (`/web`) y el backend (`/backend`).

(Consulta los archivos `CLAUDE.md` dentro de `/web` y `/backend` para reglas específicas de cada ecosistema).

---

<!-- auditores:inicio -->
## 🛡️ Auditores del proyecto

Skills `auditor-*` en `~/.claude/skills/` (fuente: bóveda `01 Proyectos/Auditores/`; ciclo en `01 Proyectos/Marcos Metodologicos Freelance/Sistema de Auditoria y Calidad.md`). Los auditores **ponen a prueba, no corrigen**: exigen evidencia y emiten veredicto (Listo · Ajustes puntuales · Iteración profunda).

| Momento | Auditor | Qué entregarle |
|---|---|---|
| Antes de presentar propuesta, plan o reporte | `auditor-critico` | El documento |
| Antes de fijar logo, favicon o icono de la app | `auditor-logos` | Archivos, dónde aparecen y con qué marcas conviven |
| Al terminar una pantalla o flujo (escritorio + `390px` / dispositivo) | `auditor-ux` | URL o capturas, rol y tarea crítica; estados carga/vacío/error |
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
