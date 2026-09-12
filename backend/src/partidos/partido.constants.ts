export const DIFICULTADES = ['REGULAR', 'MEDIO', 'COMPLICADO'] as const;
export type Dificultad = (typeof DIFICULTADES)[number];

export const ESTADOS_PARTIDO = [
  'PROGRAMADO',
  'EN_CURSO',
  'FINALIZADO',
] as const;
export type EstadoPartido = (typeof ESTADOS_PARTIDO)[number];

/** Índice de cada estado en su progresión lineal (no admite retroceso). */
export const ORDEN_ESTADO: Record<EstadoPartido, number> = {
  PROGRAMADO: 0,
  EN_CURSO: 1,
  FINALIZADO: 2,
};
