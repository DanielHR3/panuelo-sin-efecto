import { authedFetch, getSessionUser } from "@/lib/server-api";
import type { Liga } from "@/lib/types";
import { ActionForm, SubmitButton } from "../_components/ActionForm";
import { DeleteButton } from "../_components/DeleteButton";
import { Vacio } from "../_components/Vacio";
import { Icono } from "@/components/icons/Icono";
import {
  BOTON_PELIGRO,
  BOTON_PRIMARIO,
  BOTON_QUITAR,
  BOTON_SECUNDARIO,
  ETIQUETA,
  INPUT,
  TITULO_PAGINA,
} from "../_components/estilos";
import {
  actualizarLiga,
  crearLiga,
  crearCategoria,
  eliminarLiga,
  eliminarLigaCompleta,
  eliminarCategoria,
} from "./actions";

/** HU-1.1: las dos reglas configurables de la liga, como checkboxes. */
function ConfigLigaFields({
  registraMvp,
  registraIntercepciones,
}: {
  registraMvp: boolean;
  registraIntercepciones: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          name="registraMvp"
          defaultChecked={registraMvp}
          className="w-4 h-4 accent-panuelo-texto"
        />
        Exigir MVP al finalizar cada partido
      </label>
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          name="registraIntercepciones"
          defaultChecked={registraIntercepciones}
          className="w-4 h-4 accent-panuelo-texto"
        />
        Llevar registro de intercepciones
      </label>
    </div>
  );
}

export default async function LigasPage() {
  const [ligas, yo] = await Promise.all([authedFetch<Liga[]>("/ligas"), getSessionUser()]);
  const esSuperadmin = yo?.rol === "SUPERADMIN";

  return (
    <div className="space-y-6">
      <header>
        <h1 className={TITULO_PAGINA}>Ligas y Categorías</h1>
        <p className="text-suave mt-2">
          Crea ligas y organiza sus categorías (Varonil, Femenil, Mixto…).
        </p>
      </header>

      <ActionForm
        action={crearLiga}
        className="panel p-5 sm:p-6 flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className={`flex-1 ${ETIQUETA}`}>
            Nueva liga
            <input
              name="nombre"
              required
              placeholder="Liga Metropolitana de Tocho"
              className={INPUT}
            />
          </label>
          <label className={`flex-1 ${ETIQUETA}`}>
            Logo (URL, opcional)
            <input
              name="logoUrl"
              type="url"
              placeholder="https://…/logo.png"
              className={INPUT}
            />
          </label>
        </div>
        <ConfigLigaFields registraMvp registraIntercepciones />
        <SubmitButton className={`self-start ${BOTON_PRIMARIO}`}>
          + Crear liga
        </SubmitButton>
      </ActionForm>

      {ligas.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ligas.map((liga) => (
            <LigaCard key={liga.id} liga={liga} esSuperadmin={esSuperadmin} />
          ))}
        </div>
      )}
    </div>
  );
}

