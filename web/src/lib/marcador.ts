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

function puntosDe(tipo: string): number {
  return PUNTOS_POR_TIPO[tipo as TipoEvento] ?? 0;
}

export interface EventoParaMarcador {
  tipoEvento: string;
  equipoId: string | null;
}

/** Mismo algoritmo que backend/src/eventos/marcador.ts: ver ese archivo para el detalle de UNDO_LAST_ACTION. */
export function calcularMarcador(
  eventos: EventoParaMarcador[],
  equipoLocalId: string,
  equipoVisitanteId: string,
): Marcador {
  const pila: { equipoId: string | null; puntos: number; cancelado: boolean }[] = [];

  for (const ev of eventos) {
    if (ev.tipoEvento === "UNDO_LAST_ACTION") {
      for (let i = pila.length - 1; i >= 0; i--) {
        if (!pila[i].cancelado) {
          pila[i].cancelado = true;
          break;
        }
      }
      continue;
    }
    pila.push({ equipoId: ev.equipoId, puntos: puntosDe(ev.tipoEvento), cancelado: false });
  }

  let local = 0;
  let visitante = 0;
  for (const e of pila) {
    if (e.cancelado || e.puntos === 0) continue;
    if (e.equipoId === equipoLocalId) local += e.puntos;
    else if (e.equipoId === equipoVisitanteId) visitante += e.puntos;
  }
  return { local, visitante };
}
