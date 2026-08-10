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
