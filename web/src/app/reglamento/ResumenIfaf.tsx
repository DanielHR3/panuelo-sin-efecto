import { IFAF_EDICION, IFAF_REGLAS_URL, RESUMEN_IFAF } from "@/lib/reglamento-ifaf";
import { Icono } from "@/components/icons/Icono";

/** Resumen propio de las reglas clave de IFAF + enlace al reglamento oficial. */
export function ResumenIfaf() {
  return (
    <section className="flex flex-col gap-5">
      <div className="panel p-4 sm:p-5 flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-suave">{IFAF_EDICION}</p>
        <p className="text-sm text-suave">
          Resumen de las reglas que más se usan en un partido 5 vs 5. Es un resumen nuestro, no el texto oficial:
          ante cualquier duda manda el reglamento de IFAF.
        </p>
        <a
          href={IFAF_REGLAS_URL}
          target="_blank"
          rel="noopener"
          className="self-start inline-flex items-center gap-2 font-semibold text-panuelo-texto underline min-h-11"
        >
          <Icono nombre="reglamento" />
          Ver el reglamento oficial de IFAF
        </a>
      </div>
      {RESUMEN_IFAF.map((s) => (
        <section key={s.titulo} className="panel p-4 sm:p-5">
          <h2 className="titulo-estadio text-xl mb-2">{s.titulo}</h2>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed list-disc pl-5">
            {s.puntos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
