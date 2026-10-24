import Link from "next/link";
import { redirect } from "next/navigation";
import { authedFetch, getSessionUser } from "@/lib/server-api";
import { formatearFecha } from "@/lib/zona";
import { describirAccion, salioBien, type FilaBitacora } from "@/lib/bitacora";
import { Vacio } from "../_components/Vacio";
import { BOTON_SECUNDARIO, ETIQUETA, INPUT, ROTULO, TITULO_PAGINA } from "../_components/estilos";

const POR_PAGINA = 50;

export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string; ruta?: string; antes?: string }>;
}) {
  const yo = await getSessionUser();
  if (yo?.rol !== "SUPERADMIN") redirect("/admin");
  const { usuario = "", ruta = "", antes } = await searchParams;

  const filtros = new URLSearchParams();
  if (usuario) filtros.set("usuario", usuario);
  if (ruta) filtros.set("ruta", ruta);
  const consulta = new URLSearchParams(filtros);
  if (antes) consulta.set("antes", antes);
  const filas = await authedFetch<FilaBitacora[]>(`/bitacora?${consulta}`);

  const siguiente = new URLSearchParams(filtros);
  if (filas.length === POR_PAGINA) siguiente.set("antes", filas[filas.length - 1].fecha);

  return (
    <div className="space-y-6">
      <header>
        <h1 className={TITULO_PAGINA}>Bitácora</h1>
        <p className="text-suave mt-2">Quién hizo qué y cuándo. Lo más reciente primero.</p>
      </header>

      <form method="get" className="panel p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
        <label className={`flex-1 ${ETIQUETA}`}>
          Usuario (correo)
          <input name="usuario" defaultValue={usuario} placeholder="organizador@…" className={INPUT} />
        </label>
        <label className={`flex-1 ${ETIQUETA}`}>
          Qué (parte de la ruta)
          <input name="ruta" defaultValue={ruta} placeholder="ligas, partidos, pagos…" className={INPUT} />
        </label>
        <button type="submit" className={`${BOTON_SECUNDARIO} px-5 py-3 min-h-12`}>
          Filtrar
        </button>
      </form>

      {filas.length === 0 ? (
        <Vacio icono="reglamento" texto="No hay movimientos con esos filtros." />
      ) : (
        <ol className="flex flex-col gap-2">
          {filas.map((f) => (
            <li key={f.id} className="panel p-3 sm:p-4 flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-semibold">
                  {describirAccion(f.metodo, f.ruta)}
                  {!salioBien(f.estado) && (
                    <span className="ml-2 text-xs font-bold text-peligro">falló ({f.estado})</span>
                  )}
                </p>
                <p className={ROTULO}>
                  {formatearFecha(f.fecha, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
              <p className="text-sm text-suave break-all">
                {f.usuarioEmail ?? "Sin sesión"}
                {f.rol ? ` · ${f.rol}` : ""}
              </p>
              {(f.params || f.detalle) && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold text-panuelo-texto">Detalle</summary>
                  <pre className="mt-2 p-2 rounded bg-panel-alterno overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify({ ...(f.params ? { ids: f.params } : {}), ...(f.detalle ?? {}) }, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}

      {siguiente.has("antes") && (
        <Link href={`/admin/bitacora?${siguiente}`} className={`${BOTON_SECUNDARIO} inline-flex px-5 py-3 min-h-12 items-center`}>
          Ver anteriores
        </Link>
      )}
    </div>
  );
}
