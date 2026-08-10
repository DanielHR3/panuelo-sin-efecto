# Guía de IA (CLAUDE.md) - Backend (API REST)

## Stack Tecnológico
- NestJS.
- Prisma ORM.
- SQLite (Desarrollo) / PostgreSQL (Producción).
- TypeScript.

## Reglas de Arquitectura y Patrones
1. **Event Sourcing (Caja Negra):** Las puntuaciones y sucesos del partido **NO** se mutan con operaciones UPDATE en el marcador. Se registran insertando en una tabla de `Eventos` (con su timestamp y tipo de evento). El marcador se calcula reduciendo/sumando estos eventos.
2. **Validación:** Uso riguroso de `class-validator` y `class-transformer` en los DTOs.
3. **Documentación:** Cada endpoint debe estar perfectamente decorado con Swagger (`@nestjs/swagger`) para que los agentes de IA que programan el frontend puedan leer el contrato.
4. **Controladores Limpios:** Toda la lógica de negocio pesada va en los Servicios, no en los Controladores.
5. **Idempotencia:** Los endpoints de sincronización offline deben ser idempotentes para evitar duplicar puntos si el celular del árbitro reintenta el envío de la cola de eventos.
