import type { EquipoConRoster, GameEvent, TipoEvento } from "@/lib/types";

const TIPO_LABEL: Partial<Record<TipoEvento, string>> = {
  TD: "Touchdown",
  PICK_SIX: "Pick Six",
  PAT1: "Punto extra (1)",
  PAT2: "Conversión (2)",
  SAFETY: "Safety",
  SACK: "Sack",
  INTERCEPCION: "Intercepción",
  FALTA_PERSONAL: "Foul Personal",
  EXPULSION: "Conducta Antideportiva",
  TIMEOUT: "Timeout",
  INICIO_MITAD: "Inicio de mitad",
  FIN_MITAD: "Fin de mitad",
  UNDO_LAST_ACTION: "Deshacer",
};

/** Descripción legible de un evento para el aviso "📝 último evento". */
export function describirEvento(
  evento: GameEvent,
  equipoLocal: EquipoConRoster,
  equipoVisitante: EquipoConRoster,
): string {
  const base = TIPO_LABEL[evento.tipoEvento] ?? evento.tipoEvento;
  if (!evento.equipoId) return base;

  const equipo = evento.equipoId === equipoLocal.id ? equipoLocal : equipoVisitante;
  const jugador = evento.jugadorId
    ? equipo.jugadores.find((j) => j.id === evento.jugadorId)
    : undefined;

  if (jugador) return `${base}: ${equipo.nombre} #${jugador.numeroJersey} ${jugador.nombre}`;
  return `${base}: ${equipo.nombre}`;
}
