"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/server-api";
import { ApiError } from "@/lib/api";
import type { ActionState } from "../_components/ActionForm";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function crearArbitro(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const nombre = readString(formData, "nombre");
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  if (!nombre || !email || !password) {
    return { error: "Nombre, email y contraseña son obligatorios" };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }
  try {
    await authedFetch("/usuarios", {
      method: "POST",
      body: JSON.stringify({ nombre, email, password, rol: "ARBITRO" }),
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "No se pudo crear el árbitro" };
  }
  revalidatePath("/admin/arbitros");
}
