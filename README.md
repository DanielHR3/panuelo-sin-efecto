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
npx prisma db seed              # crea el SUPERADMIN inicial
npm run start:dev               # http://localhost:3000 (Swagger en /docs)

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

## Despliegue

- **API + base de datos (Render):** `render.yaml` en la raíz es un Blueprint que crea el servicio `panuelo-api` (Docker, `backend/Dockerfile`) y la base `panuelo-db`. Al arrancar, el contenedor aplica `prisma migrate deploy` antes de levantar el servidor. Falta capturar en el panel `CORS_ORIGINS` con la URL pública de la web.
- **Web (Vercel):** importar el repo con *Root Directory* = `web` y definir `NEXT_PUBLIC_API_URL` con la URL pública de la API.
- **Seed en producción:** una sola vez, desde la shell del servicio: `SEED_SUPERADMIN_PASSWORD=... npx prisma db seed`.
