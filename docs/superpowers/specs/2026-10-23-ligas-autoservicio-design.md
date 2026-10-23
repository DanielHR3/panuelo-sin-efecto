# Ligas en autoservicio: registro, importación, cobro, reglamento y video

**Estado:** aprobado por el usuario (2026-10-23). Sale de una sesión
de brainstorming. Lo marcado *(decisión de Claude)* no lo pidió el usuario: es
un default razonable que puede rechazar.

## Por qué

Hoy no hay ninguna liga real en producción. Dar de alta una liga exige que el
superadmin capture todo a mano en `/admin` (liga → categorías → equipos →
jugadores → partidos). El usuario quiere que un organizador llegue solo, se
registre, cargue su liga completa desde un Excel, la pruebe un mes gratis y
después pague por usarla, sin depender de él. Así la plataforma puede
conseguir sus primeras ligas.

Además, en la prueba de campo del 2026-09-13 el usuario capturó el marcador al
revés y no pudo corregirlo después de finalizar. Eso se arregla primero.

## Metas

1. Corregir un partido ya finalizado sin romper la Caja Negra.
2. Una **liga demo** visible para que cualquiera vea cómo luce la plataforma.
3. **Registro público** de organizador + su liga, con **1 mes de prueba gratis**.
4. **Importar la liga desde Excel** (equipos, jugadores, calendario).
5. **Dos planes** con cobro por **SPEI manual** confirmado por el superadmin.
6. **Reglamento** consultable por liga; por defecto, IFAF Flag (5 vs 5).
7. **Video explicativo** animado con ManimGX y narración en español de México.

## No-metas

- Cobro automático (Mercado Pago, Conekta, Openpay, Stripe). Se hará cuando
  haya varias ligas pagando; el modelo de datos debe permitirlo sin rehacerse.
- Facturación (CFDI).
- Recuperación de contraseña por correo y verificación de email *(decisión de
  Claude: hoy no hay servicio de correo; queda para después)*.
- Buscador o versión navegable del reglamento. Es un complemento: un PDF o un
  enlace, nada más.
- Importar árbitros desde Excel *(decisión de Claude: los árbitros necesitan
  cuenta con email y contraseña; el organizador los da de alta en su panel,
  ver Parte 3)*.

## Anti-metas (fallaría aunque "funcione")

- Que un partido en curso se bloquee a media jugada porque venció la prueba o
  el pago. Un partido `EN_CURSO` siempre se puede terminar.
- Que vencer la prueba borre o esconda los datos de la liga.
- Corregir un marcador mutando `Partido.marcadorLocal/Visitante` o borrando
  eventos. Toda corrección entra como eventos nuevos (Caja Negra, ver
  `backend/CLAUDE.md`).
- Que la liga demo se confunda con una liga real o que un visitante pueda
  modificarla.
- Alojar el PDF de IFAF como si fuera nuestro (tiene derechos de autor).

## Restricciones del proyecto

- Monorepo: `backend/` (NestJS + Prisma + PostgreSQL en Neon, desplegado en
  Render free) y `web/` (Next.js App Router + Tailwind, en Vercel). Leer los
  `CLAUDE.md` de cada carpeta; el de `web/` advierte que su versión de Next.js
  difiere de lo conocido y hay que leer `node_modules/next/dist/docs/`.
- Render free tiene **disco efímero**: nada se puede guardar en el sistema de
  archivos del servidor.
- Neon free: 0.5 GB de almacenamiento.
- Swagger en cada endpoint, DTOs con `class-validator`, lógica en servicios.
- Mobile-first, modo claro y oscuro, áreas táctiles grandes.
- Roles actuales: `SUPERADMIN`, `LIGA_ADMIN`, `ARBITRO` (string en
  `Usuario.rol`). Las ligas tienen `tipo` `LIGA` o `RAPIDA` (partido rápido sin
  cuenta, HU-2.7; no aparecen en la landing).

---

## Parte 1 — Corregir un partido finalizado

**Problema hoy:** `eventos.service.ts → resolverTransicionEstado` rechaza
cualquier evento si el partido está `FINALIZADO`, y el deshacer
(`UNDO_LAST_ACTION`) solo cancela el último evento, uno a la vez.

**Diseño:**

- Evento nuevo **`REABRIR_PARTIDO`**: es el único evento aceptado en
  `FINALIZADO` y regresa el estado a `EN_CURSO`. Se registra en la Caja Negra
  como cualquier otro.
