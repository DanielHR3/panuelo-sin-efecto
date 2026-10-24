import Link from "next/link";
import { authedFetch } from "@/lib/server-api";
import { fetchPublico } from "@/lib/publico";
import type { Liga } from "@/lib/types";
import { Vacio } from "../_components/Vacio";
import { ROTULO, TITULO_PAGINA } from "../_components/estilos";
import { ReglamentoForm } from "./ReglamentoForm";

interface InfoReglamento {
  propio: { nombre: string; actualizado: string } | null;
}

export default async function ReglamentoAdminPage() {
  const ligas = (await authedFetch<Liga[]>("/ligas")).filter((l) => l.tipo !== "RAPIDA");
  const info = await Promise.all(
    ligas.map((l) => fetchPublico<InfoReglamento>(`/publico/ligas/${l.id}/reglamento`, { revalidarSegundos: 0 })),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className={TITULO_PAGINA}>Reglamento</h1>
        <p className="text-suave mt-2">
          Tu liga muestra el resumen del reglamento IFAF de Flag Football. Si juegas con reglas propias, sube tu PDF y
          lo verán tus árbitros y equipos.
        </p>
      </header>

      {ligas.length === 0 && (
        <Vacio icono="reglamento" texto="Primero crea una liga.">
          <Link href="/admin/ligas" className="font-semibold underline">
            Crear liga
          </Link>
        </Vacio>
      )}

      {ligas.map((liga, i) => {
        const r = info[i];
        const propio = r.ok ? r.data.propio : null;
        return (
          <section key={liga.id} className="panel p-4 sm:p-5 flex flex-col gap-3">
            <p className={ROTULO}>{liga.nombre}</p>
            <p className="font-semibold">{propio ? `Reglamento propio: ${propio.nombre}` : "Usa el reglamento IFAF (resumen)"}</p>
            <Link href={`/reglamento/${liga.id}`} target="_blank" className="self-start text-sm font-semibold text-panuelo-texto underline">
              Ver cómo lo ven tus equipos
            </Link>
            <ReglamentoForm ligaId={liga.id} tienePropio={Boolean(propio)} />
          </section>
        );
      })}
    </div>
  );
}
