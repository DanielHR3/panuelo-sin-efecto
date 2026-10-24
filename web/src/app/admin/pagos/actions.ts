"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/server-api";
import { ApiError } from "@/lib/api";
import type { ActionState } from "../_components/ActionForm";

export async function resolverPago(
  id: string,
  accion: "CONFIRMAR" | "RECHAZAR",
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const motivo = formData.get("motivo");
  try {
    await authedFetch(`/pagos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ accion, ...(typeof motivo === "string" && motivo.trim() ? { motivo: motivo.trim() } : {}) }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo actualizar el pago" };
  }
  revalidatePath("/admin/pagos");
}
