import type { Marcador, TipoEvento } from "./types";

/**
 * Puntos por tipo de evento. Debe coincidir exactamente con
 * backend/src/eventos/evento.constants.ts (PUNTOS_POR_TIPO) — es la
 * fuente de verdad; esto es solo para el cálculo optimista mientras el
 * árbitro está sin conexión. En cuanto se sincroniza, el marcador real que
 * devuelve el backend reemplaza a este.
 */
const PUNTOS_POR_TIPO: Partial<Record<TipoEvento, number>> = {
  TD: 6,
  PAT1: 1,
  PAT2: 2,
  SAFETY: 2,
  PICK_SIX: 6,
};

/** Espejo de ANULABLES en backend/src/eventos/evento.constants.ts. */
const ANULABLES: readonly TipoEvento[] = [
  "TD",
  "PAT1",
  "PAT2",
  "SAFETY",
  "PICK_SIX",
  "FALTA_PERSONAL",
  "EXPULSION",
  "INTERCEPCION",
  "SACK",
];

export function esAnulable(tipo: string): boolean {
  return (ANULABLES as readonly string[]).includes(tipo);
}

function puntosDe(tipo: string): number {
  return PUNTOS_POR_TIPO[tipo as TipoEvento] ?? 0;
}

export interface EventoParaMarcador {
  id: string;
  tipoEvento: string;
  equipoId: string | null;
  eventoAnuladoId?: string | null;
}

interface Anotado<T> {
  original: T;
  cancelado: boolean;
}

/**
 * Pila de cancelación de UNDO_LAST_ACTION y ANULAR_EVENTO. Mismo algoritmo
 * que backend/src/eventos/marcador.ts (marcarCancelaciones): ver ese archivo
 * para el detalle. Es el único lugar del web donde vive — calcularMarcador y
 * filtrarEventosVigentes la reutilizan para no divergir nunca.
 */
function marcarCancelaciones<T extends { id: string; tipoEvento: string; eventoAnuladoId?: string | null }>(
  eventos: T[],
): Anotado<T>[] {
  const pila: Anotado<T>[] = [];

  for (const ev of eventos) {
    if (ev.tipoEvento === "UNDO_LAST_ACTION") {
      for (let i = pila.length - 1; i >= 0; i--) {
        // Tope: un UNDO no atraviesa una reapertura.
        if (pila[i].original.tipoEvento === "REABRIR_PARTIDO") break;
        if (!pila[i].cancelado) {
          pila[i].cancelado = true;
          break;
        }
      }
      continue;
    }
    pila.push({ original: ev, cancelado: false });
  }
  // Segundo recorrido: las anulaciones vigentes cancelan a su objetivo anulable.
  for (const a of pila) {
    if (a.original.tipoEvento !== "ANULAR_EVENTO" || a.cancelado) continue;
    const objetivo = pila.find((b) => b.original.id === a.original.eventoAnuladoId);
    if (objetivo && esAnulable(objetivo.original.tipoEvento)) objetivo.cancelado = true;
  }
  return pila;
}

/** Deriva el marcador de la bitácora (cálculo optimista offline). */
export function calcularMarcador(
  eventos: EventoParaMarcador[],
  equipoLocalId: string,
  equipoVisitanteId: string,
): Marcador {
  let local = 0;
  let visitante = 0;
  for (const { original: ev, cancelado } of marcarCancelaciones(eventos)) {
    const puntos = puntosDe(ev.tipoEvento);
    if (cancelado || puntos === 0) continue;
    if (ev.equipoId === equipoLocalId) local += puntos;
    else if (ev.equipoId === equipoVisitanteId) visitante += puntos;
  }
  return { local, visitante };
}

/**
 * Subconjunto de la bitácora que sigue vigente (no deshecho por un UNDO ni
 * anulado), en el orden original. Espejo de filtrarEventosVigentes del backend.
 */
export function filtrarEventosVigentes<
  T extends { id: string; tipoEvento: string; eventoAnuladoId?: string | null },
>(eventos: T[]): T[] {
  return marcarCancelaciones(eventos)
    .filter((a) => !a.cancelado)
    .map((a) => a.original);
}
