import { describe, expect, it } from "vitest";
import { describirAccion, salioBien } from "./bitacora";

describe("describirAccion", () => {
  it("traduce las rutas conocidas", () => {
    expect(describirAccion("DELETE", "/ligas/:id")).toBe("Eliminó una liga");
    expect(describirAccion("POST", "/partidos/:partidoId/eventos")).toBe("Anotó jugadas");
  });

  it("muestra método y ruta si no la conoce", () => {
    expect(describirAccion("POST", "/nueva/:id")).toBe("POST /nueva/:id");
  });
});

describe("salioBien", () => {
  it("solo los 2xx", () => {
    expect(salioBien(201)).toBe(true);
    expect(salioBien(401)).toBe(false);
    expect(salioBien(500)).toBe(false);
  });
});
