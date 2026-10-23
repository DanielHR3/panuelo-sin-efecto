import { esAnulable, filtrarEventosVigentes } from "@/lib/marcador";
import type { EstadoPartido, GameEvent } from "@/lib/types";

/**
 * Eventos que el árbitro puede anular al corregir un partido reabierto:
 * vigentes (misma pila de cancelación que el marcador) y de un tipo anulable
 * (jugadas y faltas, nunca control/UNDO/REABRIR/ANULAR), del más reciente al
 * más antiguo.
 */
export function eventosAnulables(eventos: GameEvent[]): GameEvent[] {
  return filtrarEventosVigentes(eventos)
    .filter((e) => esAnulable(e.tipoEvento))
    .reverse();
}

/** El partido está reabierto para corregir: EN_CURSO con un REABRIR_PARTIDO vigente. */
export function reabiertoParaCorregir(estado: EstadoPartido, eventos: GameEvent[]): boolean {
  return (
    estado === "EN_CURSO" &&
    filtrarEventosVigentes(eventos).some((e) => e.tipoEvento === "REABRIR_PARTIDO")
  );
}
