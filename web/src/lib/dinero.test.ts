import { describe, expect, it } from "vitest";
import { pesos } from "./dinero";

describe("pesos", () => {
  it("muestra centavos como pesos mexicanos sin decimales cuando son cerrados", () => {
    expect(pesos(29_900)).toBe("$299");
    expect(pesos(299_000)).toBe("$2,990");
  });
  it("conserva los centavos cuando los hay", () => {
    expect(pesos(9_950)).toBe("$99.50");
  });
});
