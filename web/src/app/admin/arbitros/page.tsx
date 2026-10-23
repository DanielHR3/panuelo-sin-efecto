import Link from "next/link";
import { redirect } from "next/navigation";
import { authedFetch, getSessionUser } from "@/lib/server-api";
import type { Liga, Usuario } from "@/lib/types";
import { ActionForm, SubmitButton } from "../_components/ActionForm";
import { Vacio } from "../_components/Vacio";
import { BOTON_PRIMARIO, ETIQUETA, INPUT, TITULO_PAGINA } from "../_components/estilos";
import { crearArbitro } from "./actions";

export default async function ArbitrosPage() {
  // SUPERADMIN ve y crea árbitros de cualquier liga (o sin liga). Un
  // LIGA_ADMIN da de alta a los árbitros de sus ligas y solo ve a esos.
  const yo = await getSessionUser();
  if (yo?.rol !== "SUPERADMIN" && yo?.rol !== "LIGA_ADMIN") redirect("/admin");
  const esSuperadmin = yo.rol === "SUPERADMIN";

  const [arbitros, todasLasLigas] = await Promise.all([
    authedFetch<Usuario[]>("/usuarios?rol=ARBITRO"),
    authedFetch<Liga[]>("/ligas"),
  ]);
  // Las ligas de partidos rápidos son de invitados: no llevan árbitros propios.
  const ligas = todasLasLigas.filter((l) => l.tipo !== "RAPIDA");
  const visibles = esSuperadmin ? arbitros : arbitros.filter((a) => a.ligaArbitro);

  return (
    <div className="space-y-6">
      <header>
        <h1 className={TITULO_PAGINA}>Árbitros</h1>
        <p className="text-suave mt-2">
          {esSuperadmin
            ? "Cuentas con rol de árbitro, listas para asignar a partidos."
            : "Da de alta a los árbitros de tu liga. Con su email y contraseña entran a arbitrar los partidos que les asignes."}
        </p>
      </header>

      {!esSuperadmin && ligas.length === 0 ? (
        <Vacio icono="silbato" texto="Primero crea una liga.">
          Los árbitros pertenecen a una liga.{" "}
          <Link href="/admin/ligas" className="font-semibold underline">
            Crear liga
          </Link>
        </Vacio>
      ) : (
        <ActionForm
          action={crearArbitro}
          className="panel p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end"
        >
          <label className={ETIQUETA}>
            Nombre
            <input name="nombre" required placeholder="Ana Torres" className={INPUT} />
          </label>
          <label className={ETIQUETA}>
            Email
            <input type="email" name="email" required placeholder="ana@liga.mx" className={INPUT} />
          </label>
          <label className={ETIQUETA}>
            Contraseña
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="mínimo 8 caracteres"
              className={INPUT}
            />
          </label>
          <label className={ETIQUETA}>
            Liga
            <select name="ligaId" required={!esSuperadmin} defaultValue={ligas.length === 1 ? ligas[0].id : ""} className={INPUT}>
              {esSuperadmin ? <option value="">Sin liga</option> : <option value="" disabled>Elige una liga</option>}
              {ligas.map((liga) => (
                <option key={liga.id} value={liga.id}>
                  {liga.nombre}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton className={`sm:col-span-2 ${BOTON_PRIMARIO}`}>+ Crear árbitro</SubmitButton>
        </ActionForm>
      )}

      {visibles.length === 0 ? (
        <Vacio icono="silbato" texto="Todavía no hay árbitros registrados." />
      ) : (
        <div className="panel overflow-hidden">
          {visibles.map((arbitro) => (
            <div key={arbitro.id} className="flex items-center gap-3 px-4 py-3 odd:bg-panel even:bg-panel-alterno">
              <div className="w-9 h-9 rounded-full bg-texto text-fondo flex items-center justify-center font-display italic font-extrabold shrink-0">
                {arbitro.nombre.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{arbitro.nombre}</p>
                <p className="text-xs text-suave truncate">{arbitro.email}</p>
              </div>
              <span className="text-xs text-suave shrink-0 max-w-[40%] truncate">
                {arbitro.ligaArbitro?.nombre ?? "Sin liga"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
