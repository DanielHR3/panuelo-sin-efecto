import type { EstadoPartido } from "./types";

export const ESTADO_LABEL: Record<EstadoPartido, string> = {
  PROGRAMADO: "Programado",
  EN_CURSO: "En curso",
  FINALIZADO: "Finalizado",
};

// Clases completas y literales a propósito: Tailwind escanea el código
// fuente en busca de nombres de clase tal cual aparecen, no de fragmentos
// construidos en tiempo de ejecución. Mismo esquema que /mis-partidos: en
// juego es el pañuelo amarillo; el resto, neutros sobre los tokens.
export const ESTADO_BADGE: Record<EstadoPartido, string> = {
  PROGRAMADO: "border border-texto/20 text-suave",
  EN_CURSO: "bg-panuelo text-[#0A1A33]",
  FINALIZADO: "bg-panel-alterno text-texto border border-texto/10",
};

/** Forma común de la insignia de estado. */
export const ESTADO_BADGE_BASE =
  "px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-[0.08em] shrink-0";
