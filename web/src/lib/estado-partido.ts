import type { EstadoPartido } from "./types";

export const ESTADO_LABEL: Record<EstadoPartido, string> = {
  PROGRAMADO: "Programado",
  EN_CURSO: "En curso",
  FINALIZADO: "Finalizado",
};

// Clases completas y literales a propósito: Tailwind escanea el código
// fuente en busca de nombres de clase tal cual aparecen, no de fragmentos
// construidos en tiempo de ejecución.
export const ESTADO_BADGE: Record<EstadoPartido, string> = {
  PROGRAMADO: "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300",
  EN_CURSO: "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400",
  FINALIZADO: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
};
