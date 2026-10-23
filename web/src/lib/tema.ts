export type NombreToken =
  | "fondo"
  | "panel"
  | "panel-alterno"
  | "texto"
  | "suave"
  | "franja-1"
  | "franja-2"
  | "panuelo"
  | "panuelo-texto"
  | "local"
  | "visitante";

/**
 * Fuente única de los colores de "Transmisión de estadio". globals.css debe
 * repetir estos valores; el test de contraste lee este objeto.
 */
export const TOKENS: Record<"oscuro" | "claro", Record<NombreToken, string>> = {
  oscuro: {
    fondo: "#0A1A33",
    panel: "#13284A",
    "panel-alterno": "#102240",
    texto: "#EEF2F8",
    suave: "#B8C4D6",
    "franja-1": "#1E5631",
    "franja-2": "#256B3D",
    panuelo: "#FFD23F",
    "panuelo-texto": "#FFD23F",
    local: "#3473DA",
    visitante: "#D73D3D",
  },
  claro: {
    fondo: "#F4F6FA",
    panel: "#FFFFFF",
    "panel-alterno": "#EAF0F7",
    texto: "#0A1A33",
    suave: "#3D4F6B",
    "franja-1": "#1E5631",
    "franja-2": "#256B3D",
    panuelo: "#FFD23F",
    "panuelo-texto": "#8A6A00",
    local: "#1D4ED8",
    visitante: "#B91C1C",
  },
};
