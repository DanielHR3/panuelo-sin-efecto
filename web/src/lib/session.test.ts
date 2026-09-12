import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeSessionUser, secondsUntilExpiry } from "./session";

function jwt(payload: Record<string, unknown>): string {
  const b64 = (s: string) => Buffer.from(s).toString("base64url");
  return `${b64('{"alg":"HS256","typ":"JWT"}')}.${b64(JSON.stringify(payload))}.firma`;
}

describe("decodeSessionUser", () => {
  it("extrae sub, email y rol del payload", () => {
    const token = jwt({ sub: "u1", email: "a@a.mx", rol: "ARBITRO", exp: 1 });
    expect(decodeSessionUser(token)).toEqual({ sub: "u1", email: "a@a.mx", rol: "ARBITRO" });
  });

  it("devuelve null si falta alguno de los claims obligatorios", () => {
    expect(decodeSessionUser(jwt({ sub: "u1", email: "a@a.mx" }))).toBeNull();
    expect(decodeSessionUser(jwt({ email: "a@a.mx", rol: "ARBITRO" }))).toBeNull();
  });

  it("devuelve null con un token malformado", () => {
    expect(decodeSessionUser("no-es-un-jwt")).toBeNull();
    expect(decodeSessionUser("a.###.c")).toBeNull();
    expect(decodeSessionUser("")).toBeNull();
  });
});

describe("secondsUntilExpiry", () => {
  afterEach(() => vi.useRealTimers());

  it("calcula los segundos restantes según exp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T18:00:00.000Z"));
    const exp = Math.floor(Date.now() / 1000) + 90;
    expect(secondsUntilExpiry(jwt({ exp }))).toBe(90);
  });

  it("nunca devuelve negativo con un token ya expirado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T18:00:00.000Z"));
    const exp = Math.floor(Date.now() / 1000) - 10;
    expect(secondsUntilExpiry(jwt({ exp }))).toBe(0);
  });

  it("devuelve undefined si el token no trae exp numérico", () => {
    expect(secondsUntilExpiry(jwt({ sub: "u1" }))).toBeUndefined();
    expect(secondsUntilExpiry("basura")).toBeUndefined();
  });
});
