/**
 * Marca de la liga demo: datos ficticios para que cualquiera vea la
 * plataforma funcionando. Va junto al nombre de la liga para que nadie la
 * confunda con una liga real.
 */
export function EtiquetaDemo() {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="rounded-md bg-panuelo px-2 py-0.5 font-display text-sm font-bold uppercase tracking-[0.08em] text-[#0A1A33]">
        Demo
      </span>
      <span className="text-sm text-suave">Liga de ejemplo, los datos son ficticios</span>
    </span>
  );
}
