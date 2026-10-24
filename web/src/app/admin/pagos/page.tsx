import { redirect } from "next/navigation";
import { authedFetch, getSessionUser } from "@/lib/server-api";
import { pesos } from "@/lib/dinero";
import { formatearFecha } from "@/lib/zona";
import type { Pago } from "@/lib/types";
import { ActionForm, SubmitButton } from "../_components/ActionForm";
import { Vacio } from "../_components/Vacio";
import { BOTON_PELIGRO, BOTON_PRIMARIO, INPUT, ROTULO, TITULO_PAGINA } from "../_components/estilos";
import { resolverPago } from "./actions";

export default async function PagosPage() {
  const yo = await getSessionUser();
  if (yo?.rol !== "SUPERADMIN") redirect("/admin");
  const pendientes = await authedFetch<Pago[]>("/pagos?estado=PENDIENTE");

  return (
    <div className="space-y-6">
      <header>
        <h1 className={TITULO_PAGINA}>Pagos</h1>
        <p className="text-suave mt-2">
          Revisa en tu banca que llegó la transferencia con esa referencia y confírmala. Al confirmar se activa el plan
          de la liga.
        </p>
      </header>

      {pendientes.length === 0 ? (
        <Vacio icono="trofeo" texto="No hay pagos por revisar." />
      ) : (
        pendientes.map((p) => (
          <section key={p.id} className="panel p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="titulo-estadio text-2xl leading-none">{pesos(p.montoCentavos)}</p>
              <p className="font-display font-bold tracking-wide">{p.referencia}</p>
            </div>
            <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className={ROTULO}>Liga</dt>
              <dd>{p.liga?.nombre}</dd>
              <dt className={ROTULO}>Organizador</dt>
              <dd className="break-all">
                {p.liga?.propietario.nombre} · {p.liga?.propietario.email}
              </dd>
              <dt className={ROTULO}>Plan</dt>
              <dd>
                {p.plan === "ARBITRAJE" ? "Solo arbitraje" : "Completo"} · {p.periodo === "ANUAL" ? "anual" : "mensual"}
              </dd>
              <dt className={ROTULO}>Solicitado</dt>
              <dd>{formatearFecha(p.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd>
              <dt className={ROTULO}>Comprobante</dt>
              <dd>
                {p.comprobanteNombre ? (
                  <a href={`/api/pagos/${p.id}/comprobante`} target="_blank" rel="noopener" className="font-semibold underline">
                    Ver {p.comprobanteNombre}
                  </a>
                ) : (
                  <span className="text-suave">Todavía no lo sube</span>
                )}
              </dd>
            </dl>
            <div className="flex flex-col sm:flex-row gap-3">
              <ActionForm action={resolverPago.bind(null, p.id, "CONFIRMAR")} className="sm:flex-1">
                <SubmitButton pendingLabel="Confirmando…" className={`${BOTON_PRIMARIO} w-full min-h-12`}>
                  Confirmar pago
                </SubmitButton>
              </ActionForm>
              <ActionForm action={resolverPago.bind(null, p.id, "RECHAZAR")} className="sm:flex-1 flex flex-col gap-2">
                <input name="motivo" required maxLength={300} placeholder="Motivo del rechazo" aria-label="Motivo del rechazo" className={INPUT} />
                <SubmitButton pendingLabel="Rechazando…" className={`${BOTON_PELIGRO} min-h-12`}>
                  Rechazar
                </SubmitButton>
              </ActionForm>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
