import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Subconjunto deliberado de rangos de emoji y dingbats (no es Unicode completo).
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{21C4}\u{2630}\u{2715}]/u;

function archivosTsx(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivosTsx(ruta);
    return ruta.endsWith(".tsx") && !ruta.endsWith(".test.tsx") ? [ruta] : [];
  });
}

describe("sin emojis como ícono", () => {
  it("ningún .tsx de src/app o src/components contiene emoji", () => {
    const base = join(process.cwd(), "src");
    const hallazgos: string[] = [];
    for (const dir of ["app", "components"]) {
      for (const archivo of archivosTsx(join(base, dir))) {
        readFileSync(archivo, "utf8")
          .split("\n")
          .forEach((linea, i) => {
            if (EMOJI.test(linea)) hallazgos.push(`${archivo}:${i + 1}: ${linea.trim()}`);
          });
      }
    }
    expect(hallazgos).toEqual([]);
  });
});
