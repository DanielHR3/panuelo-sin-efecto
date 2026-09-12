export type Rol = "SUPERADMIN" | "LIGA_ADMIN" | "ARBITRO";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
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
  propietarioId: string;
  categorias: Categoria[];
  createdAt: string;
  updatedAt: string;
}

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
  arbitro?: Pick<Usuario, "id" | "nombre" | "email">;
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
}
