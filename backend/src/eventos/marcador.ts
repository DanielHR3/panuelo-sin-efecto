import { puntosDe } from './evento.constants';

export interface EventoParaMarcador {
  id: string;
  tipoEvento: string;
  equipoId: string | null;
  eventoAnuladoId?: string | null;
}

export interface EventoConId {
  id: string;
  tipoEvento: string;
  eventoAnuladoId?: string | null;
}

export interface Marcador {
  local: number;
  visitante: number;
}

interface Anotado<T> {
  original: T;
  cancelado: boolean;
}

/**
 * Recorre la bitácora en orden y arma la pila de cancelación de
 * UNDO_LAST_ACTION y ANULAR_EVENTO, sin borrar nada (Caja Negra):
 * - Cada UNDO marca "cancelado" al último evento (de cualquier tipo, no solo
 *   de jugada) que aún no lo estuviera. Tiene un tope: si hacia atrás
 *   encuentra un REABRIR_PARTIDO antes de dar con un candidato, no cancela
 *   nada (no-op). Nunca cancela un REABRIR_PARTIDO ni lo que hay antes.
 * - Cada ANULAR_EVENTO no cancelado marca "cancelado" al evento cuyo id es
 *   `eventoAnuladoId` (en cualquier posición); un id inexistente es no-op.
 *   Como el propio ANULAR_EVENTO está en la pila, un UNDO posterior lo
 *   cancela y con ello restituye el evento anulado.
 *
 * Es el ÚNICO lugar donde vive esta lógica — tanto
 * `calcularMarcador` como `filtrarEventosVigentes` la reutilizan para que
 * nunca puedan divergir sobre qué evento quedó cancelado (HU-2.6, finding 1:
 * si divergieran, una discrepancia podría emparejar un evento que el
 * marcador ya considera cancelado y un admin podría descartar el evento
 * real por error).
 */
function marcarCancelaciones<
  T extends {
    id?: string;
    tipoEvento: string;
    eventoAnuladoId?: string | null;
  },
>(eventos: T[]): Anotado<T>[] {
  const pila: Anotado<T>[] = [];
  for (const ev of eventos) {
    if (ev.tipoEvento === 'UNDO_LAST_ACTION') {
      for (let i = pila.length - 1; i >= 0; i--) {
        if (pila[i].original.tipoEvento === 'REABRIR_PARTIDO') break;
        if (!pila[i].cancelado) {
          pila[i].cancelado = true;
          break;
        }
      }
      continue;
    }
    pila.push({ original: ev, cancelado: false });
  }
  // Segundo recorrido: las anulaciones que sobrevivieron a los UNDO cancelan
  // al evento al que apuntan.
  for (const a of pila) {
    if (a.original.tipoEvento !== 'ANULAR_EVENTO' || a.cancelado) continue;
    const objetivo = pila.find(
      (b) => b.original.id === a.original.eventoAnuladoId,
    );
    if (objetivo) objetivo.cancelado = true;
  }
  return pila;
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
  const anotados = marcarCancelaciones(eventos);

  let local = 0;
  let visitante = 0;
  for (const { original: ev, cancelado } of anotados) {
    if (cancelado) continue;
    const puntos = puntosDe(ev.tipoEvento);
    if (puntos === 0) continue;
    if (ev.equipoId === equipoLocalId) local += puntos;
    else if (ev.equipoId === equipoVisitanteId) visitante += puntos;
  }
  return { local, visitante };
}

/**
 * Devuelve el subconjunto de `eventos` que sigue vigente — no cancelado por
 * un UNDO_LAST_ACTION posterior ni anulado por un ANULAR_EVENTO — usando la MISMA pila de cancelación que
 * `calcularMarcador` (ver `marcarCancelaciones`).
 *
 * Opera sobre la bitácora COMPLETA, incluyendo eventos no-jugada (TIMEOUT,
 * INICIO_MITAD, FIN_MITAD): la pila de cancelación de `calcularMarcador`
 * incluye cualquier evento no-undo, así que filtrar solo eventos de jugada
 * antes de llamar a esta función daría una pila distinta (y una respuesta
 * distinta) a la que usa el marcador real.
 *
 * Se usa para alimentar `detectarDiscrepancias` (HU-2.6, finding 1) con
 * solo los eventos que todavía cuentan para el marcador — un evento ya
 * deshecho por su propio árbitro no debería poder emparejarse como
 * "posible duplicado" de otro.
 */
export function filtrarEventosVigentes<T extends EventoConId>(
  eventos: T[],
): T[] {
  return marcarCancelaciones(eventos)
    .filter((a) => !a.cancelado)
    .map((a) => a.original);
}
