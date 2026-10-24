export type AccionActualizacion = "nada" | "recargar" | "avisar";

/**
 * Qué hacer cuando la app (sobre todo instalada en el inicio del celular)
 * vuelve al frente y la versión publicada cambió. En el marcador del árbitro
 * nunca se recarga sola: perdería el cronómetro a media jugada.
 */
export function accionActualizacion(e: {
  actual: string | null;
  publicada: string | null;
  ruta: string;
}): AccionActualizacion {
  if (!e.actual || !e.publicada || e.actual === e.publicada) return "nada";
  return e.ruta.startsWith("/partido/") ? "avisar" : "recargar";
}
