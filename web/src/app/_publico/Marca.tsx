import { Logo } from "@/components/marca/Logo";

/** Logo yarda 50 + "PAÑUELO / SIN EFECTO" en condensada itálica. */
export function Marca({ tamano = 36, oculta = false }: { tamano?: number; oculta?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <Logo tamano={tamano} className="shrink-0" />
      {/* Bajo 360 px solo cabe el logo; el nombre queda para lectores de pantalla. */}
      <span
        className={`flex flex-col leading-none font-display italic uppercase min-w-0 ${oculta ? "max-[359px]:sr-only" : ""}`}
      >
        <span className="font-extrabold text-xl tracking-wide truncate">Pañuelo</span>{" "}
        <span className="font-bold text-[11px] tracking-[0.22em] text-panuelo-texto truncate">sin efecto</span>
      </span>
    </span>
  );
}