- Evento nuevo **`ANULAR_EVENTO`** con una columna nueva y nullable
  `EventoPartido.eventoAnuladoId`: excluye del marcador un evento puntual (no
  solo el último). `calcularMarcador` (backend y su copia en web) lo procesa
  igual que procesa `UNDO_LAST_ACTION`: como un evento más que cancela a otro.
  Solo se permite con el partido reabierto.
- Reglas de cancelación *(decisión de Claude)*, todas dentro de
  `marcarCancelaciones` (`backend/src/eventos/marcador.ts`) y su copia en web:
  `ANULAR_EVENTO` solo puede apuntar a eventos que anotan o a faltas, nunca a
  un `UNDO_LAST_ACTION`, a otro `ANULAR_EVENTO` ni a eventos de control
  (`INICIO_MITAD`, `FIN_MITAD`, `REABRIR_PARTIDO`). `UNDO_LAST_ACTION` sí puede
  deshacer un `ANULAR_EVENTO` (el árbitro anuló el evento equivocado), pero
  nunca cancela `REABRIR_PARTIDO` ni el `FIN_MITAD` previo a la reapertura.
  `filtrarEventosVigentes` aplica las mismas reglas, así que marcador,
  estadísticas públicas y detección de discrepancias quedan consistentes.
- Para volver a cerrar, el árbitro manda `FIN_MITAD`. La regla actual ("si ya
  hubo un `FIN_MITAD`, el siguiente finaliza") ya lo cubre. Al refinalizar se
  vuelve a correr la detección de discrepancias (HU-2.6); su
  `@@unique([eventoAId, eventoBId])` ya evita duplicados.
- **Quién puede reabrir:** el dueño de la liga y el superadmin, en cualquier
  momento; cualquier árbitro **asignado** al partido (la misma regla de
  `assertPuedeRegistrar`, que incluye al invitado sin cuenta en su partido
  rápido), hasta **48 h** después del timestamp del último `FIN_MITAD`
  *(decisión de Claude sobre el plazo; no hace falta columna nueva)*.
- **UI:** en el marcador de un partido finalizado aparece el botón "Corregir
  resultado" → confirma → muestra la lista de eventos con "Anular" en cada
  anotación, más los botones normales para registrar los eventos correctos.
  Después, "Finalizar de nuevo".
- **Atajo para partidos rápidos** *(decisión de Claude)*: en ligas `RAPIDA`,
  "Los equipos estaban al revés" intercambia los **nombres** de los dos
  `Equipo` (que en un partido rápido son exclusivos de ese partido; **el
  constructor debe verificarlo** en `rapido.service.ts` antes de implementarlo).
  Es exactamente el error del 13 de septiembre y no toca eventos. Si los
  equipos resultan compartidos entre partidos, se omite el atajo.
- El resultado público (`/resultado/:id`) y las estadísticas toman los datos
  corregidos sin cambios extra, porque ya se calculan desde los eventos.

## Parte 2 — Liga demo

- Una liga normal (`tipo: 'LIGA'`) con una columna nueva `Liga.esDemo Boolean
  @default(false)`. Tiene 2 categorías (Varonil y Femenil), 4 equipos por
  categoría, 8 jugadores por equipo, una jornada ya jugada con eventos reales
  (para que se vean tabla, líderes, MVP y resultado compartible) y una jornada
  programada.
- La crea un script idempotente (`npm run seed:demo` en `backend/`) que no
  duplica si se corre dos veces. En producción se corre una vez a mano contra
  Neon *(decisión de Claude: el superadmin ya se crea al arrancar, pero la
  demo no debe recrearse en cada deploy)*.
- La liga demo es del superadmin, tiene plan `CORTESIA` (ver Parte 5) y en la
  landing aparece primero con la etiqueta **"Demo"** y el texto "Liga de
  ejemplo, los datos son ficticios".
- Los nombres de equipos y jugadores son inventados y genéricos (sin marcas ni
  personas reales).

## Parte 3 — Registro del organizador

- Página pública **`/registro`** con: nombre, email, contraseña y nombre de la
  liga, más una categoría inicial (texto libre, por defecto "Varonil").
- Endpoint público `POST /registro` que, en una transacción, crea el
  `Usuario` (`LIGA_ADMIN`), la `Liga`, la `Categoria` y la suscripción en
  prueba (Parte 5), y devuelve la sesión iniciada (mismo JWT que el login).
- Al terminar lo lleva a `/admin`, con un panel de bienvenida que tiene tres
  pasos: "Sube tu Excel", "Da de alta a tus árbitros" y "Revisa tu
  reglamento", y una barra que dice cuántos días de prueba le quedan.
- Enlaces a `/registro` desde la landing ("Registra tu liga, 1 mes gratis"),
  desde el login y desde la liga demo.
- Antiabuso mínimo *(decisión de Claude)*: límite de intentos por IP en
  `POST /registro` y email único (ya existe `@unique`).

**Árbitros por liga y aislamiento entre ligas (prerrequisito de abrir el
registro).** Hoy solo el `SUPERADMIN` puede crear usuarios (`POST /usuarios`),
`GET /usuarios?rol=ARBITRO` devuelve **todos** los árbitros del sistema a
cualquier `LIGA_ADMIN`, y `GET /ligas` es público y lista todas las ligas. Con
registro abierto, cualquier desconocido vería nombres y emails de árbitros
ajenos. Por eso, antes del registro público:

- Relación nueva árbitro ↔ liga (`Usuario.ligaArbitroId` nullable)
  *(decisión de Claude: una cuenta de árbitro pertenece a una sola liga; si una
  persona arbitra en dos ligas, tiene dos cuentas)*.
- El `LIGA_ADMIN` puede crear árbitros solo en sus ligas, y listar, asignar y
  ver únicamente los de sus ligas. Los invitados nunca aparecen en esas listas.
- `GET /ligas` deja de ser público: el `LIGA_ADMIN` ve solo las suyas y el
  `SUPERADMIN` todas. Lo público sigue en `/publico/*`.
- En la web, `/admin/arbitros` se habilita para el `LIGA_ADMIN`.

## Parte 4 — Importar la liga desde Excel

- **Formato:** solo `.xlsx`. Quien use Google Sheets descarga su hoja como
  `.xlsx` (Archivo → Descargar), y la pantalla lo explica *(decisión de
  Claude: un solo formato evita pedir 3 CSV sueltos)*.
- **Plantilla descargable** (`/plantilla-liga.xlsx`) con tres hojas e
  instrucciones en la primera fila:
  - `Equipos`: Categoría, Equipo, Color (opcional).
  - `Jugadores`: Categoría, Equipo, Nombre, Número.
  - `Calendario`: Categoría, Fecha (dd/mm/aaaa), Hora (hh:mm), Local,
    Visitante. La dificultad se toma por defecto como `REGULAR`.
- **Flujo en dos pasos:** (1) se sube el archivo y el backend devuelve una
  **vista previa**: qué se va a crear y una lista de errores por hoja y fila
  ("Jugadores, fila 14: el equipo 'Toros' no existe en Equipos"). (2) Si no
  hay errores, "Confirmar" crea todo en **una sola transacción**: todo o nada.
- **Volver a subir el archivo no duplica nada** *(decisión de Claude)*. Las
  categorías que no existen se crean. Equipos: se reutilizan si ya existe uno
  con el mismo nombre en la categoría (sin distinguir mayúsculas). Jugadores:
  si ya hay un jugador con el mismo número en ese equipo, se actualiza su
  nombre; si no, se crea. Partidos: si ya existe uno con la misma categoría,
  fecha y hora, local y visitante, se omite. Nada se borra: lo que está en la
  base y no en el Excel se queda. La vista previa muestra por separado qué se
  crea, qué se actualiza y qué se omite.
- Zona horaria del calendario: `America/Mexico_City`.
- Librería sugerida: `exceljs` en el backend. El archivo se procesa en memoria
  y no se guarda. Tamaño máximo: 2 MB.
- Solo en plan `COMPLETO` (y en la prueba, que es completo).

## Parte 5 — Planes y cobro por SPEI manual

**Planes (precios en MXN, IVA incluido, según lo acordado con el usuario):**

| Plan | Precio | Incluye |
|---|---|---|
| `ARBITRAJE` | $99/mes | Captura en vivo, partidos, árbitros, resultado compartible, reglamento IFAF por defecto. La liga **no** aparece en la landing pública ni tiene tabla ni estadísticas públicas. Sin importación desde Excel. |
| `COMPLETO` | $299/mes | Todo lo anterior + página pública con tabla y estadísticas, importación desde Excel y reglamento propio en PDF. |
| Prueba | 30 días gratis | Equivale a `COMPLETO`. Empieza al registrarse y no pide datos de pago. |
| `CORTESIA` | — | Ligas creadas por el superadmin y la demo. Sin vencimiento. |

- **La suscripción es por liga y la prueba es por organizador** (lo decidió el
  usuario): cada liga paga su propio plan, y los 30 días gratis solo se dan en
  la **primera** liga de cada organizador. Si un `LIGA_ADMIN` crea otra liga
  con `POST /ligas`, esta nace en `VENCIDA`: visible, pero sin poder capturar
  hasta que se pague.
- Pago anual = 10 meses *(decisión de Claude, se puede quitar)*.
- Las ligas `RAPIDA` no tienen suscripción ni restricciones.
- Las ligas que ya existían antes de esta función se migran como `CORTESIA`.

**Modelo de datos (nuevo):**

- `Suscripcion` (1 a 1 con `Liga`): `plan`, `pruebaHasta`, `pagadoHasta`.
  El **estado se calcula**, no se guarda: `PRUEBA` si hoy ≤ `pruebaHasta`;
  `ACTIVA` si hoy ≤ `pagadoHasta`; si no, `VENCIDA`; `CORTESIA` no vence.
- `Pago`: `ligaId`, `plan`, `periodo` (`MENSUAL`/`ANUAL`), `montoCentavos`,
  `referencia` (única y corta, p. ej. `PSE-7K3Q9A`), `estado` (`PENDIENTE`,
  `CONFIRMADO`, `RECHAZADO`), comprobante opcional, `confirmadoPorId`,
  fechas. Al confirmar, `pagadoHasta` se extiende desde `max(hoy,
  pagadoHasta)` y se fija el plan pagado.
- Precios y datos bancarios en configuración, no en código: variables de
  entorno `PAGO_CLABE`, `PAGO_BANCO`, `PAGO_BENEFICIARIO`. **El usuario
  tiene que dar su CLABE** antes de salir a producción.

**Flujo del organizador** (`/admin/plan`): ve su plan, los días restantes y
el botón "Pagar". Elige plan y periodo; la pantalla muestra monto, CLABE,
beneficiario y su referencia ("escríbela en el concepto de la
transferencia"). Puede subir una foto o un PDF del comprobante (opcional,
máximo 2 MB). El pago queda `PENDIENTE`.

**Flujo del superadmin** (`/admin/pagos`): lista de pagos pendientes con
liga, monto, referencia y comprobante. Botones "Confirmar" y "Rechazar" (con
motivo). Por ahora no hay notificación por correo; el organizador ve el
cambio en `/admin/plan`.

**Qué pasa al vencer (`VENCIDA`):**

- Todo se puede ver: panel, página pública si era `COMPLETO`, historial.
- No se pueden crear partidos, equipos, jugadores ni importaciones, ni
  **iniciar** un partido `PROGRAMADO`.
- Un partido ya `EN_CURSO` se puede terminar y corregir.
- Se aplica en el backend (un guard o un servicio de "permisos de plan" que
  usen los endpoints de escritura), no solo escondiendo botones.
- Lo mismo aplica a lo que el plan `ARBITRAJE` no incluye: la API rechaza la
  importación y la subida de reglamento. En lo público, hoy solo
  `PublicoService.resumen()` filtra por `tipo: 'LIGA'`. Con esta parte:
  `GET /publico/resumen` (landing), `GET /publico/categorias/:id` y
  `GET /publico/jugadores/:id` devuelven solo ligas cuyo plan efectivo incluye
  página pública (prueba, `COMPLETO` o `CORTESIA`); para las demás responden
  404. `GET /publico/partidos/:id` (`/resultado/:id`) sigue sirviendo a todas,
  `RAPIDA` y `ARBITRAJE` incluidas, porque el resultado compartible es parte de
  ambos planes.
- **Cambios de plan y fin de prueba** *(decisión de Claude, sin prorrateo)*:
  el plan pagado se aplica en cuanto el superadmin confirma el pago, y
  `pagadoHasta` se extiende desde `max(hoy, pagadoHasta)`. Si alguien con
  tiempo de `COMPLETO` paga `ARBITRAJE`, baja de plan ese mismo día y el tiempo
  se suma; el sistema lo advierte antes de que pague. Si la prueba termina sin
  pago, el plan queda en `COMPLETO` con estado `VENCIDA`, y lo público se
  oculta igual que en `ARBITRAJE`.

**Archivos subidos** (comprobantes y reglamentos): como Render no tiene disco
persistente, se guardan en Postgres en una tabla `Archivo` (bytes, tipo MIME,
tamaño) con límites estrictos *(decisión de Claude: evita abrir una cuenta de
almacenamiento externo; con decenas de ligas cabe en el 0.5 GB de Neon. Si
crece, se mueve a un almacenamiento externo detrás de la misma tabla)*.

## Parte 6 — Reglamento

- Toda liga muestra por defecto la tarjeta **"Reglamento IFAF Flag Football
  (edición 2023)"**. Es la edición vigente de flag: IFAF no publicó reglas de
  flag nuevas para 2026, y las "IFAF Football Rules 2026" son del fútbol con
  equipo. La Olimpiada Nacional 2025 en México juega 5 vs 5 con IFAF 2023.
  - Trae un **enlace a la fuente oficial** de IFAF (el constructor confirma la
    URL vigente en americanfootball.sport) y un **resumen corto escrito por
    nosotros** con las reglas clave de 5 vs 5: campo, duración, anotaciones y
    sus puntos, conversiones, faltas comunes y tiempos fuera. Es texto propio,
    sin copiar el reglamento.
  - El texto del resumen vive en el repo (`web/`) y no en la base de datos.
- En plan `COMPLETO`, el organizador puede **subir su propio reglamento en
  PDF** (máximo 10 MB) desde `/admin/reglamento`. Si lo sube, reemplaza a la
  tarjeta IFAF en su liga y puede quitarlo para volver a la de IFAF.
- **Dónde se consulta:** en la página pública de la liga (si es `COMPLETO`) y
  con un botón "Reglamento" en la pantalla del árbitro, que abre el PDF o la
  tarjeta en una pestaña nueva.

## Parte 7 — Video explicativo

- Animación de 60 a 90 segundos hecha con **ManimGX** (motor compatible con
  la API de Manim CE; se instala con `pip install manimgx`). El constructor
  debe confirmar en su documentación qué partes de la API de Manim CE
  soporta.
- Guion en 6 escenas: el problema (marcadores en papel), registro con prueba
  gratis, subir el Excel, el árbitro anota desde el celular, resultados,
  tabla y compartir, y el reglamento y los planes. Cierra con la URL.
- **Voz:** español de México, sintética. Por defecto, la voz "Paulina" de
  macOS (`say -v Paulina`), que no requiere cuentas *(decisión de Claude;
  suena algo robótica. Si el usuario quiere una voz más natural, se cambia a
  un servicio de voz con IA, que requiere cuenta)*. Los subtítulos se
  incrustan en el video.
- Código del video en `video/` en la raíz del repo (Python, separado de
  `backend/` y `web/`). El `.mp4` final no se versiona en git.
- Se publica en la landing con un botón "Ver cómo funciona" (servido desde
  `web/public/` si pesa menos de 10 MB; si no, desde YouTube).
- Se hace al final, cuando las pantallas ya existen, para que el video
  muestre el producto real.

## Orden de construcción

1. Corregir partido finalizado (Parte 1).
2. Liga demo (Parte 2).
3. Árbitros por liga y aislamiento entre ligas (Parte 3, prerrequisito).
4. Registro del organizador + suscripción en prueba (Parte 3 y el modelo de
   datos de la Parte 5).
5. Importación desde Excel (Parte 4).
6. Pagos SPEI y restricciones por plan (Parte 5).
7. Reglamento (Parte 6).
8. Video (Parte 7).

Cada parte se entrega como su propio PR contra `main` *(no apilados: en este
repo, cerrar un PR apilado con `--delete-branch` cerró el siguiente)*, con
pruebas, y se despliega antes de empezar la siguiente.

## Lo que se deja al constructor

- Nombres exactos de endpoints, componentes y migraciones.
- Diseño visual de las pantallas nuevas, dentro del estilo actual del panel y
  la landing.
- El contenido de la liga demo (nombres, resultados), respetando lo descrito.
- La redacción del resumen del reglamento y del guion del video.
- Cómo generar la referencia de pago, siempre que sea única y fácil de
  dictar.
