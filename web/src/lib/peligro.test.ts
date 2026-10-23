import { describe, expect, it } from "vitest";
import { ratioContraste } from "./contraste";
import { TOKENS } from "./tema";

// El rojo de las acciones destructivas del panel admin se lee sobre los tres
// fondos sólidos (botones en panel, chips en panel-alterno, avisos en fondo).
describe.each(["oscuro", "claro"] as const)("peligro %s: contraste >= 4.5", (modo) => {
  const t = TOKENS[modo];
  it.each(["fondo", "panel", "panel-alterno"] as const)("peligro/%s", (fondo) => {
    expect(ratioContraste(t.peligro, t[fondo])).toBeGreaterThanOrEqual(4.5);
  });
});
