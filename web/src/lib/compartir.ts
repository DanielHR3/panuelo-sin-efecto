import type { ResumenPartido } from "./types";

/**
 * Texto plano del resultado para WhatsApp y similares (Web Share API). Va
 * primero el marcador, que es lo que el dueño de la liga quiere leer sin
 * abrir nada; el enlace al final lleva al detalle.
 */
export function textoCompartir(p: ResumenPartido, url: string): string {
  const fecha = new Date(p.fechaHora).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
  const lineas = [
    `🏈 ${p.equipoLocal.nombre} ${p.marcadorLocal} – ${p.marcadorVisitante} ${p.equipoVisitante.nombre}`,
    p.estado === "FINALIZADO" ? `Final · ${fecha}` : p.estado === "EN_CURSO" ? "En juego" : `Programado · ${fecha}`,
  ];
  const anotadores = p.anotadores.filter((a) => a.nombre);
  if (anotadores.length > 0) {
    lineas.push(
      "Anotaron: " +
        anotadores.map((a) => `${a.nombre} (${a.puntos})`).join(", "),
    );
  }
  if (p.mvp) lineas.push(`MVP: #${p.mvp.numeroJersey} ${p.mvp.nombre}`);
  if (p.arbitros.length > 0) {
    lineas.push(`Árbitro: ${p.arbitros.map((a) => a.nombre).join(", ")}`);
  }
  lineas.push(url);
  return lineas.join("\n");
}
