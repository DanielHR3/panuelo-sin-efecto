import { describe, expect, it } from "vitest";
import { accionActualizacion } from "./actualizacion";

describe("accionActualizacion", () => {
  it("no hace nada si la versión publicada es la misma o no se pudo saber", () => {
    expect(accionActualizacion({ actual: "abc", publicada: "abc", ruta: "/" })).toBe("nada");
    expect(accionActualizacion({ actual: "abc", publicada: null, ruta: "/" })).toBe("nada");
    expect(accionActualizacion({ actual: null, publicada: "def", ruta: "/" })).toBe("nada");
  });

  it("recarga sola en páginas normales cuando hay versión nueva", () => {
    expect(accionActualizacion({ actual: "abc", publicada: "def", ruta: "/admin/partidos" })).toBe("recargar");
    expect(accionActualizacion({ actual: "abc", publicada: "def", ruta: "/" })).toBe("recargar");
  });

  it("en el marcador del árbitro solo avisa: no recarga a media jugada", () => {
    expect(accionActualizacion({ actual: "abc", publicada: "def", ruta: "/partido/123" })).toBe("avisar");
  });
});
