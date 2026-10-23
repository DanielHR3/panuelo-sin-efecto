import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPublico } from "@/lib/publico";
import type { AnotadorPublico, ResumenPartido } from "@/lib/types";
import { Despertando } from "../../_publico/Despertando";
import { EncabezadoPublico } from "../../_publico/EncabezadoPublico";
import { fechaHora } from "../../_publico/formato";
import { TableroEstadio } from "../../_publico/Marcador";
import { Icono } from "@/components/icons/Icono";
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
      <section className="border-b border-texto/10">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-4">
          <TableroEstadio
            local={p.equipoLocal.nombre}
            visitante={p.equipoVisitante.nombre}
            marcadorLocal={p.marcadorLocal}
            marcadorVisitante={p.marcadorVisitante}
            enJuego={p.estado === "EN_CURSO"}
            linea={`${estado} · ${fechaHora(p.fechaHora)}`}
          />
          {p.mvp && (
            <p className="flex items-center gap-2 text-sm sm:text-base">
              <Icono nombre="trofeo" className="text-panuelo-texto text-lg shrink-0" />
              <span className="font-display italic font-extrabold uppercase tracking-[0.08em] text-panuelo-texto">MVP</span>{" "}
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

        <dl className="panel text-sm flex flex-col gap-1 px-4 py-3">
          {p.arbitros.length > 0 && (
            <div className="flex gap-2">
              <dt className="text-suave w-20 shrink-0">Arbitró</dt>
              <dd className="font-semibold">{p.arbitros.map((a) => a.nombre).join(", ")}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="text-suave w-20 shrink-0">{p.liga.esRapida ? "Partido" : "Liga"}</dt>
            <dd className="font-semibold">
              {p.liga.esRapida ? (
                "Partido rápido"
              ) : (
                <Link href={`/categoria/${p.categoria.id}`} className="text-panuelo-texto hover:underline">
                  {p.liga.nombre} · {p.categoria.nombre}
                </Link>
              )}
            </dd>
          </div>
        </dl>

        <CompartirResultado resumen={p} />

        <p className="text-xs text-suave">
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
      <h2 className="titulo-estadio text-lg leading-none border-b-2 border-texto pb-1 mb-2 truncate">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="text-sm text-suave">Sin anotaciones</p>
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
                    <span className="text-suave">#{a.numeroJersey}</span> {a.nombre}
                  </>
                ) : (
                  <span className="text-suave">Sin jugador</span>
                )}
              </span>
              <span className="font-display italic font-extrabold text-base tabular-nums shrink-0">{a.puntos}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
