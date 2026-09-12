"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/server-api";
import { ApiError } from "@/lib/api";
import type { ActionState } from "../_components/ActionForm";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function crearLiga(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const nombre = readString(formData, "nombre");
  if (!nombre) return { error: "El nombre de la liga es obligatorio" };
  try {
    await authedFetch("/ligas", { method: "POST", body: JSON.stringify({ nombre }) });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo crear la liga" };
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
