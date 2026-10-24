import Link from "next/link";
import { Icono } from "@/components/icons/Icono";
import { EtiquetaDemo } from "./_publico/EtiquetaDemo";
import { fetchPublico } from "@/lib/publico";
import type { CategoriaPublica, LigaPublica, PartidoPublico, ResumenPublico } from "@/lib/types";
import { Despertando } from "./_publico/Despertando";
import { EncabezadoPublico } from "./_publico/EncabezadoPublico";
import { Lideres } from "./_publico/Lideres";
import { FilaMarcador, FilaProximo, LISTA_PARTIDOS, MarcadorHero } from "./_publico/Marcador";
import { TablaPosiciones } from "./_publico/TablaPosiciones";

export const dynamic = "force-dynamic";

/** El partido que va al hero: uno en juego, o si no, el resultado más reciente. */
function partidoDestacado(ligas: LigaPublica[]): { partido: PartidoPublico; liga: string; etiqueta: string } | null {
  let reciente: { partido: PartidoPublico; liga: string } | null = null;
  for (const liga of ligas) {
    for (const cat of liga.categorias) {
      for (const p of cat.recientes) {
        const nombre = `${liga.nombre} · ${cat.nombre}`;
        if (p.estado === "EN_CURSO") return { partido: p, liga: nombre, etiqueta: "En juego" };
        if (!reciente || new Date(p.fechaHora) > new Date(reciente.partido.fechaHora)) {
          reciente = { partido: p, liga: nombre };
        }
      }
    }
  }
  return reciente ? { ...reciente, etiqueta: "Último resultado" } : null;
}

export default async function LandingPage() {
  const resultado = await fetchPublico<ResumenPublico>("/publico/resumen");
  const ligas = resultado.ok ? resultado.data.ligas : [];
  const destacado = partidoDestacado(ligas);

  return (
    <div className="flex-1 flex flex-col">
      <EncabezadoPublico />

      {/* La presentación va siempre arriba: antes el marcador destacado la
          reemplazaba y en el celular la portada parecía la página de una liga. */}
      <section className="border-b border-texto/10">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
          <div className="flex flex-col gap-4 max-w-2xl">
            <h1 className="titulo-estadio text-4xl sm:text-7xl leading-[0.92]">
              El marcador de tu liga, en vivo y sin papel.
            </h1>
            <p className="text-base sm:text-lg text-suave max-w-prose">
              Los árbitros anotan desde el celular, aunque no haya señal en el campo. Aquí
              aparecen los resultados, la tabla de posiciones y las estadísticas de cada
              jugador en cuanto termina el partido.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Link
                href="/registro"
                className="boton-panuelo px-5 py-3 min-h-12 text-lg text-center active:scale-95 transition-transform"
              >
                Registra tu liga · 1 mes gratis
              </Link>
              <Link
                href="/arbitrar"
                className="px-5 py-3 min-h-12 rounded-lg border-2 border-texto/20 font-display font-bold uppercase tracking-[0.04em] text-center hover:border-panuelo-texto"
              >
                Arbitrar un partido ahora
              </Link>
            </div>
            <p className="text-sm text-suave">Arbitrar no requiere cuenta ni contraseña.</p>
            <Link
              href="/como-funciona"
              className="self-start inline-flex items-center gap-2 min-h-11 font-semibold text-panuelo-texto underline"
            >
              <Icono nombre="monitor" />
              Cómo funciona (video de 45 s)
            </Link>
          </div>
          {destacado && (
            <MarcadorHero partido={destacado.partido} etiqueta={destacado.etiqueta} liga={destacado.liga} />
          )}
        </div>
      </section>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-12">
        {!resultado.ok ? (
          <Despertando />
        ) : ligas.length === 0 ? (
          <SinLigas />
        ) : (
          ligas.map((liga) => <SeccionLiga key={liga.id} liga={liga} />)
        )}
      </main>

      <footer className="border-t border-texto/10">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-suave">
          <span>Pañuelo sin efecto · arbitraje de flag football</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/arbitrar" className="font-semibold hover:underline">
              Arbitrar sin cuenta
            </Link>
            <Link href="/login" className="font-semibold hover:underline">
              ¿Diriges una liga? Entra aquí
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

/** Etiqueta de sección: mayúsculas chicas con tracking, en texto suave. */
const ETIQUETA = "text-xs font-bold uppercase tracking-[0.14em] text-suave";

function SinLigas() {
  return (
    <section className="max-w-prose flex flex-col gap-3">
      <h2 className="titulo-estadio text-3xl">Todavía no hay ligas registradas</h2>
      <p className="text-suave">
        Cuando un administrador registre su liga y sus árbitros empiecen a anotar, los marcadores
        y las tablas aparecerán en esta página sin que nadie tenga que capturarlos.
      </p>
    </section>
  );
}

function SeccionLiga({ liga }: { liga: LigaPublica }) {
  const conActividad = liga.categorias.filter(tieneActividad);
  const vacias = liga.categorias.filter((c) => !tieneActividad(c));
  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        {liga.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa configurada por la liga
          <img src={liga.logoUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-panel" />
        )}
        <div className="flex flex-col gap-1">
          <h2 className="titulo-estadio text-3xl sm:text-4xl leading-none">{liga.nombre}</h2>
          {liga.esDemo && <EtiquetaDemo />}
        </div>
      </header>
      {liga.categorias.length === 0 ? (
        <p className="text-sm text-suave">Esta liga todavía no tiene categorías.</p>
      ) : (
        <>
          {conActividad.map((cat) => (
            <BloqueCategoria key={cat.id} categoria={cat} />
          ))}
          {vacias.length > 0 && (
            <p className="text-sm text-suave">
              Sin partidos todavía: {vacias.map((c) => c.nombre).join(", ")}.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** Una categoría "vacía" no tiene ni equipos ni partidos: no merece un bloque entero. */
function tieneActividad(cat: CategoriaPublica): boolean {
  return cat.tabla.length > 0 || cat.recientes.length > 0 || cat.proximos.length > 0;
}

function BloqueCategoria({ categoria }: { categoria: CategoriaPublica }) {
  return (
    <article className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-x-10 gap-y-6">
      <div className="lg:col-span-2 flex items-baseline justify-between gap-3 border-b-2 border-texto pb-2">
        <h3 className="titulo-estadio text-2xl leading-none">{categoria.nombre}</h3>
        <Link
          href={`/categoria/${categoria.id}`}
          className="text-sm font-display font-bold uppercase tracking-[0.08em] text-panuelo-texto hover:underline"
        >
          Ver todo
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className={ETIQUETA}>Tabla de posiciones</h4>
        <TablaPosiciones filas={categoria.tabla} compacta />
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h4 className={ETIQUETA}>Resultados</h4>
          {categoria.recientes.length === 0 ? (
            <p className="text-sm text-suave py-3">Aún no se juega el primer partido.</p>
          ) : (
            <ul className={LISTA_PARTIDOS}>{categoria.recientes.map((p) => <FilaMarcador key={p.id} partido={p} />)}</ul>
          )}
        </div>
        {categoria.proximos.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className={ETIQUETA}>Próximos</h4>
            <ul className={LISTA_PARTIDOS}>{categoria.proximos.map((p) => <FilaProximo key={p.id} partido={p} />)}</ul>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <h4 className={ETIQUETA}>Líderes de puntos</h4>
          <Lideres lideres={categoria.lideres} />
        </div>
      </div>
    </article>
  );
}
