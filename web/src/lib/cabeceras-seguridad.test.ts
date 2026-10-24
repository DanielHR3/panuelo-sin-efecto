import { describe, expect, it } from "vitest";
import { CABECERAS_SEGURIDAD } from "./cabeceras-seguridad";

function valor(key: string) {
  return CABECERAS_SEGURIDAD.find((c) => c.key === key)?.value;
}

describe("cabeceras de seguridad", () => {
  it("impide que la web se cargue dentro de un iframe ajeno", () => {
    expect(valor("X-Frame-Options")).toBe("DENY");
    expect(valor("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("evita adivinar tipos MIME y limita el referrer", () => {
    expect(valor("X-Content-Type-Options")).toBe("nosniff");
    expect(valor("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("niega cámara, micrófono y ubicación", () => {
    expect(valor("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });

  it("no repite cabeceras", () => {
    const keys = CABECERAS_SEGURIDAD.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
