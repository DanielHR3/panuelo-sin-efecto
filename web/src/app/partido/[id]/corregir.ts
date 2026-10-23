import { esAnulable, filtrarEventosVigentes } from "@/lib/marcador";
import type { EstadoPartido, GameEvent } from "@/lib/types";

/**
 * Vigencia sobre la bitácora SIN los eventos descartados al resolver una
 * discrepancia — igual que el servidor, que arma la pila de cancelación
 * solo con `descartado: false`. GET /partidos/:id/eventos sí los devuelve.
 */
function vigentes(eventos: GameEvent[]): GameEvent[] {
  return filtrarEventosVigentes(eventos.filter((e) => !e.descartado));
}

/**
 * Eventos que el árbitro puede anular al corregir un partido reabierto:
 * vigentes (misma pila de cancelación que el marcador) y de un tipo anulable
 * (jugadas y faltas, nunca control/UNDO/REABRIR/ANULAR), del más reciente al
 * más antiguo.
 */
export function eventosAnulables(eventos: GameEvent[]): GameEvent[] {
  return vigentes(eventos)
    .filter((e) => esAnulable(e.tipoEvento))
    .reverse();
}

/** El partido está reabierto para corregir: EN_CURSO con un REABRIR_PARTIDO vigente. */
export function reabiertoParaCorregir(estado: EstadoPartido, eventos: GameEvent[]): boolean {
  return (
    estado === "EN_CURSO" &&
    vigentes(eventos).some((e) => e.tipoEvento === "REABRIR_PARTIDO")
  );
}

/**
 * Un UNDO no atraviesa una reapertura: si el último evento vigente es el
 * REABRIR_PARTIDO, deshacer sería un no-op en el servidor.
 */
export function undoSinEfecto(eventos: GameEvent[]): boolean {
  const v = vigentes(eventos);
  return v.length > 0 && v[v.length - 1].tipoEvento === "REABRIR_PARTIDO";
}
