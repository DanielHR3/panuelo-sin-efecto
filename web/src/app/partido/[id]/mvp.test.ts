import { describe, expect, it } from "vitest";
import { debePedirMvp } from "./mvp";

describe("debePedirMvp", () => {
  it("pide MVP cuando la liga lo exige y hay jugadores", () => {
    expect(debePedirMvp(true, 5)).toBe(true);
  });
  it("no pide MVP si la liga no lo exige", () => {
    expect(debePedirMvp(false, 5)).toBe(false);
  });
  it("no pide MVP sin jugadores (partido rápido con equipos ad hoc)", () => {
    expect(debePedirMvp(true, 0)).toBe(false);
  });
});
