import { describe, expect, it } from "vitest";
import { fechaLocalAISO, formatearFecha, ZONA } from "./zona";

describe("zona horaria de la app (Ciudad de México)", () => {
  it("usa America/Mexico_City", () => {
    expect(ZONA).toBe("America/Mexico_City");
  });

  it("formatea en hora de México aunque el servidor esté en UTC", () => {
    // 18:00 UTC = 12:00 en la CDMX (UTC-6, sin horario de verano desde 2022).
    expect(formatearFecha("2026-10-17T18:00:00Z", { hour: "2-digit", minute: "2-digit", hour12: false })).toBe("12:00");
  });

  it("convierte el valor de <input type=datetime-local> como hora de México", () => {
    expect(fechaLocalAISO("2026-11-01T10:00")).toBe("2026-11-01T16:00:00.000Z");
    expect(fechaLocalAISO("2026-11-01T10:00:30")).toBe("2026-11-01T16:00:30.000Z");
  });

  it("rechaza un valor que no es fecha", () => {
    expect(() => fechaLocalAISO("mañana")).toThrow();
  });
});
