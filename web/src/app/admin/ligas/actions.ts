"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/server-api";
import { ApiError } from "@/lib/api";
import type { ActionState } from "../_components/ActionForm";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * HU-1.1: un checkbox no marcado no viaja en el FormData, así que "ausente"
 * significa `false` (no "sin cambios") en los formularios de configuración.
 */
function readCheckbox(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function leerConfigLiga(formData: FormData) {
  return {
    logoUrl: readString(formData, "logoUrl"),
    registraMvp: readCheckbox(formData, "registraMvp"),
    registraIntercepciones: readCheckbox(formData, "registraIntercepciones"),
  };
}

export async function crearLiga(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const nombre = readString(formData, "nombre");
  if (!nombre) return { error: "El nombre de la liga es obligatorio" };
  try {
    await authedFetch("/ligas", {
      method: "POST",
      body: JSON.stringify({ nombre, ...leerConfigLiga(formData) }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo crear la liga" };
  }
  revalidatePath("/admin/ligas");
}

/** HU-1.1: logo y banderas de MVP / intercepciones de una liga existente. */
export async function actualizarLiga(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const nombre = readString(formData, "nombre");
  if (!nombre) return { error: "El nombre de la liga es obligatorio" };
  try {
    await authedFetch(`/ligas/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ nombre, ...leerConfigLiga(formData) }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo guardar la liga" };
  }
  revalidatePath("/admin/ligas");
}

export async function eliminarLiga(
  id: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await authedFetch(`/ligas/${id}`, { method: "DELETE" });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo eliminar la liga" };
  }
  revalidatePath("/admin/ligas");
}

export async function crearCategoria(
  ligaId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const nombre = readString(formData, "nombre");
  if (!nombre) return { error: "El nombre de la categoría es obligatorio" };
  try {
    await authedFetch(`/ligas/${ligaId}/categorias`, {
      method: "POST",
      body: JSON.stringify({ nombre }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo crear la categoría" };
  }
  revalidatePath("/admin/ligas");
}

export async function eliminarCategoria(
  id: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await authedFetch(`/categorias/${id}`, { method: "DELETE" });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo eliminar la categoría" };
  }
  revalidatePath("/admin/ligas");
}
