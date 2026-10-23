import Link from "next/link";
import { EtiquetaDemo } from "@/app/_publico/EtiquetaDemo";
import { notFound } from "next/navigation";
import { fetchPublico } from "@/lib/publico";
import type { CategoriaPublicaDetalle } from "@/lib/types";
import { Despertando } from "../../_publico/Despertando";
import { EncabezadoPublico } from "../../_publico/EncabezadoPublico";
import { Lideres } from "../../_publico/Lideres";
import { FilaMarcador, FilaProximo, LISTA_PARTIDOS } from "../../_publico/Marcador";
import { TablaPosiciones } from "../../_publico/TablaPosiciones";

export const dynamic = "force-dynamic";

/** Título de sección: condensada itálica sobre una línea de cal. */
const TITULO_SECCION = "titulo-estadio text-2xl leading-none border-b-2 border-texto pb-2";

export default async function CategoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultado = await fetchPublico<CategoriaPublicaDetalle>(`/publico/categorias/${id}`);
  if (!resultado.ok && resultado.motivo === "no-encontrado") notFound();

  return (
    <div className="flex-1 flex flex-col">
      <EncabezadoPublico />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-8">
        {!resultado.ok ? (
          <Despertando />
        ) : (
          <>
            <header className="flex flex-col gap-1">
              <Link href="/" className="text-xs font-bold uppercase tracking-[0.14em] text-suave hover:underline">
                ← {resultado.data.liga.nombre}
              </Link>
              <h1 className="titulo-estadio text-4xl sm:text-6xl leading-none">{resultado.data.nombre}</h1>
              {resultado.data.liga.esDemo && <EtiquetaDemo />}
            </header>

            <section className="flex flex-col gap-2">
              <h2 className={TITULO_SECCION}>Tabla de posiciones</h2>
              <TablaPosiciones filas={resultado.data.tabla} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
              <section className="flex flex-col gap-2">
                <h2 className={TITULO_SECCION}>Resultados</h2>
                {resultado.data.recientes.length === 0 ? (
                  <p className="text-sm text-suave py-3">Aún no se juega el primer partido.</p>
                ) : (
                  <ul className={LISTA_PARTIDOS}>{resultado.data.recientes.map((p) => <FilaMarcador key={p.id} partido={p} />)}</ul>
                )}
                {resultado.data.proximos.length > 0 && (
                  <>
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-suave mt-4">Próximos</h3>
                    <ul className={LISTA_PARTIDOS}>{resultado.data.proximos.map((p) => <FilaProximo key={p.id} partido={p} />)}</ul>
                  </>
                )}
              </section>
              <section className="flex flex-col gap-2">
                <h2 className={TITULO_SECCION}>Líderes de puntos</h2>
                <Lideres lideres={resultado.data.lideres} />
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
