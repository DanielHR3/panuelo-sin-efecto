import type { Usuario } from "./types";

/**
 * Árbitros que se pueden asignar a un partido: los de su liga (los da de alta
 * el dueño de la liga) y los que no tienen liga (cuentas anteriores a esa
 * regla, que solo el SUPERADMIN recibe y puede asignar). Sin los ya asignados.
 */
export function arbitrosAsignables(arbitros: Usuario[], asignados: Set<string>, ligaId: string): Usuario[] {
  return arbitros.filter(
    (a) => !asignados.has(a.id) && (!a.ligaArbitro || a.ligaArbitro.id === ligaId),
  );
}
