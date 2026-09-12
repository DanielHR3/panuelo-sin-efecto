import { describe, expect, it } from "vitest";
import { CLOSED, flowReducer, type FlowState } from "./flow";

describe("flowReducer (modal multi-paso del árbitro)", () => {
  it("abrir_td lleva a elegir el tipo de anotación para ese equipo", () => {
    expect(flowReducer(CLOSED, { type: "abrir_td", team: "local" })).toEqual({
      step: "td_type",
      team: "local",
    });
  });

  it("TD: tipo -> jugador conserva el equipo elegido", () => {
    const s1 = flowReducer(CLOSED, { type: "abrir_td", team: "visitante" });
    const s2 = flowReducer(s1, { type: "elegir_td_tipo", tipoEvento: "PICK_SIX" });
    expect(s2).toEqual({ step: "td_player", team: "visitante", tipoEvento: "PICK_SIX" });
  });

  it("flag: tipo -> equipo -> jugador", () => {
    const s1 = flowReducer(CLOSED, { type: "abrir_flag" });
    expect(s1.step).toBe("flag_type");
    const s2 = flowReducer(s1, { type: "elegir_flag_tipo", tipoEvento: "EXPULSION" });
    expect(s2).toEqual({ step: "flag_team", tipoEvento: "EXPULSION" });
    const s3 = flowReducer(s2, { type: "elegir_equipo", team: "local" });
    expect(s3).toEqual({ step: "flag_player", tipoEvento: "EXPULSION", team: "local" });
  });

  it("jugada defensiva: tipo -> equipo -> jugador", () => {
    const s1 = flowReducer(CLOSED, { type: "abrir_defplay" });
    const s2 = flowReducer(s1, { type: "elegir_defplay_tipo", tipoEvento: "SAFETY" });
    const s3 = flowReducer(s2, { type: "elegir_equipo", team: "visitante" });
    expect(s3).toEqual({ step: "defplay_player", tipoEvento: "SAFETY", team: "visitante" });
  });

  it("cerrar vuelve a CLOSED desde cualquier paso", () => {
    const abierto: FlowState = { step: "flag_player", tipoEvento: "FALTA_PERSONAL", team: "local" };
    expect(flowReducer(abierto, { type: "cerrar" })).toBe(CLOSED);
  });

  it("ignora acciones que no corresponden al paso actual (toques fuera de orden)", () => {
    // Elegir jugador de TD cuando el modal está cerrado, o elegir equipo en
    // el paso de tipo de flag: el estado no debe cambiar.
    expect(flowReducer(CLOSED, { type: "elegir_td_tipo", tipoEvento: "TD" })).toBe(CLOSED);
    const flagType: FlowState = { step: "flag_type" };
    expect(flowReducer(flagType, { type: "elegir_equipo", team: "local" })).toBe(flagType);
    const tdType: FlowState = { step: "td_type", team: "local" };
    expect(flowReducer(tdType, { type: "elegir_flag_tipo", tipoEvento: "EXPULSION" })).toBe(
      tdType,
    );
  });

  it("abrir otro flujo a mitad de uno lo reemplaza (no se acumulan pasos)", () => {
    const enTd: FlowState = { step: "td_player", team: "local", tipoEvento: "TD" };
    expect(flowReducer(enTd, { type: "abrir_flag" })).toEqual({ step: "flag_type" });
  });
});
