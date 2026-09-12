"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { SessionUser } from "@/lib/session";

const ROL_LABEL: Record<SessionUser["rol"], string> = {
  SUPERADMIN: "Super Administrador",
  LIGA_ADMIN: "Administrador de Liga",
  ARBITRO: "Árbitro",
};

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default function AdminShell({
  children,
  nombre,
  email,
  rol,
}: {
  children: ReactNode;
  nombre: string;
  email: string;
  rol: SessionUser["rol"];
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 font-sans">

      {/* Overlay móvil: toca fuera del menú para cerrarlo */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`w-64 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex-col fixed md:static inset-y-0 left-0 z-40 transition-transform md:translate-x-0 ${
          mobileNavOpen ? "flex translate-x-0" : "hidden md:flex -translate-x-full"
        }`}
      >
        <div className="p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Panel Admin
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-bold">
              {ROL_LABEL[rol]}
            </p>
          </div>
          <button
            type="button"
            className="md:hidden p-1 text-slate-500 dark:text-slate-400"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarLink href="/admin" icon="📊" label="Dashboard" onNavigate={() => setMobileNavOpen(false)} />
          <SidebarLink href="/admin/ligas" icon="🏆" label="Ligas y Categorías" onNavigate={() => setMobileNavOpen(false)} />
          <SidebarLink href="/admin/equipos" icon="🛡️" label="Equipos y Rosters" onNavigate={() => setMobileNavOpen(false)} />
          <SidebarLink href="/admin/partidos" icon="🏈" label="Gestión de Partidos" onNavigate={() => setMobileNavOpen(false)} />
          <SidebarLink href="/admin/arbitros" icon="🦓" label="Árbitros" onNavigate={() => setMobileNavOpen(false)} />
        </nav>

        {/* Perfil del Administrador (Tu Cuenta) */}
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold">
              {iniciales(nombre)}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="font-semibold text-sm truncate">{nombre}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex-1 p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs font-semibold"
              aria-label="Cambiar tema"
            >
              {theme === "system" ? "🖥️ Sistema" : resolvedTheme === "dark" ? "🌙 Oscuro" : "☀️ Claro"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto">
        {/* Header para móviles por si abres el admin en celular */}
        <header className="md:hidden bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 p-4 flex items-center justify-between">
          <h2 className="text-xl font-black">Panel Admin</h2>
          <button
            type="button"
            className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-lg"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={mobileNavOpen}
          >
            ☰
          </button>
        </header>

        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors font-medium text-sm"
    >
      <span className="text-lg">{icon}</span>
      {label}
    </Link>
  );
}
