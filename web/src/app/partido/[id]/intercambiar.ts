/**
 * POST /rapido/partidos/:id/intercambiar-equipos. Mismo contrato de error que
 * postEvento.
 *
 * Envía `localEsperado` (el local que se ve ahora) para que el intercambio sea
 * idempotente: si la API estaba dormida y la petición se reintenta, el segundo
 * envío no deshace el primero. La respuesta trae el estado real en ambos
 * casos (`aplicado` true o false), así que siempre se usan sus nombres.
 */
export async function postIntercambiarEquipos(
  partidoId: string,
  localEsperado: string,
): Promise<{ equipoLocal: { nombre: string }; equipoVisitante: { nombre: string } }> {
  const res = await fetch(`/api/proxy/rapido/partidos/${partidoId}/intercambiar-equipos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ localEsperado }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    message?: string | string[];
    equipoLocal?: { nombre: string };
    equipoVisitante?: { nombre: string };
  };
  if (!res.ok || !data.equipoLocal || !data.equipoVisitante) {
    const message = Array.isArray(data.message) ? data.message.join(", ") : data.message;
    throw new Error(message ?? "No se pudieron intercambiar los equipos");
  }
  return {
    equipoLocal: { nombre: data.equipoLocal.nombre },
    equipoVisitante: { nombre: data.equipoVisitante.nombre },
  };
}
