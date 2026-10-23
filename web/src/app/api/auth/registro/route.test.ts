import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const pedir = (body: unknown) =>
  new Request("http://localhost/api/auth/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/auth/registro", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reenvía solo los campos válidos y guarda la sesión en una cookie httpOnly", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ access_token: "a.b.c", usuario: { rol: "LIGA_ADMIN" } }, { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(
      pedir({ nombre: "Laura", email: "l@x.mx", password: "12345678", nombreLiga: "Valle", rol: "SUPERADMIN" }),
    );
    expect(res.status).toBe(200);
    const enviado = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as Record<string, string>;
    expect(enviado).toEqual({ nombre: "Laura", email: "l@x.mx", password: "12345678", nombreLiga: "Valle" });
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(await res.json()).toEqual({ usuario: { rol: "LIGA_ADMIN" } });
  });

  it("devuelve el mensaje de la API cuando el email ya existe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ message: "Ese email ya tiene cuenta. Inicia sesión." }, { status: 409 })),
    );
    const res = await POST(pedir({ nombre: "L", email: "l@x.mx", password: "12345678", nombreLiga: "V" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ message: "Ese email ya tiene cuenta. Inicia sesión." });
  });
});
