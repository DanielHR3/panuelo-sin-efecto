"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/server-api";
import { ApiError } from "@/lib/api";
import type { ActionState } from "../_components/ActionForm";
import type { Dificultad, EstadoPartido, RolEnCampo } from "@/lib/types";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function crearPartido(
  categoriaId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fechaHora = readString(formData, "fechaHora");
  const dificultad = readString(formData, "dificultad") as Dificultad;
  const equipoLocalId = readString(formData, "equipoLocalId");
  const equipoVisitanteId = readString(formData, "equipoVisitanteId");

  if (!fechaHora || !equipoLocalId || !equipoVisitanteId) {
    return { error: "Fecha, equipo local y equipo visitante son obligatorios" };
  }
  if (equipoLocalId === equipoVisitanteId) {
    return { error: "El equipo local y el visitante no pueden ser el mismo" };
  }

  try {
    await authedFetch(`/categorias/${categoriaId}/partidos`, {
      method: "POST",
      body: JSON.stringify({
        // <input type="datetime-local"> no lleva zona horaria; se interpreta en hora local del navegador.
        fechaHora: new Date(fechaHora).toISOString(),
        dificultad,
        equipoLocalId,
        equipoVisitanteId,
      }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo programar el partido" };
  }
  revalidatePath("/admin/partidos");
}

export async function eliminarPartido(
  id: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await authedFetch(`/partidos/${id}`, { method: "DELETE" });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo eliminar el partido" };
  }
  revalidatePath("/admin/partidos");
}

export async function avanzarEstado(
  id: string,
  estado: EstadoPartido,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await authedFetch(`/partidos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo actualizar el estado" };
  }
  revalidatePath("/admin/partidos");
}

export async function asignarArbitro(
  partidoId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const arbitroId = readString(formData, "arbitroId");
  const rolEnCampo = readString(formData, "rolEnCampo") as RolEnCampo;
  if (!arbitroId) return { error: "Selecciona un árbitro" };
  try {
    await authedFetch(`/partidos/${partidoId}/asignaciones`, {
      method: "POST",
      body: JSON.stringify({ arbitroId, rolEnCampo }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo asignar al árbitro" };
  }
  revalidatePath("/admin/partidos");
}

export async function quitarArbitro(
  partidoId: string,
  arbitroId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await authedFetch(`/partidos/${partidoId}/asignaciones/${arbitroId}`, {
      method: "DELETE",
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo quitar al árbitro" };
  }
  revalidatePath("/admin/partidos");
}
