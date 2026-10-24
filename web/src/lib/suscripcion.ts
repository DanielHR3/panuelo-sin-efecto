import type { ResumenSuscripcion } from "./types";

export interface AvisoSuscripcion {
  tono: "info" | "alerta";
  titulo: string;
  detalle: string;
}

const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

/** Aviso del plan de una liga en el panel; null cuando no hay nada que decir. */
export function avisoSuscripcion(s: ResumenSuscripcion): AvisoSuscripcion | null {
  switch (s.estado) {
    case "PRUEBA":
      return {
        tono: "info",
        titulo: `Te ${s.diasRestantes === 1 ? "queda" : "quedan"} ${dias(s.diasRestantes ?? 0)} de prueba gratis`,
        detalle: "Tienes el plan completo: marcador en vivo, página pública, tabla y estadísticas.",
      };
    case "VENCIDA":
      return {
        tono: "alerta",
        titulo: "Tu prueba gratis terminó",
        detalle: "Tus datos siguen guardados. Muy pronto podrás elegir un plan para seguir capturando partidos.",
      };
    case "ACTIVA":
      return s.diasRestantes !== null && s.diasRestantes <= 7
        ? { tono: "info", titulo: `Tu plan vence en ${dias(s.diasRestantes)}`, detalle: "Renueva para no perder la captura de partidos." }
        : null;
    default:
      return null;
  }
}
