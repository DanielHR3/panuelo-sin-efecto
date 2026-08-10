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
