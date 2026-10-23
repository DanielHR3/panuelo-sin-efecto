import Link from "next/link";
import { Icono } from "@/components/icons/Icono";
import { authedFetch, getSessionUser } from "@/lib/server-api";
import type { Partido, EstadoPartido } from "@/lib/types";

const ESTADO_LABEL: Record<EstadoPartido, string> = {
  PROGRAMADO: "Programado",
  EN_CURSO: "En curso",
  FINALIZADO: "Finalizado",
};

const ESTADO_BADGE: Record<EstadoPartido, string> = {
  PROGRAMADO: "border border-texto/20 text-suave",
  EN_CURSO: "bg-panuelo text-[#0A1A33]",
  FINALIZADO: "bg-panel-alterno text-texto",
};

export default async function MisPartidosPage() {
  const [partidos, yo] = await Promise.all([
    authedFetch<Partido[]>("/partidos/asignados"),
    getSessionUser(),
  ]);

  return (
    <main className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full gap-4">
      <header className="panel p-5 mb-2 flex items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-suave">
            Pañuelo sin efecto
          </span>
          <h1 className="titulo-estadio text-3xl leading-none mt-1">Mis partidos</h1>
        </div>
        <Link href="/" className="text-xs font-semibold text-suave hover:underline shrink-0">
          Marcadores públicos
        </Link>
      </header>

      <Link
        href="/arbitrar"
        className="boton-panuelo p-4 text-xl text-center active:scale-[0.98] transition-transform"
      >
        + Partido rápido
      </Link>

      {partidos.length === 0 ? (
        <div className="panel p-8 flex flex-col items-center justify-center text-center gap-2 py-16">
          <Icono nombre="touchdown" className="text-5xl text-suave" />
          <p className="font-semibold">Todavía no tienes partidos asignados.</p>
          {yo && yo.rol !== "ARBITRO" && (
            <Link href="/admin" className="text-sm font-semibold text-panuelo-texto hover:underline mt-2">
              Ir al panel admin →
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {partidos.map((partido) => (
            <li key={partido.id}>
              <Link
                href={`/partido/${partido.id}`}
                className="panel p-4 flex items-center justify-between gap-3 active:scale-[0.98] transition-transform"
              >
                <div>
                  <p className="text-xs text-suave font-semibold">
                    {partido.categoria?.liga.nombre} · {partido.categoria?.nombre}
                  </p>
                  <p className="font-display italic font-extrabold uppercase text-lg leading-tight">
                    {partido.equipoLocal?.nombre} vs {partido.equipoVisitante?.nombre}
                  </p>
                  <p className="text-xs text-suave">
                    {new Date(partido.fechaHora).toLocaleString("es-MX", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-[0.08em] shrink-0 ${ESTADO_BADGE[partido.estado]}`}>
                  {ESTADO_LABEL[partido.estado]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
