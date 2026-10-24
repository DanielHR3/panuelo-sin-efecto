import { describe, expect, it } from "vitest";
import { lineasResumen } from "./importacion";

describe("lineasResumen", () => {
  it("describe solo lo que cambia, con singular y plural", () => {
    expect(
      lineasResumen({
        categoriasNuevas: 1,
        equiposNuevos: 2,
        equiposExistentes: 0,
        jugadoresNuevos: 16,
        jugadoresActualizados: 1,
        partidosNuevos: 0,
        partidosOmitidos: 3,
      }),
    ).toEqual([
      "1 categoría nueva",
      "2 equipos nuevos",
      "16 jugadores nuevos",
      "1 jugador actualizado",
      "3 partidos repetidos (se omiten)",
    ]);
  });
});
