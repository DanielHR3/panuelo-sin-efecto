export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Bienvenido, Daniel 👋</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Aquí tienes el resumen general de tus ligas deportivas.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95 w-full md:w-auto">
          + Nueva Liga
        </button>
      </header>

      {/* ESTADÍSTICAS RÁPIDAS (Mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard title="Ligas Activas" value="0" icon="🏆" />
        <StatCard title="Equipos Registrados" value="0" icon="🛡️" />
        <StatCard title="Jugadores Totales" value="0" icon="🏃" />
        <StatCard title="Partidos por Jugar" value="0" icon="🏈" />
      </div>

      {/* ACTIVIDAD RECIENTE */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm mt-8">
        <h3 className="font-bold text-xl mb-4">Actividad Reciente</h3>
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-4 opacity-50">📭</span>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Tu base de datos está limpia.</p>
          <p className="text-sm mt-1">Comienza haciendo clic en "+ Nueva Liga" para dar de alta un torneo.</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: string }) {
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
