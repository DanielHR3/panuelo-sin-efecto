import { describe, expect, it } from "vitest";
import { destinoTrasLogin } from "./destino-login";

describe("destinoTrasLogin", () => {
  it("respeta la ruta protegida de la que venía el usuario", () => {
    expect(destinoTrasLogin("/partido/p1", "ARBITRO")).toBe("/partido/p1");
    expect(destinoTrasLogin("/admin/ligas", "LIGA_ADMIN")).toBe("/admin/ligas");
  });

  it("sin next, el árbitro va a sus partidos y los admins al panel", () => {
    expect(destinoTrasLogin(null, "ARBITRO")).toBe("/mis-partidos");
    expect(destinoTrasLogin(null, "LIGA_ADMIN")).toBe("/admin");
    expect(destinoTrasLogin(null, "SUPERADMIN")).toBe("/admin");
    expect(destinoTrasLogin(null, undefined)).toBe("/admin");
  });

  it("ignora next si apunta fuera del sitio o a la landing pública", () => {
    expect(destinoTrasLogin("https://evil.com", "ARBITRO")).toBe("/mis-partidos");
    expect(destinoTrasLogin("//evil.com", "ARBITRO")).toBe("/mis-partidos");
    expect(destinoTrasLogin("/", "LIGA_ADMIN")).toBe("/admin");
  });
});
