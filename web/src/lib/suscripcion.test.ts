import { describe, expect, it } from "vitest";
import { avisoSuscripcion } from "./suscripcion";

describe("avisoSuscripcion", () => {
  it("en prueba cuenta los días que quedan", () => {
    expect(avisoSuscripcion({ estado: "PRUEBA", plan: "COMPLETO", vence: "x", diasRestantes: 12 })).toEqual({
      tono: "info",
      titulo: "Te quedan 12 días de prueba gratis",
      detalle: "Tienes el plan completo: marcador en vivo, página pública, tabla y estadísticas.",
    });
  });

  it("usa singular con un día", () => {
    expect(avisoSuscripcion({ estado: "PRUEBA", plan: "COMPLETO", vence: "x", diasRestantes: 1 })?.titulo).toBe(
      "Te queda 1 día de prueba gratis",
    );
  });

  it("avisa cuando la liga está vencida", () => {
    expect(avisoSuscripcion({ estado: "VENCIDA", plan: "COMPLETO", vence: null, diasRestantes: null })?.tono).toBe(
      "alerta",
    );
  });

  it("no muestra nada en cortesía ni con plan pagado lejos de vencer", () => {
    expect(avisoSuscripcion({ estado: "CORTESIA", plan: "CORTESIA", vence: null, diasRestantes: null })).toBeNull();
    expect(avisoSuscripcion({ estado: "ACTIVA", plan: "COMPLETO", vence: "x", diasRestantes: 20 })).toBeNull();
  });

  it("recuerda renovar un plan pagado en su última semana", () => {
    expect(avisoSuscripcion({ estado: "ACTIVA", plan: "COMPLETO", vence: "x", diasRestantes: 3 })?.titulo).toBe(
      "Tu plan vence en 3 días",
    );
  });
});
