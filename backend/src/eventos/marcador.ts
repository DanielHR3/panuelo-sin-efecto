import { puntosDe } from './evento.constants';

export interface EventoParaMarcador {
  tipoEvento: string;
  equipoId: string | null;
}

export interface Marcador {
  local: number;
  visitante: number;
}

/**
 * Deriva el marcador reduciendo la bitácora inmutable de eventos (Caja Negra).
 *
 * UNDO_LAST_ACTION no borra nada: se procesa como un evento más que marca como
 * "cancelado" el último evento aún vigente (anote o no). Así el árbitro puede
 * deshacer también timeouts o faltas, no solo anotaciones, sin perder el
 * registro. Undos consecutivos cancelan hacia atrás; un undo sin nada que
 * cancelar es un no-op.
 */
export function calcularMarcador(
  eventos: EventoParaMarcador[],
  equipoLocalId: string,
  equipoVisitanteId: string,
): Marcador {
  const pila: {
    equipoId: string | null;
    puntos: number;
    cancelado: boolean;
  }[] = [];

  for (const ev of eventos) {
    if (ev.tipoEvento === 'UNDO_LAST_ACTION') {
      for (let i = pila.length - 1; i >= 0; i--) {
        if (!pila[i].cancelado) {
          pila[i].cancelado = true;
          break;
        }
      }
      continue;
    }
    pila.push({
      equipoId: ev.equipoId,
      puntos: puntosDe(ev.tipoEvento),
      cancelado: false,
    });
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
