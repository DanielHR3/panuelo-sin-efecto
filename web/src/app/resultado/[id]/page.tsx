import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPublico } from "@/lib/publico";
import type { AnotadorPublico, ResumenPartido } from "@/lib/types";
import { Despertando } from "../../_publico/Despertando";
import { EncabezadoPublico } from "../../_publico/EncabezadoPublico";
import { fechaHora } from "../../_publico/formato";
import { CompartirResultado } from "./CompartirResultado";

export const dynamic = "force-dynamic";

/**
 * HU-2.7 fase 2: la pantalla que el árbitro comparte (o captura) al terminar.
 * Pública: el dueño de la liga la abre sin cuenta. Todo lo importante cabe
 * en la primera pantalla de un teléfono: marcador, anotadores, MVP, quién
 * arbitró y cuándo.
 */
export default async function ResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultado = await fetchPublico<ResumenPartido>(`/publico/partidos/${id}`, {
    revalidarSegundos: 10,
  });
  if (!resultado.ok && resultado.motivo === "no-encontrado") notFound();

  return (
    <div className="flex-1 flex flex-col">
      <EncabezadoPublico />
      {!resultado.ok ? (
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
          <Despertando />
        </main>
      ) : (
        <Resumen p={resultado.data} />
      )}
    </div>
  );
}

function Resumen({ p }: { p: ResumenPartido }) {
  const estado =
    p.estado === "FINALIZADO" ? "Final" : p.estado === "EN_CURSO" ? "En juego" : "Programado";
  const anotadoresDe = (equipoId: string) => p.anotadores.filter((a) => a.equipoId === equipoId);

  return (
    <>
      <section className="campo-yardas">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 text-tiza flex flex-col gap-4">
          <p className="text-sm font-semibold opacity-90">
            {estado} · {fechaHora(p.fechaHora)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 sm:gap-8">
            <p className="font-black tabular-nums tracking-tighter text-7xl sm:text-8xl leading-none whitespace-nowrap col-span-2 sm:col-span-1 sm:order-2 text-center">
              {p.marcadorLocal}
              <span className="opacity-50 mx-2 sm:mx-4">–</span>
              {p.marcadorVisitante}
            </p>
            <p className="text-xl sm:text-3xl font-bold leading-tight min-w-0 [overflow-wrap:anywhere] sm:order-1">
              {p.equipoLocal.nombre}
            </p>
            <p className="text-xl sm:text-3xl font-bold leading-tight text-right min-w-0 [overflow-wrap:anywhere] sm:order-3">
              {p.equipoVisitante.nombre}
            </p>
          </div>
          {p.mvp && (
            <p className="text-sm sm:text-base">
              <span className="text-panuelo font-black">MVP</span>{" "}
              <span className="font-semibold">
                #{p.mvp.numeroJersey} {p.mvp.nombre}
              </span>
            </p>
          )}
        </div>
      </section>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6">
        {p.anotadores.length > 0 && (
          <section className="grid grid-cols-2 gap-x-6 gap-y-2">
            <ListaAnotadores titulo={p.equipoLocal.nombre} filas={anotadoresDe(p.equipoLocal.id)} />
            <ListaAnotadores
              titulo={p.equipoVisitante.nombre}
              filas={anotadoresDe(p.equipoVisitante.id)}
              alineacion="der"
            />
          </section>
        )}

        <dl className="text-sm flex flex-col gap-1 border-t border-foreground/10 pt-4">
          {p.arbitros.length > 0 && (
            <div className="flex gap-2">
              <dt className="opacity-60 w-20 shrink-0">Arbitró</dt>
              <dd className="font-semibold">{p.arbitros.map((a) => a.nombre).join(", ")}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="opacity-60 w-20 shrink-0">{p.liga.esRapida ? "Partido" : "Liga"}</dt>
            <dd className="font-semibold">
              {p.liga.esRapida ? (
                "Partido rápido"
              ) : (
                <Link href={`/categoria/${p.categoria.id}`} className="hover:underline">
                  {p.liga.nombre} · {p.categoria.nombre}
                </Link>
              )}
            </dd>
          </div>
        </dl>

        <CompartirResultado resumen={p} />

        <p className="text-xs opacity-60">
          Marcador registrado con Pañuelo sin efecto.{" "}
          <Link href="/arbitrar" className="font-semibold hover:underline">
            Arbitra tu propio partido sin cuenta.
          </Link>
        </p>
      </main>
    </>
  );
}

function ListaAnotadores({
  titulo,
  filas,
  alineacion = "izq",
}: {
  titulo: string;
  filas: AnotadorPublico[];
  alineacion?: "izq" | "der";
}) {
  const der = alineacion === "der";
  return (
    <div className={`min-w-0 ${der ? "text-right" : ""}`}>
      <h2 className="font-bold text-sm border-b-2 border-foreground/80 pb-1 mb-2 truncate">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="text-sm opacity-60">Sin anotaciones</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {filas.map((a) => (
            <li
              key={`${a.equipoId}-${a.jugadorId ?? "sin"}`}
              className={`flex items-baseline gap-2 ${der ? "flex-row-reverse" : ""}`}
            >
              <span className="min-w-0 truncate">
                {a.nombre ? (
                  <>
                    <span className="opacity-60">#{a.numeroJersey}</span> {a.nombre}
                  </>
                ) : (
                  <span className="opacity-60">Sin jugador</span>
                )}
              </span>
              <span className="font-black tabular-nums shrink-0">{a.puntos}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
