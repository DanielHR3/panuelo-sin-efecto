import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPublico } from "@/lib/publico";
import type { PerfilJugador } from "@/lib/types";
import { Despertando } from "../../_publico/Despertando";
import { EncabezadoPublico } from "../../_publico/EncabezadoPublico";
import { fechaCorta } from "../../_publico/formato";

export const dynamic = "force-dynamic";

const CIFRAS: { clave: keyof PerfilJugador["estadisticas"]; etiqueta: string }[] = [
  { clave: "puntos", etiqueta: "Puntos" },
  { clave: "td", etiqueta: "Touchdowns" },
  { clave: "pickSix", etiqueta: "Pick six" },
  { clave: "pat1", etiqueta: "Extras de 1" },
  { clave: "pat2", etiqueta: "Conversiones de 2" },
  { clave: "safety", etiqueta: "Safeties" },
  { clave: "intercepciones", etiqueta: "Intercepciones" },
  { clave: "sacks", etiqueta: "Sacks" },
  { clave: "mvps", etiqueta: "MVP del partido" },
  { clave: "partidos", etiqueta: "Partidos con jugada" },
  { clave: "faltas", etiqueta: "Faltas" },
];

export default async function JugadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultado = await fetchPublico<PerfilJugador>(`/publico/jugadores/${id}`);
  if (!resultado.ok && resultado.motivo === "no-encontrado") notFound();

  return (
    <div className="flex-1 flex flex-col">
      <EncabezadoPublico />
      {resultado.ok && (
        <section className="campo-yardas">
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 text-tiza flex items-end gap-5">
            <span className="font-black tabular-nums tracking-tighter text-6xl sm:text-8xl leading-none">
              #{resultado.data.numeroJersey}
            </span>
            <div className="flex flex-col gap-1 pb-1 min-w-0">
              <h1 className="font-black text-2xl sm:text-4xl leading-tight tracking-tight break-words">
                {resultado.data.nombre}
              </h1>
              <p className="text-sm sm:text-base opacity-90 leading-snug">
                {resultado.data.equipo.nombre} ·{" "}
                <Link href={`/categoria/${resultado.data.categoria.id}`} className="hover:underline">
                  {resultado.data.categoria.nombre}
                </Link>{" "}
                · {resultado.data.liga.nombre}
              </p>
            </div>
          </div>
        </section>
      )}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-8">
        {!resultado.ok ? (
          <Despertando />
        ) : (
          <>
            <section>
              <h2 className="font-bold text-xl border-b-2 border-foreground/80 pb-2 mb-3">Temporada</h2>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                {CIFRAS.map((c) => (
                  <div key={c.clave} className="flex flex-col">
                    <dd className="font-black text-3xl tabular-nums leading-none order-1">
                      {resultado.data.estadisticas[c.clave]}
                    </dd>
                    <dt className="text-xs opacity-60 mt-1 order-2">{c.etiqueta}</dt>
                  </div>
                ))}
              </dl>
            </section>

            <section>
              <h2 className="font-bold text-xl border-b-2 border-foreground/80 pb-2 mb-1">Partidos</h2>
              {resultado.data.partidos.length === 0 ? (
                <p className="text-sm opacity-60 py-3">Todavía no registra jugadas en ningún partido.</p>
              ) : (
                <ul>
                  {resultado.data.partidos.map((p) => (
                    <li
                      key={p.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 border-b border-foreground/10 last:border-b-0 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {p.equipoLocal.nombre}{" "}
                          <span className="tabular-nums opacity-70">
                            {p.marcadorLocal}–{p.marcadorVisitante}
                          </span>{" "}
                          {p.equipoVisitante.nombre}
                        </p>
                        <p className="text-xs opacity-60">
                          {fechaCorta(p.fechaHora)}
                          {p.esMvp ? " · MVP del partido" : ""}
                        </p>
                      </div>
                      <div className="text-right tabular-nums">
                        <p className="font-black text-lg leading-none">{p.puntos}</p>
                        <p className="text-xs opacity-60">
                          {p.td} TD
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
