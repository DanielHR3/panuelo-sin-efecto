import type { JSX } from "react";

// Set de íconos propio de "Transmisión de estadio": trazo de 2px sobre una
// cuadrícula de 24, puntas redondeadas, color heredado (currentColor).
export type NombreIcono =
  | "touchdown"
  | "falta"
  | "campo"
  | "reloj"
  | "tabla"
  | "jugador"
  | "reglamento"
  | "compartir"
  | "trofeo"
  | "finalizar"
  | "corregir"
  | "intercambiar"
  | "candado"
  | "candado-abierto"
  | "sol"
  | "luna"
  | "alerta"
  | "silbato"
  | "corredor"
  | "escudo"
  | "recargar"
  | "sin-senal"
  | "menu"
  | "cerrar"
  | "saludo"
  | "monitor"
  | "grafica";

const TRAZOS: Record<NombreIcono, JSX.Element> = {
  // Balón ovalado con costuras.
  touchdown: (
    <>
      <path d="M4 20C4 11 11 4 20 4c0 9-7 16-16 16z" />
      <path d="M9 15l6-6" />
      <path d="M10.5 10.5l3 3M12.5 8.5l3 3" />
    </>
  ),
  // Pañuelo lanzado con su contrapeso.
  falta: (
    <>
      <path d="M5 6l10-2 3 11-10 3z" />
      <circle cx="14" cy="12" r="2.5" />
    </>
  ),
  campo: (
    <>
      <path d="M4 4v16M20 4v16" />
      <path d="M4 8h16M4 12h16M4 16h16" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="14" r="7" />
      <path d="M12 14v-4M10 3h4M12 3v4" />
    </>
  ),
  tabla: <path d="M4 20v-7h5v7M9 20V8h6v12M15 20v-9h5v9" />,
  jugador: <path d="M8 4L3 7l2 4 2-1v10h10V10l2 1 2-4-5-3c-1 2-2 3-4 3s-3-1-4-3z" />,
  reglamento: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 19V5" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  compartir: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 11l7.6-3.8M8.2 13l7.6 3.8" />
    </>
  ),
  trofeo: (
    <>
      <path d="M8 4h8v6a4 4 0 0 1-8 0z" />
      <path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3" />
      <path d="M12 14v4M8 20h8" />
    </>
  ),
  // Bandera a cuadros de fin de partido.
  finalizar: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h14v9H5" />
      <path d="M5 4h7v4.5H5zM12 8.5h7V13h-7z" fill="currentColor" />
    </>
  ),
  corregir: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13 7l4 4" />
    </>
  ),
  intercambiar: (
    <>
      <path d="M7 4L3 8l4 4M3 8h14" />
      <path d="M17 12l4 4-4 4M21 16H7" />
    </>
  ),
  candado: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  "candado-abierto": (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.7-1.5" />
    </>
  ),
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  luna: <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />,
  alerta: (
    <>
      <path d="M12 3L2 20h20z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  silbato: (
    <>
      <circle cx="8" cy="14" r="5" />
      <path d="M8 9h13v4h-8" />
      <path d="M8 14h.01" />
    </>
  ),
  // Jugador corriendo.
  corredor: (
    <>
      <circle cx="15" cy="4.5" r="2" />
      <path d="M7 10l4-2.5 3.5 1L17 12l3 1" />
      <path d="M14.5 8.5L12 14l4 3v4" />
      <path d="M12 14l-2.5 4H4" />
    </>
  ),
  escudo: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  recargar: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </>
  ),
  "sin-senal": (
    <>
      <path d="M2 8.8a15 15 0 0 1 4.3-2.6M10.5 4.6A15 15 0 0 1 22 8.8" />
      <path d="M5.5 12.5a10 10 0 0 1 3.4-2M15 10.6a10 10 0 0 1 3.5 1.9" />
      <path d="M9 16a5 5 0 0 1 6 0" />
      <path d="M12 20h.01" />
      <path d="M3 3l18 18" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  // Mano que saluda.
  saludo: (
    <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7a7 7 0 0 1-7 7h-.5a6 6 0 0 1-5-2.7L2.3 13.6a1.5 1.5 0 0 1 2.5-1.7L8 15" />
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  grafica: (
    <>
      <path d="M4 4v16h16" />
      <path d="M7 15l4-4 3 3 5-6" />
    </>
  ),
};

export const NOMBRES_ICONO = Object.keys(TRAZOS) as NombreIcono[];

export function Icono({
  nombre,
  className,
  titulo,
}: {
  nombre: NombreIcono;
  className?: string;
  titulo?: string;
}): JSX.Element {
  const accesible = titulo
    ? { role: "img" as const, "aria-label": titulo }
    : { "aria-hidden": true as const };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      className={className}
      {...accesible}
    >
      {TRAZOS[nombre]}
    </svg>
  );
}
