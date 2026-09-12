import { puntosDe } from '../eventos/evento.constants';
import { filtrarEventosVigentes } from '../eventos/marcador';

/**
 * Funciones puras de la vista pública (HU-3.1 / HU-3.4). Todo se deriva de
 * `Partido` (marcadores ya reconciliados) y de `EventoPartido` (Caja Negra):
 * no hay tablas de estadísticas que mantener ni cachés que invalidar.
 */

export interface PartidoParaTabla {
  estado: string;
  equipoLocalId: string;
  equipoVisitanteId: string;
  marcadorLocal: number;
  marcadorVisitante: number;
}

export interface EquipoBasico {
  id: string;
  nombre: string;
  colorPrimario?: string | null;
}

export interface FilaTabla {
  posicion: number;
  equipoId: string;
  nombre: string;
  colorPrimario: string | null;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  pf: number;
  pc: number;
  dif: number;
  pts: number;
}

const PTS_VICTORIA = 3;
const PTS_EMPATE = 1;

/** Tabla de posiciones de una categoría: solo cuentan los partidos FINALIZADOS. */
export function calcularTablaPosiciones(
  partidos: PartidoParaTabla[],
  equipos: EquipoBasico[],
): FilaTabla[] {
  const filas = new Map<string, FilaTabla>(
    equipos.map((e) => [
      e.id,
      {
        posicion: 0,
        equipoId: e.id,
        nombre: e.nombre,
        colorPrimario: e.colorPrimario ?? null,
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        pf: 0,
        pc: 0,
        dif: 0,
        pts: 0,
      },
    ]),
  );

  const registrar = (equipoId: string, favor: number, contra: number): void => {
    const fila = filas.get(equipoId);
    if (!fila) return;
    fila.pj += 1;
    fila.pf += favor;
    fila.pc += contra;
    fila.dif = fila.pf - fila.pc;
    if (favor > contra) {
      fila.pg += 1;
      fila.pts += PTS_VICTORIA;
    } else if (favor === contra) {
      fila.pe += 1;
      fila.pts += PTS_EMPATE;
    } else {
      fila.pp += 1;
    }
  };

  for (const p of partidos) {
    if (p.estado !== 'FINALIZADO') continue;
    registrar(p.equipoLocalId, p.marcadorLocal, p.marcadorVisitante);
    registrar(p.equipoVisitanteId, p.marcadorVisitante, p.marcadorLocal);
  }

  const ordenadas = [...filas.values()].sort(
    (a, b) =>
      b.pts - a.pts ||
      b.dif - a.dif ||
      b.pf - a.pf ||
      a.nombre.localeCompare(b.nombre, 'es'),
  );
  ordenadas.forEach((fila, i) => {
    fila.posicion = i + 1;
  });
  return ordenadas;
}

export interface EventoPublico {
  id: string;
  partidoId: string;
  tipoEvento: string;
  jugadorId: string | null;
  equipoId: string | null;
}

/**
 * UNDO_LAST_ACTION cancela "el último evento vigente DEL MISMO PARTIDO", así
 * que la pila de cancelación se arma partido por partido. Los eventos deben
 * venir ordenados por timestamp dentro de cada partido.
 */
export function eventosVigentesPorPartido<T extends EventoPublico>(
  eventos: T[],
): T[] {
  const porPartido = new Map<string, T[]>();
  for (const ev of eventos) {
    const lista = porPartido.get(ev.partidoId);
    if (lista) lista.push(ev);
    else porPartido.set(ev.partidoId, [ev]);
  }
  const vigentes: T[] = [];
  for (const lista of porPartido.values()) {
    vigentes.push(...filtrarEventosVigentes(lista));
  }
  return vigentes;
}

export interface EstadisticasJugador {
  td: number;
  pat1: number;
  pat2: number;
  safety: number;
  pickSix: number;
  intercepciones: number;
  sacks: number;
  faltas: number;
  puntos: number;
  partidos: number;
  mvps: number;
}

export function calcularEstadisticasJugador(
  eventos: EventoPublico[],
  jugadorId: string,
  mvps: number,
): EstadisticasJugador {
  const stats: EstadisticasJugador = {
    td: 0,
    pat1: 0,
    pat2: 0,
    safety: 0,
    pickSix: 0,
    intercepciones: 0,
    sacks: 0,
    faltas: 0,
    puntos: 0,
    partidos: 0,
    mvps,
  };
  const partidos = new Set<string>();
  for (const ev of eventosVigentesPorPartido(eventos)) {
    if (ev.jugadorId !== jugadorId) continue;
    partidos.add(ev.partidoId);
    stats.puntos += puntosDe(ev.tipoEvento);
    switch (ev.tipoEvento) {
      case 'TD':
        stats.td += 1;
        break;
      case 'PAT1':
        stats.pat1 += 1;
        break;
      case 'PAT2':
        stats.pat2 += 1;
        break;
      case 'SAFETY':
        stats.safety += 1;
        break;
      case 'PICK_SIX':
        stats.pickSix += 1;
        break;
      case 'INTERCEPCION':
        stats.intercepciones += 1;
        break;
      case 'SACK':
        stats.sacks += 1;
        break;
      case 'FALTA_PERSONAL':
      case 'EXPULSION':
        stats.faltas += 1;
        break;
    }
  }
  stats.partidos = partidos.size;
  return stats;
}

export interface Lider {
  jugadorId: string;
  puntos: number;
  td: number;
  intercepciones: number;
}

/** Jugadores con más puntos anotados (desempate: TD, luego intercepciones). */
export function calcularLideres(
  eventos: EventoPublico[],
  limite: number,
): Lider[] {
  const acumulado = new Map<string, Lider>();
  for (const ev of eventosVigentesPorPartido(eventos)) {
    if (!ev.jugadorId) continue;
    let lider = acumulado.get(ev.jugadorId);
    if (!lider) {
      lider = { jugadorId: ev.jugadorId, puntos: 0, td: 0, intercepciones: 0 };
      acumulado.set(ev.jugadorId, lider);
    }
    lider.puntos += puntosDe(ev.tipoEvento);
    if (ev.tipoEvento === 'TD' || ev.tipoEvento === 'PICK_SIX') lider.td += 1;
    if (ev.tipoEvento === 'INTERCEPCION' || ev.tipoEvento === 'PICK_SIX') {
      lider.intercepciones += 1;
    }
  }
  return [...acumulado.values()]
    .filter((l) => l.puntos > 0 || l.td > 0 || l.intercepciones > 0)
    .sort(
      (a, b) =>
        b.puntos - a.puntos ||
        b.td - a.td ||
        b.intercepciones - a.intercepciones ||
        a.jugadorId.localeCompare(b.jugadorId),
    )
    .slice(0, limite);
}
