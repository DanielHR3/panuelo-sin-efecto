// Clases compartidas del panel admin ("Transmisión de estadio"). Cadenas
// literales completas: Tailwind las encuentra al escanear este archivo.

/** Campo de texto/select sobre un `panel`. */
export const INPUT =
  "p-3 rounded-lg border-2 border-texto/20 bg-fondo text-texto font-normal focus:outline-none focus:border-panuelo-texto";

/** Etiqueta de formulario con su campo debajo. */
export const ETIQUETA = "flex flex-col gap-1.5 text-sm font-semibold";

/** Acción principal: el pañuelo amarillo. */
export const BOTON_PRIMARIO =
  "boton-panuelo px-5 py-3 disabled:opacity-50 transition-transform active:scale-95";

/** Acción secundaria neutra. */
export const BOTON_SECUNDARIO =
  "rounded-lg border border-texto/15 bg-panel-alterno text-texto font-display font-bold uppercase tracking-[0.06em] disabled:opacity-40 disabled:cursor-not-allowed";

/** Acción destructiva con texto: rojo `peligro` (≥ 4.5:1 en ambos modos). */
export const BOTON_PELIGRO =
  "rounded-lg border border-peligro/40 text-peligro font-display font-bold uppercase tracking-[0.06em] hover:bg-peligro/10 disabled:opacity-40 disabled:cursor-not-allowed";

/** Botón redondo solo-ícono para quitar un elemento de un chip. */
export const BOTON_QUITAR =
  "w-6 h-6 flex items-center justify-center rounded-full text-peligro hover:bg-peligro/10 text-sm";

/** Etiqueta pequeña en versalitas, como los encabezados de la tabla pública. */
export const ROTULO = "text-[11px] font-bold uppercase tracking-[0.12em] text-suave";

/** Título de página: condensada itálica en mayúsculas. */
export const TITULO_PAGINA = "titulo-estadio text-3xl sm:text-4xl leading-none";
