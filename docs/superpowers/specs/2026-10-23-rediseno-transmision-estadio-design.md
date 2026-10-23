# Rediseño visual "Transmisión de estadio"

**Estado:** aprobado por el usuario (2026-10-23). Lo marcado *(decisión de Claude)* no lo pidió el usuario.

## Por qué

Al usuario no le gustan los colores actuales. Quiere que la app se vea "como un emparrillado de tocho", con íconos propios en toda la página y un logo que no sea una bandera genérica. De tres propuestas (lienzo https://claude.ai/artifact/YGAXDdG2YKsBQkAh21sUQc) eligió la **C · Transmisión de estadio**: azul de transmisión de tele, pasto a franjas, zonas de anotación pintadas con el color de cada equipo y el pañuelo amarillo como acento. Debe sentirse como una "liga profesional".

## Metas

1. Aplicar la identidad C a toda la web: landing y páginas públicas, `/arbitrar`, `/login`, `/mis-partidos`, el marcador del árbitro (`/partido/[id]`), `/resultado/[id]` y el panel `/admin`.
2. Logo nuevo: la **yarda 50** del campo, con el pañuelo amarillo cayendo sobre la línea. Reemplaza el `icon.svg` actual en favicon, íconos de la PWA (192, 512, maskable, apple-touch) y encabezados.
3. **Íconos propios en lugar de emojis.** Hoy hay unos 24 emojis distintos usados como íconos en 14 archivos (🏆 🏈 🛡 🔒 🏁 ⇄ ☀ 🌙 ✏ ⚠ 🏃 🦓 🔓 🚩 🔄 📤 📡 📝 🟨 👋 🖥 📊 ☰ ✕). Todos se cambian por un set propio de íconos SVG de trazo.

## No-metas

- Cambiar flujos, textos (salvo la etiqueta de un ícono), rutas o funcionalidad.
- Rediseñar la estructura de las pantallas. Se mantienen los layouts; cambian color, tipografía, íconos y acabados.
- Nuevas animaciones o ilustraciones grandes.

## Anti-metas (fallaría aunque se vea bonito)

- Que el marcador del árbitro se lea peor **a pleno sol**. El modo claro tiene que seguir funcionando y con buen contraste.
- Romper el modo oscuro o el claro en cualquier pantalla (`web/CLAUDE.md` exige ambos).
- Que quede algún emoji funcionando como ícono.
- Botones del árbitro más chicos. Las áreas táctiles grandes, la vibración y el bloqueo de pantalla no se tocan.
- Texto con contraste menor a 4.5:1, incluidas las etiquetas grises pequeñas.

## La identidad

**Tipografía:** *Barlow Condensed* (600/700, y 800 itálica para títulos y números del marcador) más *Barlow* (400–700) para el texto. Ambas se cargan con `next/font/google` y reemplazan a Outfit.

**Colores (tokens en `web/src/app/globals.css`):**

| Token | Oscuro | Claro *(decisión de Claude)* | Uso |
|---|---|---|---|
| fondo | `#0A1A33` (azul tele) | `#F4F6FA` (cal) | fondo de página |
| panel | `#13284A` | `#FFFFFF` | tarjetas y paneles |
| panel-alterno | `#102240` | `#EAF0F7` | filas alternas de tablas |
| texto | `#EEF2F8` | `#0A1A33` | texto principal |
| texto-suave | `#B8C4D6` | `#3D4F6B` | texto secundario (≥4.5:1 en ambos) |
| franja-1 / franja-2 | `#1E5631` / `#256B3D` | iguales | pasto a franjas (marcadores, logo) |
| pañuelo | `#FFD23F` | `#FFD23F` (botón) / `#8A6A00` (texto) | acento, botón principal, "En vivo" |
| local | `#3B82F6` | `#1D4ED8` | zona de anotación y panel del equipo local |
| visitante | `#EF4444` | `#B91C1C` | zona de anotación y panel del equipo visitante |

- El botón principal es pañuelo con texto azul tele, en ambos modos.
- El tema se sigue eligiendo con `next-themes`: sistema por defecto, con el botón de cambio que ya existe.
- Se elimina el efecto "glass" (desenfoque y transparencias) y se sustituye por paneles sólidos. Se lee mejor al sol *(decisión de Claude)*.

**Acabados:**
- Esquinas de 8–10 px, más rectas que hoy, como gráficos de transmisión.
- Títulos en mayúsculas condensadas itálicas.
- Marcadores con franjas de pasto, con la zona de anotación de cada equipo como banda lateral de su color y el nombre en vertical, como en el mockup.

## Íconos

- Un componente `Icono` en `web/src/components/icons/` con un `nombre` tipado. Todos los íconos son SVG de trazo en un `viewBox` de 24, `stroke="currentColor"`, con grosor 2 y extremos redondeados, para que hereden el color del texto.
- Set mínimo, tomado de los emojis actuales y del mockup: touchdown/balón, falta/pañuelo, campo, reloj, tabla, jugador, reglamento, compartir, trofeo (MVP), bandera a cuadros (finalizar), lápiz (corregir), intercambio, candado y candado abierto, sol, luna, alerta, árbitro (silbato), corredor (jugada), escudo (defensa), recargar, señal (sin conexión), menú, cerrar, saludo, monitor, gráfica.
- Los íconos decorativos llevan `aria-hidden`. Los botones que solo tienen ícono llevan `aria-label`.

## Logo

- Una versión SVG fuente de la yarda 50: franjas, línea central de cal, los números "5" y "0" y el pañuelo.
- Los números van **dibujados como trazos**, no como `<text>`, para que se vean igual en todos lados sin depender de fuentes.
- Los PNG de la PWA se generan a partir de ese SVG. El constructor elige la herramienta.

## Lo que se deja al constructor

- El dibujo exacto de cada ícono, dentro del estilo descrito.
- Cómo organizar los tokens en Tailwind v4, por ejemplo con `@theme`, sin romper las clases `dark:`.
- El orden de las pantallas y cómo dividir los commits.

## Verificación

- Capturas con Playwright a 390 px y a 1280 px, en modo claro y oscuro, de cada pantalla de la Meta 1. El marcador del árbitro se captura en estado en curso y finalizado.
- Revisar el contraste de las combinaciones de texto principales.
- Un `grep` final confirma que no queda ningún emoji como ícono en `web/src/app`.
