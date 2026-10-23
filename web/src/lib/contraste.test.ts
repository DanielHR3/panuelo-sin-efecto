import { describe, expect, it } from "vitest";
import { ratioContraste } from "./contraste";
import { TOKENS } from "./tema";

describe("ratioContraste", () => {
  it("negro sobre blanco es 21 y igual sobre igual es 1", () => {
    expect(ratioContraste("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(ratioContraste("#FFFFFF", "#FFFFFF")).toBe(1);
  });
});

describe.each(["oscuro", "claro"] as const)("tokens %s: contraste >= 4.5", (modo) => {
  const t = TOKENS[modo];
  const pares: Array<[string, string, string]> = [
    ["texto/fondo", t.texto, t.fondo],
    ["texto/panel", t.texto, t.panel],
    ["texto/panel-alterno", t.texto, t["panel-alterno"]],
    ["suave/fondo", t.suave, t.fondo],
    ["suave/panel", t.suave, t.panel],
    ["panuelo-texto/fondo", t["panuelo-texto"], t.fondo],
    ["panuelo-texto/panel", t["panuelo-texto"], t.panel],
    ["#0A1A33/panuelo", "#0A1A33", t.panuelo],
    ["blanco/local", "#FFFFFF", t.local],
    ["blanco/visitante", "#FFFFFF", t.visitante],
    ["blanco/franja-1", "#FFFFFF", t["franja-1"]],
    ["blanco/franja-2", "#FFFFFF", t["franja-2"]],
  ];
  it.each(pares)("%s", (_n, a, b) => {
    expect(ratioContraste(a, b)).toBeGreaterThanOrEqual(4.5);
  });
});