function LigaCard({ liga, esSuperadmin }: { liga: Liga; esSuperadmin: boolean }) {
  return (
    <div className="panel p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {liga.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria; next/image exigiría whitelist de dominios
            <img
              src={liga.logoUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-cover bg-panel-alterno shrink-0"
            />
          )}
          <div className="min-w-0">
            <h3 className="titulo-estadio text-2xl leading-tight truncate">{liga.nombre}</h3>
            <p className="text-xs text-suave font-medium">
              {liga.registraMvp ? "MVP obligatorio" : "Sin MVP"} ·{" "}
              {liga.registraIntercepciones ? "Registra intercepciones" : "Sin intercepciones"}
            </p>
            {liga.propietario && (
              <p className="text-xs text-suave break-all">
                {liga.propietario.nombre} · {liga.propietario.email}
              </p>
            )}
          </div>
        </div>
        {!esSuperadmin && (
          <DeleteButton
            action={eliminarLiga.bind(null, liga.id)}
            confirmMessage={`¿Eliminar la liga "${liga.nombre}"? Debe no tener categorías.`}
          />
        )}
      </div>

      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold text-panuelo-texto select-none">
          Configuración de la liga
        </summary>
        <ActionForm action={actualizarLiga.bind(null, liga.id)} className="flex flex-col gap-3 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={ETIQUETA}>
              Nombre
              <input name="nombre" required defaultValue={liga.nombre} className={INPUT} />
            </label>
            <label className={ETIQUETA}>
              Logo (URL)
              <input
                name="logoUrl"
                type="url"
                defaultValue={liga.logoUrl ?? ""}
                placeholder="https://…/logo.png"
                className={INPUT}
              />
            </label>
          </div>
          <ConfigLigaFields
            registraMvp={liga.registraMvp}
            registraIntercepciones={liga.registraIntercepciones}
          />
          <SubmitButton className={`self-start px-4 py-2.5 text-sm ${BOTON_SECUNDARIO}`}>
            Guardar configuración
          </SubmitButton>
        </ActionForm>
      </details>

      {liga.categorias.length === 0 ? (
        <p className="text-sm text-suave">Sin categorías todavía.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Categorías">
          {liga.categorias.map((categoria) => (
            <li
              key={categoria.id}
              className="flex items-center gap-1.5 bg-panel-alterno border border-texto/10 rounded-full pl-3 pr-1 py-1 text-sm font-semibold"
            >
              {categoria.nombre}
              <DeleteButton
                action={eliminarCategoria.bind(null, categoria.id)}
                label={<Icono nombre="cerrar" />}
                ariaLabel={`Eliminar categoría ${categoria.nombre}`}
                confirmMessage={`¿Eliminar la categoría "${categoria.nombre}"? Debe no tener equipos ni partidos.`}
                className={BOTON_QUITAR}
              />
            </li>
          ))}
        </ul>
      )}

      <ActionForm action={crearCategoria.bind(null, liga.id)} className="flex gap-2">
        <input
          name="nombre"
          required
          placeholder="Nueva categoría (p. ej. Varonil)"
          aria-label="Nueva categoría"
          className={`flex-1 min-w-0 text-sm ${INPUT} p-2.5!`}
        />
        <SubmitButton className={`px-4 py-2.5 text-sm shrink-0 ${BOTON_SECUNDARIO}`}>
          + Añadir
        </SubmitButton>
      </ActionForm>
      {esSuperadmin && <EliminarLigaCompleta liga={liga} />}
    </div>
  );
}

function EmptyState() {
  return (
    <Vacio icono="trofeo" texto="Todavía no hay ligas.">
      Crea la primera con el formulario de arriba.
    </Vacio>
  );
}

/**
 * SUPERADMIN: borrar la liga con todo (categorías, equipos, jugadores,
 * partidos, pagos) escribiendo su nombre exacto, y opcionalmente la cuenta
 * del organizador para que pueda volver a registrarse con ese correo.
 */
function EliminarLigaCompleta({ liga }: { liga: Liga }) {
  return (
    <details className="border-t border-texto/10 pt-3">
      <summary className="cursor-pointer text-sm font-semibold text-peligro select-none">
        Eliminar liga…
      </summary>
      <ActionForm
        action={eliminarLigaCompleta.bind(null, liga.id)}
        className="mt-3 flex flex-col gap-3"
      >
        <p className="text-sm">
          Se borran <strong>todas</strong> sus categorías, equipos, jugadores, partidos, pagos y
          reglamento. No se puede deshacer; queda anotado en la bitácora.
        </p>
        <label className={ETIQUETA}>
          Escribe el nombre de la liga para confirmar
          <input
            name="confirmar"
            required
            autoComplete="off"
            placeholder={liga.nombre}
            className={INPUT}
          />
        </label>
        <label className="flex items-start gap-2 text-sm font-medium">
          <input type="checkbox" name="borrarCuenta" className="mt-0.5 w-4 h-4 accent-panuelo-texto" />
          <span>
            Borrar también la cuenta del organizador
            {liga.propietario ? ` (${liga.propietario.email})` : ""}. Podrá registrarse de nuevo con
            ese correo, sin otro mes gratis.
          </span>
        </label>
        <SubmitButton pendingLabel="Eliminando…" className={`${BOTON_PELIGRO} px-5 py-3 min-h-12`}>
          Eliminar liga definitivamente
        </SubmitButton>
      </ActionForm>
    </details>
  );
}
