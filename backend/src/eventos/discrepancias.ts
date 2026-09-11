import type { TipoEvento } from './evento.constants';

/** Ventana de tiempo para considerar dos eventos "la misma jugada" (HU-2.6). */
const VENTANA_MS = 30_000;

/** Eventos "de jugada": lo único que tiene sentido reconciliar. Excluye
 * eventos de control (INICIO_MITAD, FIN_MITAD, TIMEOUT, UNDO_LAST_ACTION). */
const TIPOS_JUGADA: readonly TipoEvento[] = [
  'TD',
  'PAT1',
  'PAT2',
  'SAFETY',
  'PICK_SIX',
  'SACK',
  'INTERCEPCION',
  'FALTA_PERSONAL',
  'EXPULSION',
];

export interface EventoParaDiscrepancia {
  id: string;
  tipoEvento: string;
  equipoId: string | null;
  arbitroId: string;
  timestamp: Date;
}

export interface ParDiscrepancia {
  eventoAId: string;
  eventoBId: string;
}

/**
 * Detecta pares de eventos que probablemente representan la misma jugada
 * real registrada dos veces por árbitros distintos (ver
 * docs/superpowers/specs/2026-09-10-reconciliacion-marcador-design.md).
 *
 * Pura: no toca la base de datos, se puede testear con datos de mentira.
 * Se agrupa por (tipoEvento, equipoId) — jugadorId no entra en la clave,
 * porque un árbitro puede registrar la misma jugada sin especificar
 * jugador ("Continuar sin jugador específico") y sigue siendo el mismo
 * hecho. Dentro de cada grupo, ordenado por tiempo, cada evento participa
 * en como máximo un par: una vez emparejado con el siguiente evento libre
 * de un árbitro distinto dentro de la ventana, ambos quedan "consumidos".
 */
export function detectarDiscrepancias(
  eventos: EventoParaDiscrepancia[],
): ParDiscrepancia[] {
  const jugadas = eventos.filter((e) =>
    TIPOS_JUGADA.includes(e.tipoEvento as TipoEvento),
  );

  const grupos = new Map<string, EventoParaDiscrepancia[]>();
  for (const ev of jugadas) {
    const clave = `${ev.tipoEvento}:${ev.equipoId ?? ''}`;
    const grupo = grupos.get(clave);
    if (grupo) grupo.push(ev);
    else grupos.set(clave, [ev]);
  }

  const pares: ParDiscrepancia[] = [];
  for (const grupo of grupos.values()) {
    const ordenado = [...grupo].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    const consumidos = new Set<string>();

    for (let i = 0; i < ordenado.length; i++) {
      const a = ordenado[i];
      if (consumidos.has(a.id)) continue;

      for (let j = i + 1; j < ordenado.length; j++) {
        const b = ordenado[j];
        if (consumidos.has(b.id)) continue;
        if (b.timestamp.getTime() - a.timestamp.getTime() > VENTANA_MS) break;
        if (b.arbitroId === a.arbitroId) continue;

        pares.push({ eventoAId: a.id, eventoBId: b.id });
        consumidos.add(a.id);
        consumidos.add(b.id);
        break;
      }
    }
  }
  return pares;
}
