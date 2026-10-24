import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { API_URL } from "@/lib/api";
import { fetchPublico } from "@/lib/publico";
import { formatearFecha } from "@/lib/zona";
import { Icono } from "@/components/icons/Icono";
import { EncabezadoPublico } from "../../_publico/EncabezadoPublico";
import { Despertando } from "../../_publico/Despertando";
import { ResumenIfaf } from "../ResumenIfaf";

interface InfoReglamento {
  ligaId: string;
  liga: string;
  propio: { nombre: string; actualizado: string } | null;
}

export const metadata: Metadata = { title: "Reglamento de la liga · Pañuelo sin efecto" };

export default async function ReglamentoLigaPage({ params }: { params: Promise<{ ligaId: string }> }) {
  const { ligaId } = await params;
  const r = await fetchPublico<InfoReglamento>(`/publico/ligas/${encodeURIComponent(ligaId)}/reglamento`);
  if (!r.ok && r.motivo === "no-encontrado") notFound();

  return (
    <div className="flex-1 flex flex-col">
      <EncabezadoPublico />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
        {!r.ok ? (
          <Despertando />
        ) : (
          <>
            <header className="flex flex-col gap-1">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-suave">{r.data.liga}</p>
              <h1 className="titulo-estadio text-4xl sm:text-5xl leading-none">Reglamento</h1>
            </header>
            {r.data.propio ? (
              <section className="panel p-4 sm:p-5 flex flex-col gap-3">
                <p className="text-sm text-suave">
                  Esta liga juega con su propio reglamento
                  {` (actualizado el ${formatearFecha(r.data.propio.actualizado, { day: "numeric", month: "long", year: "numeric" })}).`}
                </p>
                <a
                  href={`${API_URL}/publico/ligas/${encodeURIComponent(ligaId)}/reglamento.pdf`}
                  target="_blank"
                  rel="noopener"
                  className="boton-panuelo px-5 py-3 min-h-12 inline-flex items-center justify-center gap-2"
                >
                  <Icono nombre="reglamento" />
                  Abrir reglamento (PDF)
                </a>
              </section>
            ) : (
              <ResumenIfaf />
            )}
          </>
        )}
      </main>
    </div>
  );
}
