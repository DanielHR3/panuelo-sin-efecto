import { redirect } from "next/navigation";
import { authedFetch, getSessionUser } from "@/lib/server-api";
import type { Usuario } from "@/lib/types";
import { ActionForm, SubmitButton } from "../_components/ActionForm";
import { Vacio } from "../_components/Vacio";
import { BOTON_PRIMARIO, ETIQUETA, INPUT, TITULO_PAGINA } from "../_components/estilos";
import { crearArbitro } from "./actions";

export default async function ArbitrosPage() {
  // Página de SUPERADMIN: lista cuentas con su email. Un LIGA_ADMIN elige
  // árbitros desde /admin/partidos (la API ya le manda la lista sin email).
  const yo = await getSessionUser();
  if (yo?.rol !== "SUPERADMIN") redirect("/admin");
  const arbitros = await authedFetch<Usuario[]>("/usuarios?rol=ARBITRO");

  return (
    <div className="space-y-6">
      <header>
        <h1 className={TITULO_PAGINA}>Árbitros</h1>
        <p className="text-suave mt-2">
          Cuentas con rol de árbitro, listas para asignar a partidos.
        </p>
      </header>

      <ActionForm
        action={crearArbitro}
        className="panel p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
      >
        <label className={ETIQUETA}>
          Nombre
          <input
            name="nombre"
            required
            placeholder="Ana Torres"
            className={INPUT}
          />
        </label>
        <label className={ETIQUETA}>
          Email
          <input
            type="email"
            name="email"
            required
            placeholder="ana@liga.mx"
            className={INPUT}
          />
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
        <SubmitButton className={`sm:col-span-3 ${BOTON_PRIMARIO}`}>
          + Crear árbitro
        </SubmitButton>
      </ActionForm>

      {arbitros.length === 0 ? (
        <Vacio icono="silbato" texto="Todavía no hay árbitros registrados." />
      ) : (
        <div className="panel overflow-hidden">
          {arbitros.map((arbitro) => (
            <div key={arbitro.id} className="flex items-center gap-3 px-4 py-3 odd:bg-panel even:bg-panel-alterno">
              <div className="w-9 h-9 rounded-full bg-texto text-fondo flex items-center justify-center font-display italic font-extrabold shrink-0">
                {arbitro.nombre.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{arbitro.nombre}</p>
                <p className="text-xs text-suave truncate">{arbitro.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
