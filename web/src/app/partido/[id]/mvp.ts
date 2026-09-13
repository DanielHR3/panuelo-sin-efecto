/**
 * HU-2.5 / HU-1.1 / HU-2.7: ¿tiene sentido pedir MVP en este partido?
 * Solo si la liga lo exige Y hay al menos un jugador entre los dos rosters.
 * Los partidos rápidos (equipos ad hoc sin roster) no lo piden: sin este
 * chequeo el modal se abría obligatorio, sin nadie que elegir, y el árbitro
 * quedaba atrapado (bug encontrado en la prueba de campo del 2026-09-12).
 */
export function debePedirMvp(registraMvp: boolean, totalJugadores: number): boolean {
  return registraMvp && totalJugadores > 0;
}
