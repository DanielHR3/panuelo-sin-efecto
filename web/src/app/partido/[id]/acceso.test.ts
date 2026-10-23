import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { accesoDenegado, loginParaPartido } from "./acceso";

describe("accesoDenegado", () => {
  it("404 → no-encontrado", () => {
    expect(accesoDenegado(new ApiError(404, "x"))).toBe("no-encontrado");
  });

  it("401 (token vencido o sin sesión) → sin-sesion", () => {
    expect(accesoDenegado(new ApiError(401, "x"))).toBe("sin-sesion");
  });

  it("403 (no asignado ni dueño) → no-asignado", () => {
    expect(accesoDenegado(new ApiError(403, "x"))).toBe("no-asignado");
  });

  it("cualquier otro error no se maneja aquí (lo atrapa el boundary)", () => {
    expect(accesoDenegado(new ApiError(500, "x"))).toBeNull();
    expect(accesoDenegado(new TypeError("fetch failed"))).toBeNull();
  });
});

describe("loginParaPartido", () => {
  it("vuelve al partido después del login", () => {
    expect(loginParaPartido("abc-123")).toBe("/login?next=%2Fpartido%2Fabc-123");
  });
});
