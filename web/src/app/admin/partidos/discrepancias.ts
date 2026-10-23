import type { Discrepancia } from "@/lib/types";

/**
 * Espejo de la regla de DiscrepanciasService.resolver: no se puede descartar
 * un lado si el otro ya no cuenta (anulado con ANULAR_EVENTO/UNDO o
 * descartado por otra discrepancia) — la jugada quedaría sin registrar.
 */
export function descarteBloqueado(d: Discrepancia, lado: "A" | "B"): boolean {
  const otro = lado === "A" ? d.eventoB : d.eventoA;
  return otro.anulado || otro.descartado;
}
