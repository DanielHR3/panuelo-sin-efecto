import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Logo } from "../marca/Logo";
import { Icono, NOMBRES_ICONO } from "./Icono";

afterEach(cleanup);

describe("Icono", () => {
  it.each(NOMBRES_ICONO)("each NombreIcono renders an svg with at least one path/circle/line (%s)", (nombre) => {
    const { container } = render(<Icono nombre={nombre} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg!.getAttribute("stroke")).toBe("currentColor");
    expect(svg!.querySelectorAll("path, circle, line, rect").length).toBeGreaterThan(0);
  });

  it("is aria-hidden without titulo", () => {
    const { container } = render(<Icono nombre="falta" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("role")).toBeNull();
    expect(svg.getAttribute("aria-label")).toBeNull();
  });

  it("has role img and aria-label with titulo", () => {
    const { getByRole } = render(<Icono nombre="candado" titulo="Bloquear pantalla" />);
    const svg = getByRole("img", { name: "Bloquear pantalla" });
    expect(svg.getAttribute("aria-hidden")).toBeNull();
  });

  it("is sized 1em by default and forwards className", () => {
    const { container } = render(<Icono nombre="reloj" className="text-panuelo" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("1em");
    expect(svg.getAttribute("height")).toBe("1em");
    expect(svg.getAttribute("class")).toContain("text-panuelo");
  });
});

describe("Logo", () => {
  it("Logo contains no <text> element", () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector("svg")!;
    expect(svg).not.toBeNull();
    expect(svg.querySelector("text")).toBeNull();
    expect(svg.querySelectorAll("path").length).toBeGreaterThan(0);
  });

  it("uses tamano for its size", () => {
    const { container } = render(<Logo tamano={48} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("48");
    expect(svg.getAttribute("height")).toBe("48");
  });
});
