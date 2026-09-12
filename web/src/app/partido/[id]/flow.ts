import type { TipoEvento } from "@/lib/types";

export type TeamSide = "local" | "visitante";
export type TdTipo = Extract<TipoEvento, "TD" | "PICK_SIX">;
export type FlagTipo = Extract<TipoEvento, "FALTA_PERSONAL" | "EXPULSION">;
export type DefplayTipo = Extract<TipoEvento, "SACK" | "INTERCEPCION" | "SAFETY">;

/**
 * Estado del modal multi-paso. Cada variante lleva ya todo lo que se
 * necesita para volver un paso atrás o completar el registro del evento.
 */
export type FlowState =
  | { step: "closed" }
  | { step: "td_type"; team: TeamSide }
  | { step: "td_player"; team: TeamSide; tipoEvento: TdTipo }
  | { step: "flag_type" }
  | { step: "flag_team"; tipoEvento: FlagTipo }
  | { step: "flag_player"; tipoEvento: FlagTipo; team: TeamSide }
  | { step: "defplay_type" }
  | { step: "defplay_team"; tipoEvento: DefplayTipo }
  | { step: "defplay_player"; tipoEvento: DefplayTipo; team: TeamSide };

export type FlowAction =
  | { type: "abrir_td"; team: TeamSide }
  | { type: "abrir_flag" }
  | { type: "abrir_defplay" }
  | { type: "elegir_td_tipo"; tipoEvento: TdTipo }
  | { type: "elegir_flag_tipo"; tipoEvento: FlagTipo }
  | { type: "elegir_defplay_tipo"; tipoEvento: DefplayTipo }
  | { type: "elegir_equipo"; team: TeamSide }
  | { type: "cerrar" };

export const CLOSED: FlowState = { step: "closed" };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "abrir_td":
      return { step: "td_type", team: action.team };
    case "abrir_flag":
      return { step: "flag_type" };
    case "abrir_defplay":
      return { step: "defplay_type" };
    case "elegir_td_tipo":
      if (state.step !== "td_type") return state;
      return { step: "td_player", team: state.team, tipoEvento: action.tipoEvento };
    case "elegir_flag_tipo":
      if (state.step !== "flag_type") return state;
      return { step: "flag_team", tipoEvento: action.tipoEvento };
    case "elegir_defplay_tipo":
      if (state.step !== "defplay_type") return state;
      return { step: "defplay_team", tipoEvento: action.tipoEvento };
    case "elegir_equipo":
      if (state.step === "flag_team") {
        return { step: "flag_player", tipoEvento: state.tipoEvento, team: action.team };
      }
      if (state.step === "defplay_team") {
        return { step: "defplay_player", tipoEvento: state.tipoEvento, team: action.team };
      }
      return state;
    case "cerrar":
      return CLOSED;
    default:
      return state;
  }
}

export const TD_LABEL: Record<TdTipo, string> = {
  TD: "🏈 Touchdown",
  PICK_SIX: "🛡️ Pick Six (INT)",
};

export const FLAG_LABEL: Record<FlagTipo, string> = {
  FALTA_PERSONAL: "⚠️ Foul Personal",
  EXPULSION: "🤬 Conducta Antideportiva",
};

export const DEFPLAY_LABEL: Record<DefplayTipo, string> = {
  SACK: "🛡️ Sack",
  INTERCEPCION: "🎯 Intercepción",
  SAFETY: "🔒 Safety",
};

export const STEP_TITLE: Record<Exclude<FlowState["step"], "closed">, string> = {
  td_type: "¿Cómo fue la anotación?",
  td_player: "¿Quién anotó?",
  flag_type: "¿Qué tipo de castigo?",
  flag_team: "¿Qué equipo cometió la falta?",
  flag_player: "¿Qué jugador fue?",
  defplay_type: "¿Sack, intercepción o safety?",
  defplay_team: "¿Qué equipo hizo la jugada?",
  defplay_player: "¿Qué jugador la hizo?",
};
