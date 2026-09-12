import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getSessionUser } from "@/lib/server-api";
import type { Liga, Equipo, EquipoConRoster, Partido } from "@/lib/types";

export default async function AdminDashboard() {
  const [ligas, yo] = await Promise.all([apiFetch<Liga[]>("/ligas"), getSessionUser()]);
  const categorias = ligas.flatMap((l) => l.categorias);

  // Fan-out en 3 tandas paralelas. Con el volumen de datos de una app
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
            Bienvenido{yo ? `, ${yo.email.split("@")[0]}` : ""} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Aquí tienes el resumen general de tus ligas deportivas.</p>
        </div>
        <Link
          href="/admin/ligas"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95 w-full md:w-auto text-center"
        >
          + Nueva Liga
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard title="Ligas Activas" value={ligas.length} icon="🏆" />
        <StatCard title="Equipos Registrados" value={equipos.length} icon="🛡️" />
        <StatCard title="Jugadores Totales" value={totalJugadores} icon="🏃" />
        <StatCard title="Partidos por Jugar" value={partidosPorJugar} icon="🏈" />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm mt-8">
        <h3 className="font-bold text-xl mb-4">Actividad Reciente</h3>
        {recientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="text-5xl mb-4 opacity-50">📭</span>
            <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Tu base de datos está limpia.</p>
            <p className="text-sm mt-1">Comienza haciendo clic en &laquo;+ Nueva Liga&raquo; para dar de alta un torneo.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-zinc-800">
            {recientes.map((partido) => {
              const local = equipos.find((e) => e.id === partido.equipoLocalId)?.nombre ?? "?";
              const visitante = equipos.find((e) => e.id === partido.equipoVisitanteId)?.nombre ?? "?";
              return (
                <li key={partido.id} className="py-3 flex items-center justify-between gap-3">
                  <span className="font-medium text-sm">
                    {local} vs {visitante}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(partido.fechaHora).toLocaleDateString("es-MX", { dateStyle: "medium" })}
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

function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{title}</p>
        <h3 className="text-4xl font-black">{value}</h3>
      </div>
      <div className="text-3xl p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl shadow-inner">
        {icon}
      </div>
    </div>
  );
}
