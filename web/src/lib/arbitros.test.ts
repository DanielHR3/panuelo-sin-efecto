import { describe, expect, it } from "vitest";
import { arbitrosAsignables } from "./arbitros";
import type { Usuario } from "./types";

const arbitro = (id: string, ligaId: string | null): Usuario => ({
  id,
  nombre: id,
  rol: "ARBITRO",
  createdAt: "",
  updatedAt: "",
  ligaArbitro: ligaId ? { id: ligaId, nombre: ligaId } : null,
});

describe("arbitrosAsignables", () => {
  const lista = [arbitro("a", "liga-1"), arbitro("b", "liga-2"), arbitro("c", null), arbitro("d", "liga-1")];

  it("ofrece los árbitros de la liga del partido y los que no tienen liga", () => {
    expect(arbitrosAsignables(lista, new Set(), "liga-1").map((a) => a.id)).toEqual(["a", "c", "d"]);
  });

  it("omite a los que ya están asignados al partido", () => {
    expect(arbitrosAsignables(lista, new Set(["a"]), "liga-1").map((a) => a.id)).toEqual(["c", "d"]);
  });
});
