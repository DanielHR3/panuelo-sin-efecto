"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/server-api";
import { ApiError } from "@/lib/api";
import type { ActionState } from "../_components/ActionForm";

export async function crearPago(ligaId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const plan = formData.get("plan");
  const periodo = formData.get("periodo");
  if (typeof plan !== "string" || typeof periodo !== "string") return { error: "Elige un plan y un periodo" };
  try {
    await authedFetch(`/ligas/${ligaId}/pagos`, { method: "POST", body: JSON.stringify({ plan, periodo }) });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo generar tu referencia de pago" };
  }
  revalidatePath("/admin/plan");
}
