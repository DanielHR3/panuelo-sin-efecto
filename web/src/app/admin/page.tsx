import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { authedFetch } from "@/lib/server-api";
import { ESTADO_BADGE, ESTADO_LABEL } from "@/lib/estado-partido";
import type { Liga, Equipo, EquipoConRoster, Partido } from "@/lib/types";
import { CountUpNumber } from "./_components/CountUpNumber";

// Colores literales por estadística: Tailwind escanea el código fuente en
// busca de nombres de clase completos, no de fragmentos armados en runtime.
const STAT_ACCENT = {
  ligas: { chip: "bg-amber-100 dark:bg-amber-950/40" },
  equipos: { chip: "bg-blue-100 dark:bg-blue-950/40" },
  jugadores: { chip: "bg-emerald-100 dark:bg-emerald-950/40" },
  partidos: { chip: "bg-orange-100 dark:bg-orange-950/40" },
} as const;

export default async function AdminDashboard() {
  const [ligas, yo] = await Promise.all([
    apiFetch<Liga[]>("/ligas"),
    authedFetch<{ nombre: string }>("/usuarios/me").catch(() => null),
  ]);
  const categorias = ligas.flatMap((l) => l.categorias);

  // Fan-out en 2 tandas paralelas. Con el volumen de datos de una app
  // recién arrancada es aceptable; si esto crece, lo correcto es mover el
  // conteo a un endpoint /stats agregado en el backend.
  const [equiposPorCategoria, partidosPorCategoria] = await Promise.all([
    Promise.all(categorias.map((c) => apiFetch<Equipo[]>(`/categorias/${c.id}/equipos`))),
    Promise.all(categorias.map((c) => apiFetch<Partido[]>(`/categorias/${c.id}/partidos`))),
  ]);
  const equipos = equiposPorCategoria.flat();
  const partidos = partidosPorCategoria.flat();
  const jugadoresPorEquipo = await Promise.all(
    equipos.map((e) => apiFetch<EquipoConRoster>(`/equipos/${e.id}`)),
  );
  const totalJugadores = jugadoresPorEquipo.reduce((sum, e) => sum + e.jugadores.length, 0);
  const partidosPorJugar = partidos.filter((p) => p.estado !== "FINALIZADO").length;

  const recientes = [...partidos]
    .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Bienvenido{yo ? `, ${yo.nombre.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Así van tus ligas hoy.</p>
        </div>
        <Link
          href="/admin/ligas"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95 w-full md:w-auto text-center"
        >
          + Nueva liga
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard title="Ligas activas" value={ligas.length} icon="🏆" accent={STAT_ACCENT.ligas} delayMs={0} />
        <StatCard title="Equipos registrados" value={equipos.length} icon="🛡️" accent={STAT_ACCENT.equipos} delayMs={120} />
        <StatCard title="Jugadores registrados" value={totalJugadores} icon="🏃" accent={STAT_ACCENT.jugadores} delayMs={240} />
        <StatCard title="Partidos por jugar" value={partidosPorJugar} icon="🏈" accent={STAT_ACCENT.partidos} delayMs={360} />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm mt-8">
        <h3 className="font-bold text-xl mb-4">Actividad reciente</h3>
        {recientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
            <span className="text-5xl mb-4 opacity-50">🏈</span>
            <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
              Todavía no hay partidos programados.
            </p>
            <p className="text-sm mt-1 max-w-xs">
              Crea una liga, da de alta sus equipos y programa el primer partido para verlo aquí.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-zinc-800">
            {recientes.map((partido) => {
              const local = equipos.find((e) => e.id === partido.equipoLocalId)?.nombre ?? "?";
              const visitante = equipos.find((e) => e.id === partido.equipoVisitanteId)?.nombre ?? "?";
              return (
                <li key={partido.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {local}{" "}
                      <span className="tabular-nums text-slate-400 dark:text-slate-500">
                        {partido.marcadorLocal}–{partido.marcadorVisitante}
                      </span>{" "}
                      {visitante}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(partido.fechaHora).toLocaleDateString("es-MX", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${ESTADO_BADGE[partido.estado]}`}>
                    {ESTADO_LABEL[partido.estado]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  accent,
  delayMs,
}: {
  title: string;
  value: number;
  icon: string;
  accent: { chip: string };
  delayMs: number;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">{title}</p>
        <h3 className="text-4xl font-black tabular-nums">
          <CountUpNumber value={value} delayMs={delayMs} />
        </h3>
      </div>
      <div className={`text-3xl p-4 rounded-2xl ${accent.chip}`}>{icon}</div>
    </div>
  );
}
