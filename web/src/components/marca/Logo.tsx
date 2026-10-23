import type { JSX } from "react";

// Marca "yarda 50": campo a franjas, línea de cal al centro, el 50 dibujado a
// trazo (sin <text>, para no depender de la fuente) y el pañuelo amarillo con
// su nudo. Misma geometría que public/icon.svg.
// Es decorativo: va acompañado del nombre de la app, por eso aria-hidden.
const CAL = "#EEF2F8";
const TINTA = "#0A1A33";

export function Logo({
  tamano = 40,
  className,
}: {
  tamano?: number;
  className?: string;
}): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 132 132"
      width={tamano}
      height={tamano}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="132" height="132" rx="22" style={{ fill: "var(--franja-1, #1E5631)" }} />
      <g style={{ fill: "var(--franja-2, #256B3D)" }}>
        {/* La franja superior lleva las esquinas redondeadas del escudo. */}
        <path d="M0 22A22 22 0 0 1 22 0H110A22 22 0 0 1 132 22Z" />
        <rect y="44" width="132" height="22" />
        <rect y="88" width="132" height="22" />
      </g>
      <line x1="66" y1="0" x2="66" y2="132" stroke={CAL} strokeWidth="4" />
      <g fill="none" stroke={CAL} strokeWidth="8" strokeLinecap="butt" strokeLinejoin="miter">
        <path d="M50 56H32V70H41A7 7 0 0 1 48 77A7 7 0 0 1 41 84H30" />
        <path d="M92 56A7 7 0 0 1 99 63V77A7 7 0 0 1 85 77V63A7 7 0 0 1 92 56Z" />
      </g>
      <path d="M72 30L104 22L108 44L76 50Z" style={{ fill: "var(--panuelo, #FFD23F)" }} />
      <circle cx="96" cy="38" r="5" style={{ fill: "var(--panuelo, #FFD23F)" }} stroke={TINTA} strokeWidth="2" />
    </svg>
  );
}
