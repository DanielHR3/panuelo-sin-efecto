export const TIPOS_EVENTO = [
  'INICIO_MITAD',
  'FIN_MITAD',
  'TD',
  'PAT1',
  'PAT2',
  'SAFETY',
  'PICK_SIX',
  'TIMEOUT',
  'FALTA_PERSONAL',
  'EXPULSION',
  'INTERCEPCION',
  'SACK',
  'UNDO_LAST_ACTION',
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];

/**
 * Puntos que aporta cada tipo de evento (flag football estándar).
 * Lo que no aparece aquí vale 0 (eventos de control, faltas, jugadas
 * defensivas sin anotación).
 */
export const PUNTOS_POR_TIPO: Partial<Record<TipoEvento, number>> = {
  TD: 6,
  PAT1: 1,
  PAT2: 2,
  SAFETY: 2,
  PICK_SIX: 6,
};

export function puntosDe(tipo: string): number {
  return PUNTOS_POR_TIPO[tipo as TipoEvento] ?? 0;
}
