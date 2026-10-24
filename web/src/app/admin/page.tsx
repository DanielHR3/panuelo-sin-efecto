import Link from "next/link";
import { formatearFecha } from "@/lib/zona";
import { authedFetch } from "@/lib/server-api";
import { Icono, type NombreIcono } from "@/components/icons/Icono";
import { ESTADO_BADGE, ESTADO_BADGE_BASE, ESTADO_LABEL } from "@/lib/estado-partido";
import type { Liga, Equipo, EquipoConRoster, Partido } from "@/lib/types";
import { CountUpNumber } from "./_components/CountUpNumber";
import { avisoSuscripcion } from "@/lib/suscripcion";
import { Vacio } from "./_components/Vacio";
import { BOTON_PRIMARIO, ROTULO, TITULO_PAGINA } from "./_components/estilos";

const PASOS: { href: string; icono: NombreIcono; texto: string }[] = [
  { href: "/admin/equipos", icono: "escudo", texto: "Da de alta tus equipos" },
  { href: "/admin/arbitros", icono: "silbato", texto: "Registra a tus árbitros" },
  { href: "/admin/partidos", icono: "campo", texto: "Programa tus partidos" },
];

export default async function AdminDashboard() {
  const [ligas, yo] = await Promise.all([
    authedFetch<Liga[]>("/ligas"),
    authedFetch<{ nombre: string }>("/usuarios/me").catch(() => null),
  ]);
  const categorias = ligas.flatMap((l) => l.categorias);

  // Fan-out en 2 tandas paralelas. Con el volumen de datos de una app
  // recién arrancada es aceptable; si esto crece, lo correcto es mover el
  // conteo a un endpoint /stats agregado en el backend.
  const [equiposPorCategoria, partidosPorCategoria] = await Promise.all([
    Promise.all(categorias.map((c) => authedFetch<Equipo[]>(`/categorias/${c.id}/equipos`))),
    Promise.all(categorias.map((c) => authedFetch<Partido[]>(`/categorias/${c.id}/partidos`))),
  ]);
  const equipos = equiposPorCategoria.flat();
  const partidos = partidosPorCategoria.flat();
  const jugadoresPorEquipo = await Promise.all(
    equipos.map((e) => authedFetch<EquipoConRoster>(`/equipos/${e.id}`)),
  );
  const totalJugadores = jugadoresPorEquipo.reduce((sum, e) => sum + e.jugadores.length, 0);
  const partidosPorJugar = partidos.filter((p) => p.estado !== "FINALIZADO").length;

  const avisos = ligas.flatMap((liga) => {
    const aviso = liga.suscripcion ? avisoSuscripcion(liga.suscripcion) : null;
    return aviso ? [{ liga, aviso }] : [];
  });
  const enPrueba = ligas.some((l) => l.suscripcion?.estado === "PRUEBA");

  const recientes = [...partidos]
    .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className={`${TITULO_PAGINA} flex items-center gap-2`}>
            Bienvenido{yo ? `, ${yo.nombre.split(" ")[0]}` : ""}
            <Icono nombre="saludo" className="text-panuelo-texto" />
          </h1>
          <p className="text-suave mt-2">Así van tus ligas hoy.</p>
        </div>
        <Link href="/admin/ligas" className={`${BOTON_PRIMARIO} w-full md:w-auto text-center`}>
          + Nueva liga
        </Link>
      </header>

      {avisos.map(({ liga, aviso }) => (
        <section
          key={liga.id}
          role={aviso.tono === "alerta" ? "alert" : "status"}
          className={`panel p-4 sm:p-5 border-l-4 ${aviso.tono === "alerta" ? "border-l-peligro" : "border-l-panuelo"}`}
        >
          <p className={ROTULO}>{liga.nombre}</p>
          <p className="titulo-estadio text-xl sm:text-2xl leading-tight mt-1">{aviso.titulo}</p>
          <p className="text-sm text-suave mt-1">{aviso.detalle}</p>
        </section>
      ))}

      {enPrueba && (
        <section className="panel p-4 sm:p-5">
          <h2 className="titulo-estadio text-xl mb-3">Arma tu liga en 3 pasos</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PASOS.map((paso, i) => (
              <li key={paso.href}>
                <Link
                  href={paso.href}
                  className="flex items-center gap-3 rounded-lg bg-panel-alterno px-4 py-3 min-h-12 font-semibold hover:ring-2 hover:ring-panuelo"
                >
                  <span className="font-display italic font-extrabold text-2xl text-panuelo-texto">{i + 1}</span>
                  <Icono nombre={paso.icono} className="text-xl shrink-0" />
                  {paso.texto}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard title="Ligas activas" value={ligas.length} icon="trofeo" delayMs={0} />
        <StatCard title="Equipos registrados" value={equipos.length} icon="escudo" delayMs={120} />
        <StatCard title="Jugadores registrados" value={totalJugadores} icon="jugador" delayMs={240} />
        <StatCard title="Partidos por jugar" value={partidosPorJugar} icon="campo" delayMs={360} />
      </div>

      <section className="mt-8">
        <h3 className="titulo-estadio text-xl mb-3">Actividad reciente</h3>
        {recientes.length === 0 ? (
          <Vacio icono="touchdown" texto="Todavía no hay partidos programados.">
            Crea una liga, da de alta sus equipos y programa el primer partido para verlo aquí.
          </Vacio>
        ) : (
          <ul className="panel overflow-hidden">
            {recientes.map((partido) => {
              const local = equipos.find((e) => e.id === partido.equipoLocalId)?.nombre ?? "?";
              const visitante = equipos.find((e) => e.id === partido.equipoVisitanteId)?.nombre ?? "?";
              return (
                <li
                  key={partido.id}
                  className="px-4 py-3 flex items-center justify-between gap-3 odd:bg-panel even:bg-panel-alterno"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {local}{" "}
                      <span className="font-display italic font-extrabold text-base tabular-nums px-1">
                        {partido.marcadorLocal}–{partido.marcadorVisitante}
                      </span>{" "}
                      {visitante}
                    </p>
                    <p className="text-xs text-suave mt-0.5">
                      {formatearFecha(partido.fechaHora, { dateStyle: "medium" })}
                    </p>
                  </div>
                  <span className={`${ESTADO_BADGE_BASE} ${ESTADO_BADGE[partido.estado]}`}>
                    {ESTADO_LABEL[partido.estado]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  delayMs,
}: {
  title: string;
  value: number;
  icon: NombreIcono;
  delayMs: number;
}) {
  return (
    <div className="panel p-5 flex items-start justify-between gap-3 relative overflow-hidden">
      {/* Franja de pañuelo: el acento de cada tarjeta del marcador. */}
      <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-panuelo" />
      <div>
        <p className={`${ROTULO} mb-2`}>{title}</p>
        <h3 className="font-display italic font-extrabold text-5xl leading-none tabular-nums">
          <CountUpNumber value={value} delayMs={delayMs} />
        </h3>
      </div>
      <div className="text-2xl p-3 rounded-lg bg-panel-alterno text-suave">
        <Icono nombre={icon} />
      </div>
    </div>
  );
}
