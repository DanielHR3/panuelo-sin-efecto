/** Una fila de GET /bitacora (solo SUPERADMIN). */
export interface FilaBitacora {
  id: string;
  fecha: string;
  usuarioId: string | null;
  usuarioEmail: string | null;
  rol: string | null;
  metodo: string;
  ruta: string;
  params: Record<string, string> | null;
  detalle: Record<string, unknown> | null;
  estado: number;
}

const ACCIONES: Record<string, string> = {
  "POST /auth/login": "Inició sesión",
  "POST /registro": "Se registró como organizador",
  "POST /ligas": "Creó una liga",
  "PATCH /ligas/:id": "Editó una liga",
  "DELETE /ligas/:id": "Eliminó una liga",
  "POST /ligas/:ligaId/categorias": "Creó una categoría",
  "PATCH /categorias/:id": "Editó una categoría",
  "DELETE /categorias/:id": "Eliminó una categoría",
  "POST /categorias/:categoriaId/equipos": "Creó un equipo",
  "PATCH /equipos/:id": "Editó un equipo",
  "DELETE /equipos/:id": "Eliminó un equipo",
  "POST /equipos/:equipoId/jugadores": "Agregó un jugador",
  "PATCH /jugadores/:id": "Editó un jugador",
  "DELETE /jugadores/:id": "Eliminó un jugador",
  "POST /categorias/:categoriaId/partidos": "Programó un partido",
  "PATCH /partidos/:id": "Editó un partido",
  "DELETE /partidos/:id": "Eliminó un partido",
  "PATCH /partidos/:id/mvp": "Eligió el MVP",
  "POST /partidos/:id/asignaciones": "Asignó un árbitro",
  "DELETE /partidos/:id/asignaciones/:arbitroId": "Quitó un árbitro",
  "POST /partidos/:partidoId/eventos": "Anotó jugadas",
  "PATCH /partidos/:partidoId/discrepancias/:discrepanciaId": "Resolvió una discrepancia",
  "PATCH /partidos/:partidoId/discrepancias/:discrepanciaId/reabrir": "Reabrió una discrepancia",
  "POST /rapido/partidos": "Abrió un partido rápido",
  "POST /rapido/partidos/:id/intercambiar-equipos": "Intercambió los equipos",
  "POST /usuarios": "Dio de alta un usuario",
  "POST /ligas/:ligaId/importar": "Importó desde Excel",
  "POST /ligas/:ligaId/pagos": "Generó un pago",
  "POST /pagos/:id/comprobante": "Subió un comprobante",
  "PATCH /pagos/:id": "Resolvió un pago",
  "PUT /ligas/:ligaId/reglamento": "Subió el reglamento",
  "DELETE /ligas/:ligaId/reglamento": "Quitó el reglamento",
};

/** Texto legible de la acción; si no la conocemos, el método y la ruta. */
export function describirAccion(metodo: string, ruta: string): string {
  return ACCIONES[`${metodo} ${ruta}`] ?? `${metodo} ${ruta}`;
}

/** 2xx salió bien; lo demás, con su código (p. ej. contraseña equivocada = 401). */
export function salioBien(estado: number): boolean {
  return estado >= 200 && estado < 300;
}
