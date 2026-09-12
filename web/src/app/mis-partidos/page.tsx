import Link from "next/link";
import { authedFetch, getSessionUser } from "@/lib/server-api";
import type { Partido, EstadoPartido } from "@/lib/types";

const ESTADO_LABEL: Record<EstadoPartido, string> = {
  PROGRAMADO: "Programado",
  EN_CURSO: "En curso",
  FINALIZADO: "Finalizado",
};

const ESTADO_BADGE: Record<EstadoPartido, string> = {
  PROGRAMADO: "bg-foreground/10 text-foreground/70",
  EN_CURSO: "bg-green-500/15 text-green-600 dark:text-green-400",
  FINALIZADO: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

export default async function MisPartidosPage() {
  const [partidos, yo] = await Promise.all([
    authedFetch<Partido[]>("/partidos/asignados"),
    getSessionUser(),
  ]);

  return (
    <main className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full gap-4">
      <header className="glass-panel rounded-3xl p-5 mb-2 flex items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest opacity-60">
            Pañuelo sin efecto
          </span>
          <h1 className="font-extrabold text-2xl tracking-tight">Mis partidos</h1>
        </div>
        <Link href="/" className="text-xs font-semibold opacity-70 hover:underline shrink-0">
          Marcadores públicos
        </Link>
      </header>

      <Link
        href="/arbitrar"
        className="rounded-2xl p-4 bg-panuelo text-[#1a1600] font-black text-lg text-center shadow-lg active:scale-[0.98] transition-transform"
      >
        + Partido rápido
      </Link>

      {partidos.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-2 py-16">
          <span className="text-5xl opacity-50">🏈</span>
          <p className="font-semibold">Todavía no tienes partidos asignados.</p>
          {yo && yo.rol !== "ARBITRO" && (
            <Link href="/admin" className="text-sm font-semibold text-blue-500 hover:underline mt-2">
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
                className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-3 active:scale-[0.98] transition-transform"
              >
                <div>
                  <p className="text-xs opacity-60 font-semibold">
                    {partido.categoria?.liga.nombre} · {partido.categoria?.nombre}
                  </p>
                  <p className="font-bold">
                    {partido.equipoLocal?.nombre} vs {partido.equipoVisitante?.nombre}
                  </p>
                  <p className="text-xs opacity-60">
                    {new Date(partido.fechaHora).toLocaleString("es-MX", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${ESTADO_BADGE[partido.estado]}`}>
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
