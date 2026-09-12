# Pañuelo sin efecto - Monorepo (AIDLC)

Este repositorio contiene el código fuente completo del proyecto "Pañuelo sin efecto", un sistema de arbitraje y gestión de ligas de Flag Football, construido bajo el Marco Metodológico AIDLC de la COEMERE.

## Estructura del Repositorio
- `/web`: Frontend (Aplicación Web Progresiva - PWA) construida con Next.js (App Router) y Tailwind CSS.
- `/backend`: API REST construida con NestJS y Prisma (PostgreSQL).

## Documentación y Fuente de Verdad
> **Nota de Gobernanza:** La documentación detallada, Historias de Usuario (HHU), y diagramas arquitectónicos de este proyecto viven en la Bóveda de Obsidian local del responsable técnico. No se desarrolla funcionalidad sin una Historia de Usuario aprobada.

## Principios Globales (AI Agents)
1. **Responsividad Absoluta (UXD):** Todo el desarrollo visual debe ser 100% responsivo.
2. **Offline-first:** El diseño del sistema debe priorizar la operación sin internet en el campo de juego.
3. **Caja Negra (Event Sourcing):** No se mutan los marcadores directamente; se registran eventos inmutables.

## Entorno local

Requisitos: Node 20+, Docker.

```bash
# 1. Base de datos (PostgreSQL 16 en el puerto 5433 del host)
docker compose up -d

# 2. API
cd backend
cp .env.example .env            # ajusta JWT_SECRET y SEED_SUPERADMIN_PASSWORD
npm install
npx prisma migrate dev          # aplica migraciones y genera el cliente
npm run start:dev               # http://localhost:3000 (Swagger en /docs)
                                # crea el SUPERADMIN al arrancar si SEED_SUPERADMIN_PASSWORD está en .env

# 3. Web
cd ../web
cp .env.example .env.local
npm install
npm run dev                     # http://localhost:3001 o el puerto que indique Next
```

Verificación antes de abrir un PR (lo mismo que corre el CI en `.github/workflows/ci.yml`):

```bash
cd backend && npm run lint && npm test && npm run test:e2e && npm run build
cd web && npm run lint && npm test && npm run build
```

## Despliegue (todo en planes gratuitos)

| Pieza | Servicio | Por qué |
|---|---|---|
| Base de datos | **Neon** (neon.tech) | PostgreSQL gratis sin caducidad. El Postgres gratis de Render se borra a los 30 días. |
| API | **Render** (Blueprint `render.yaml`, Docker) | Gratis; se duerme tras 15 min sin tráfico y tarda ~1 min en despertar. |
| Web | **Vercel** (*Root Directory* = `web`) | Gratis, HTTPS automático (requisito para instalar la PWA). |

Pasos, en orden:

1. Neon: crear proyecto `panuelo` y copiar la cadena de conexión (con `?sslmode=require`).
2. Render: *New → Blueprint* sobre este repo (rama `main`). Capturar `DATABASE_URL` (Neon). Dejar `CORS_ORIGINS` vacío el primer día. Al arrancar, el contenedor aplica `prisma migrate deploy` solo.
3. Superadmin inicial: definir `SEED_SUPERADMIN_PASSWORD` en las variables del servicio de Render. La API lo crea sola al arrancar (idempotente); no hace falta shell ni seed manual.
4. Vercel: importar el repo, *Root Directory* `web`, variable `NEXT_PUBLIC_API_URL` = URL pública de la API en Render.
5. Render: poner `CORS_ORIGINS` = URL de Vercel y volver a desplegar.
6. Opcional: un ping gratuito cada 10 min a la URL de la API (cron-job.org o UptimeRobot) para que no se duerma durante un partido.

El runbook detallado con verificación paso a paso y solución de problemas vive en la bóveda de Obsidian (`03_Gestion_Proyecto/06_Runbook_Despliegue_Gratis_y_Pruebas.md`).
