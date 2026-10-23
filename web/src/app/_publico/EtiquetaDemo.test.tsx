import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EtiquetaDemo } from "./EtiquetaDemo";

afterEach(cleanup);

describe("EtiquetaDemo", () => {
  it("marca la liga como demo y avisa que los datos son ficticios", () => {
    render(<EtiquetaDemo />);
    expect(screen.getByText("Demo")).toBeTruthy();
    expect(screen.getByText("Liga de ejemplo, los datos son ficticios")).toBeTruthy();
  });
});
