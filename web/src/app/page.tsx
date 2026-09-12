import Link from "next/link";
import { fetchPublico } from "@/lib/publico";
import type { CategoriaPublica, LigaPublica, PartidoPublico, ResumenPublico } from "@/lib/types";
import { Despertando } from "./_publico/Despertando";
import { EncabezadoPublico } from "./_publico/EncabezadoPublico";
import { Lideres } from "./_publico/Lideres";
import { FilaMarcador, FilaProximo, MarcadorHero } from "./_publico/Marcador";
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

      <section className="campo-yardas">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
          {destacado ? (
            <MarcadorHero partido={destacado.partido} etiqueta={destacado.etiqueta} liga={destacado.liga} />
          ) : (
            <div className="text-tiza flex flex-col gap-5 max-w-2xl">
              <h1 className="font-black text-4xl sm:text-6xl leading-[0.95] tracking-tight">
                El marcador de tu liga, en vivo y sin papel.
              </h1>
              <p className="text-lg opacity-90 max-w-prose">
                Los árbitros anotan desde el celular, aunque no haya señal en el campo. Aquí
                aparecen los resultados, la tabla de posiciones y las estadísticas de cada
                jugador en cuanto termina el partido.
              </p>
              <Link
                href="/login"
                className="self-start px-5 py-3 rounded-xl bg-panuelo text-[#1a1600] font-bold shadow-lg active:scale-95 transition-transform"
              >
                Entrar a arbitrar
              </Link>
            </div>
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

      <footer className="border-t border-foreground/10">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-sm opacity-70">
          <span>Pañuelo sin efecto · arbitraje de flag football</span>
          <Link href="/login" className="font-semibold hover:underline">
            ¿Eres árbitro o diriges una liga? Entra aquí
          </Link>
        </div>
      </footer>
    </div>
  );
}

function SinLigas() {
  return (
    <section className="max-w-prose flex flex-col gap-3">
      <h2 className="font-bold text-2xl tracking-tight">Todavía no hay ligas registradas</h2>
      <p className="opacity-70">
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
          <img src={liga.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-foreground/5" />
        )}
        <h2 className="font-black text-2xl sm:text-3xl tracking-tight">{liga.nombre}</h2>
      </header>
      {liga.categorias.length === 0 ? (
        <p className="text-sm opacity-60">Esta liga todavía no tiene categorías.</p>
      ) : (
        <>
          {conActividad.map((cat) => (
            <BloqueCategoria key={cat.id} categoria={cat} />
          ))}
          {vacias.length > 0 && (
            <p className="text-sm opacity-60">
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
      <div className="lg:col-span-2 flex items-baseline justify-between gap-3 border-b-2 border-foreground/80 pb-2">
        <h3 className="font-bold text-xl">{categoria.nombre}</h3>
        <Link href={`/categoria/${categoria.id}`} className="text-sm font-semibold hover:underline">
          Ver todo
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold opacity-70">Tabla de posiciones</h4>
        <TablaPosiciones filas={categoria.tabla} compacta />
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold opacity-70">Resultados</h4>
          {categoria.recientes.length === 0 ? (
            <p className="text-sm opacity-60 py-3">Aún no se juega el primer partido.</p>
          ) : (
            <ul>{categoria.recientes.map((p) => <FilaMarcador key={p.id} partido={p} />)}</ul>
          )}
        </div>
        {categoria.proximos.length > 0 && (
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold opacity-70">Próximos</h4>
            <ul>{categoria.proximos.map((p) => <FilaProximo key={p.id} partido={p} />)}</ul>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold opacity-70">Líderes de puntos</h4>
          <Lideres lideres={categoria.lideres} />
        </div>
      </div>
    </article>
  );
}
