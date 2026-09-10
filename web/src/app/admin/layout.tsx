import { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminShell from "./_components/AdminShell";
import { authedFetch } from "@/lib/server-api";
import { ApiError } from "@/lib/api";
import type { SessionUser } from "@/lib/session";

interface UsuarioPublico {
  id: string;
  nombre: string;
  email: string;
  rol: SessionUser["rol"];
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let usuario: UsuarioPublico;
  try {
    usuario = await authedFetch<UsuarioPublico>("/usuarios/me");
  } catch (error) {
    // Cookie ausente, expirada o rechazada por el backend: proxy.ts ya cubre
    // el caso sin cookie, esto cubre el token vencido/ inválido.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      redirect("/login");
    }
    throw error;
  }

  return (
    <AdminShell nombre={usuario.nombre} email={usuario.email} rol={usuario.rol}>
      {children}
    </AdminShell>
  );
}
