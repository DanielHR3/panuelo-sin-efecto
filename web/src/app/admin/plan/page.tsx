import { authedFetch } from "@/lib/server-api";
import { pesos } from "@/lib/dinero";
import { formatearFecha } from "@/lib/zona";
import { avisoSuscripcion } from "@/lib/suscripcion";
import type { DatosPago, Liga, Pago, PlanPagado } from "@/lib/types";
import { ActionForm, SubmitButton } from "../_components/ActionForm";
import { Vacio } from "../_components/Vacio";
import { BOTON_PRIMARIO, ROTULO, TITULO_PAGINA } from "../_components/estilos";
import { crearPago } from "./actions";
import { ComprobanteForm } from "./ComprobanteForm";
import { CopiarTexto } from "./CopiarTexto";

const PLANES: { plan: PlanPagado; nombre: string; incluye: string }[] = [
  {
    plan: "COMPLETO",
    nombre: "Completo",
    incluye: "Marcador en vivo, página pública con tabla y estadísticas, importación desde Excel y reglamento propio.",
  },
  {
    plan: "ARBITRAJE",
    nombre: "Solo arbitraje",
    incluye: "Marcador en vivo, tus árbitros y el resultado para compartir. Sin página pública ni importación.",
  },
];

const ESTADO_PAGO: Record<Pago["estado"], string> = {
  PENDIENTE: "En revisión",
  CONFIRMADO: "Confirmado",
  RECHAZADO: "Rechazado",
};

export default async function PlanPage() {
  const [ligas, datos] = await Promise.all([authedFetch<Liga[]>("/ligas"), authedFetch<DatosPago>("/pagos/datos")]);
  // Solo ligas con plan propio: las de cortesía y las de partidos rápidos no pagan.
  const conPlan = ligas.filter((l) => l.suscripcion && l.suscripcion.estado !== "CORTESIA");
  const pagosPorLiga = new Map(
    await Promise.all(conPlan.map(async (l) => [l.id, await authedFetch<Pago[]>(`/ligas/${l.id}/pagos`)] as const)),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className={TITULO_PAGINA}>Mi plan</h1>
        <p className="text-suave mt-2">Paga por transferencia SPEI. En cuanto confirmemos tu pago, tu plan se activa.</p>
      </header>

      {conPlan.length === 0 && <Vacio icono="trofeo" texto="Tus ligas no tienen pagos pendientes." />}

      {conPlan.map((liga) => {
        const s = liga.suscripcion!;
        const aviso = avisoSuscripcion(s);
        const pagos = pagosPorLiga.get(liga.id) ?? [];
        const pendiente = pagos.find((p) => p.estado === "PENDIENTE");
        return (
          <section key={liga.id} className="panel p-4 sm:p-5 flex flex-col gap-4">
            <div>
              <p className={ROTULO}>{liga.nombre}</p>
              <p className="titulo-estadio text-2xl leading-tight mt-1">
                {aviso?.titulo ??
                  `Plan ${s.plan === "ARBITRAJE" ? "Solo arbitraje" : "Completo"} activo${
                    s.vence ? ` hasta el ${formatearFecha(s.vence, { day: "numeric", month: "long" })}` : ""
                  }`}
              </p>
            </div>

            {pendiente ? (
              <PagoPendiente pago={pendiente} datos={datos} />
            ) : (
              <ActionForm action={crearPago.bind(null, liga.id)} className="flex flex-col gap-4">
                <fieldset className="flex flex-col gap-2">
                  <legend className="font-semibold mb-1">Elige tu plan</legend>
                  {PLANES.map((p, i) => (
                    <label
                      key={p.plan}
                      className="flex gap-3 rounded-lg border-2 border-texto/15 p-3 has-[:checked]:border-panuelo-texto cursor-pointer"
                    >
                      <input type="radio" name="plan" value={p.plan} defaultChecked={i === 0} className="mt-1 accent-[#8A6A00]" />
                      <span className="flex flex-col">
                        <span className="font-semibold">
                          {p.nombre} · {pesos(datos.precios[p.plan].MENSUAL)}/mes
                        </span>
                        <span className="text-sm text-suave">{p.incluye}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <fieldset className="flex flex-col sm:flex-row gap-2">
                  <legend className="font-semibold mb-1">¿Cada cuánto?</legend>
                  <label className="flex-1 flex items-center gap-2 rounded-lg border-2 border-texto/15 p-3 has-[:checked]:border-panuelo-texto cursor-pointer">
                    <input type="radio" name="periodo" value="MENSUAL" defaultChecked className="accent-[#8A6A00]" />
                    Mensual
                  </label>
                  <label className="flex-1 flex items-center gap-2 rounded-lg border-2 border-texto/15 p-3 has-[:checked]:border-panuelo-texto cursor-pointer">
                    <input type="radio" name="periodo" value="ANUAL" className="accent-[#8A6A00]" />
                    Anual <span className="text-sm text-suave">(pagas 10 meses, usas 12)</span>
                  </label>
                </fieldset>
                <SubmitButton pendingLabel="Generando referencia…" className={`${BOTON_PRIMARIO} min-h-12`}>
                  Pagar por transferencia
                </SubmitButton>
              </ActionForm>
            )}

            {pagos.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold">Historial de pagos</summary>
                <ul className="mt-2 flex flex-col divide-y divide-texto/10">
                  {pagos.map((p) => (
                    <li key={p.id} className="py-2 flex flex-col">
                      <span>
                        {formatearFecha(p.createdAt, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                        {p.plan === "ARBITRAJE" ? "Solo arbitraje" : "Completo"} {p.periodo === "ANUAL" ? "anual" : "mensual"} ·{" "}
                        {pesos(p.montoCentavos)} · <strong>{ESTADO_PAGO[p.estado]}</strong>
                      </span>
                      {p.motivoRechazo && <span className="text-peligro">Motivo: {p.motivoRechazo}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}

function PagoPendiente({ pago, datos }: { pago: Pago; datos: DatosPago }) {
  if (!datos.configurado) {
    return (
      <p role="alert" className="text-sm font-semibold text-peligro">
        Los datos de pago no están configurados todavía. Escríbenos para completar tu pago.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-panel-alterno p-4 flex flex-col gap-3">
        <p className="font-semibold">Transfiere {pesos(pago.montoCentavos)} por SPEI con estos datos:</p>
        <Dato etiqueta="CLABE" valor={datos.clabe!} />
        <Dato etiqueta="Banco" valor={datos.banco!} copiable={false} />
        <Dato etiqueta="Beneficiario" valor={datos.beneficiario!} copiable={false} />
        <Dato etiqueta="Concepto (tu referencia)" valor={pago.referencia} />
        <p className="text-xs text-suave">Escribe la referencia en el concepto para que identifiquemos tu pago.</p>
      </div>
      <ComprobanteForm pagoId={pago.id} yaSubido={pago.comprobanteNombre} />
      <p className="text-sm text-suave">Revisamos los pagos a mano; tu plan se activa en cuanto lo confirmemos.</p>
    </div>
  );
}

function Dato({ etiqueta, valor, copiable = true }: { etiqueta: string; valor: string; copiable?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className={ROTULO}>{etiqueta}</p>
        <p className="font-display font-bold text-lg tracking-wide break-all">{valor}</p>
      </div>
      {copiable && <CopiarTexto texto={valor} etiqueta={etiqueta} />}
    </div>
  );
}
