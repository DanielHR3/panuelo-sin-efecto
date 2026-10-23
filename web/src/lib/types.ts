export type Rol = "SUPERADMIN" | "LIGA_ADMIN" | "ARBITRO";

export interface Usuario {
  id: string;
  nombre: string;
  /**
   * Solo llega a un SUPERADMIN (GET /usuarios) o en /usuarios/me. A un
   * LIGA_ADMIN la API le lista los árbitros sin email.
   */
  email?: string;
  rol: Rol;
  createdAt: string;
  updatedAt: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  ligaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Liga {
  id: string;
  nombre: string;
  tipo: "LIGA" | "RAPIDA";
  /** HU-1.1: URL pública del logo, o null si la liga no tiene. */
  logoUrl: string | null;
  /** HU-1.1: la PWA exige elegir MVP al finalizar cada partido. */
  registraMvp: boolean;
  /** HU-1.1: la PWA ofrece el evento INTERCEPCION al árbitro. */
  registraIntercepciones: boolean;
  propietarioId: string;
  categorias: Categoria[];
  createdAt: string;
  updatedAt: string;
}

/** Columnas de la liga que expone GET /partidos/:id (sin propietarioId). */
export type LigaDePartido = Pick<
  Liga,
  "id" | "nombre" | "logoUrl" | "tipo" | "registraMvp" | "registraIntercepciones"
>;

export interface CategoriaConEquipos extends Categoria {
  equipos: Equipo[];
}

export interface Equipo {
  id: string;
  nombre: string;
  colorPrimario: string | null;
  categoriaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Jugador {
  id: string;
  nombre: string;
  numeroJersey: string;
  equipoId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipoConRoster extends Equipo {
  jugadores: Jugador[];
}

export type Dificultad = "REGULAR" | "MEDIO" | "COMPLICADO";
export type EstadoPartido = "PROGRAMADO" | "EN_CURSO" | "FINALIZADO";
export type RolEnCampo = "Referee" | "Umpire" | "Line Judge";

export interface AsignacionArbitral {
  partidoId: string;
  arbitroId: string;
  rolEnCampo: RolEnCampo;
  /** La API nunca manda el email del árbitro con un partido. */
  arbitro?: Pick<Usuario, "id" | "nombre">;
}

export interface Partido {
  id: string;
  fechaHora: string;
  dificultad: Dificultad;
  estado: EstadoPartido;
  marcadorLocal: number;
  marcadorVisitante: number;
  categoriaId: string;
  equipoLocalId: string;
  equipoVisitanteId: string;
  equipoLocal?: Equipo;
  equipoVisitante?: Equipo;
  asignaciones?: AsignacionArbitral[];
  categoria?: Categoria & { liga: LigaDePartido };
  mvpJugadorId?: string | null;
  mvpJugador?: Jugador | null;
}

/** Detalle de partido con el roster completo (GET /partidos/:id). */
export interface PartidoConRoster extends Partido {
  equipoLocal: EquipoConRoster;
  equipoVisitante: EquipoConRoster;
}

/**
 * Tipos de evento que registra el árbitro (debe coincidir con
 * backend/src/eventos/evento.constants.ts).
 */
export const TIPOS_EVENTO = [
  "INICIO_MITAD",
  "FIN_MITAD",
  "TD",
  "PAT1",
  "PAT2",
  "SAFETY",
  "PICK_SIX",
  "TIMEOUT",
  "FALTA_PERSONAL",
  "EXPULSION",
  "INTERCEPCION",
  "SACK",
  "UNDO_LAST_ACTION",
  "REABRIR_PARTIDO",
  "ANULAR_EVENTO",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export interface GameEvent {
  id: string;
  timestamp: string;
  tipoEvento: TipoEvento;
  clientEventId: string | null;
  partidoId: string;
  equipoId: string | null;
  jugadorId: string | null;
  arbitroId: string;
  eventoAnuladoId: string | null;
  /** Descartado por el admin al resolver una discrepancia: no cuenta para el marcador. */
  descartado: boolean;
}

export interface Marcador {
  local: number;
  visitante: number;
}

export interface EventoDiscrepancia {
  id: string;
  tipoEvento: TipoEvento;
  equipoId: string | null;
  jugadorId: string | null;
  arbitroId: string;
  timestamp: string;
  descartado: boolean;
  /** Ya no cuenta para el marcador por un ANULAR_EVENTO (o UNDO) posterior; calculado al leer. */
  anulado: boolean;
}

export type AccionResolucion = "DESCARTAR_A" | "DESCARTAR_B" | "MANTENER_AMBOS";

/* ---------- Vista pública (GET /publico/*, HU-3.4 / HU-3.1) ---------- */

export interface EquipoPublico {
  id: string;
  nombre: string;
  colorPrimario: string | null;
}

export interface PartidoPublico {
  id: string;
  fechaHora: string;
  estado: EstadoPartido;
  marcadorLocal: number;
  marcadorVisitante: number;
  mvpJugadorId: string | null;
  equipoLocal: EquipoPublico;
  equipoVisitante: EquipoPublico;
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

export interface LiderPublico {
  jugadorId: string;
  puntos: number;
  td: number;
  intercepciones: number;
  nombre: string;
  numeroJersey: string;
  equipo: EquipoPublico | null;
}

export interface CategoriaPublica {
  id: string;
  nombre: string;
  tabla: FilaTabla[];
  recientes: PartidoPublico[];
  proximos: PartidoPublico[];
  lideres: LiderPublico[];
}

export interface LigaPublica {
  id: string;
  nombre: string;
  logoUrl: string | null;
  /** Liga de ejemplo con datos ficticios (se muestra primero y marcada). */
  esDemo?: boolean;
  categorias: CategoriaPublica[];
}

export interface ResumenPublico {
  ligas: LigaPublica[];
}

export interface CategoriaPublicaDetalle extends CategoriaPublica {
  liga: { id: string; nombre: string; logoUrl: string | null; esDemo?: boolean };
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

export interface PerfilJugador {
  id: string;
  nombre: string;
  numeroJersey: string;
  equipo: EquipoPublico;
  categoria: { id: string; nombre: string };
  liga: { id: string; nombre: string; logoUrl: string | null; esDemo?: boolean };
  estadisticas: EstadisticasJugador;
  partidos: (PartidoPublico & { esMvp: boolean; puntos: number; td: number })[];
}

export interface Discrepancia {
  id: string;
  partidoId: string;
  estado: "PENDIENTE" | "RESUELTA";
  eventoA: EventoDiscrepancia;
  eventoB: EventoDiscrepancia;
  eventoDescartadoId: string | null;
  resueltoPorId: string | null;
  resolvedAt: string | null;
}

/** Resumen compartible de un partido (GET /publico/partidos/:id, HU-2.7). */
export interface AnotadorPublico {
  jugadorId: string | null;
  equipoId: string;
  puntos: number;
  td: number;
  nombre: string | null;
  numeroJersey: string | null;
}

export interface ResumenPartido extends PartidoPublico {
  /**
   * En un partido rápido (`liga.esRapida`) la API omite los ids de la
   * categoría y la liga contenedoras: con ellos se llegaría a los demás
   * partidos rápidos del mismo invitado. Solo enlaza a `/categoria/:id`
   * cuando la liga es normal.
   */
  categoria: { id?: string; nombre: string };
  liga: { id?: string; nombre: string; logoUrl: string | null; esRapida: boolean; esDemo?: boolean };
  mvp: { id: string; nombre: string; numeroJersey: string; equipoId: string } | null;
  arbitros: { nombre: string; rolEnCampo: string }[];
  anotadores: AnotadorPublico[];
}
