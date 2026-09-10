"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/server-api";
import { ApiError } from "@/lib/api";
import type { ActionState } from "../_components/ActionForm";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function crearEquipo(
  categoriaId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const nombre = readString(formData, "nombre");
  const colorPrimario = readString(formData, "colorPrimario");
  if (!nombre) return { error: "El nombre del equipo es obligatorio" };
  try {
    await authedFetch(`/categorias/${categoriaId}/equipos`, {
      method: "POST",
      body: JSON.stringify({ nombre, ...(colorPrimario ? { colorPrimario } : {}) }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo crear el equipo" };
  }
  revalidatePath("/admin/equipos");
}

export async function eliminarEquipo(
  id: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await authedFetch(`/equipos/${id}`, { method: "DELETE" });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo eliminar el equipo" };
  }
  revalidatePath("/admin/equipos");
}

export async function crearJugador(
  equipoId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const nombre = readString(formData, "nombre");
  const numeroJersey = readString(formData, "numeroJersey");
  if (!nombre || !numeroJersey) {
    return { error: "Nombre y número de jersey son obligatorios" };
  }
  try {
    await authedFetch(`/equipos/${equipoId}/jugadores`, {
      method: "POST",
      body: JSON.stringify({ nombre, numeroJersey }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo añadir al jugador" };
  }
  revalidatePath(`/admin/equipos/${equipoId}`);
}

export async function eliminarJugador(
  id: string,
  equipoId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await authedFetch(`/jugadores/${id}`, { method: "DELETE" });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo eliminar al jugador" };
  }
  revalidatePath(`/admin/equipos/${equipoId}`);
}
