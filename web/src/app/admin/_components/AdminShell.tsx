"use client";

import { ReactNode, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { SessionUser } from "@/lib/session";
import { Icono, type NombreIcono } from "@/components/icons/Icono";
import { Marca } from "../../_publico/Marca";

const ROL_LABEL: Record<SessionUser["rol"], string> = {
  SUPERADMIN: "Super Administrador",
  LIGA_ADMIN: "Administrador de Liga",
  ARBITRO: "Árbitro",
};

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

const sinSuscripcion = () => () => {};

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
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  // next-themes no conoce el tema en el servidor (`theme` llega undefined) y
  // en el cliente lo lee de localStorage desde el primer render: el botón
  // diferiría al hidratar. Hasta montar (getServerSnapshot = false, también
  // al hidratar) se pinta lo mismo que el servidor; luego el tema real.
  const montado = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const temaVisible = montado ? (theme === "system" ? "system" : resolvedTheme) : undefined;
  const { icono: iconoTema, texto: etiquetaTema }: { icono: NombreIcono; texto: string } =
    temaVisible === "system"
      ? { icono: "monitor", texto: "Sistema" }
      : temaVisible === "dark"
        ? { icono: "luna", texto: "Oscuro" }
        : { icono: "sol", texto: "Claro" };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const cerrarNav = () => setMobileNavOpen(false);
  const activo = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-screen bg-fondo text-texto font-sans">

      {/* Overlay móvil: toca fuera del menú para cerrarlo */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={cerrarNav}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`w-64 bg-panel border-r border-texto/10 flex-col fixed md:static inset-y-0 left-0 z-40 transition-transform md:translate-x-0 ${
          mobileNavOpen ? "flex translate-x-0" : "hidden md:flex -translate-x-full"
        }`}
      >
        <div className="p-5 flex items-start justify-between gap-2 border-b border-texto/10">
          <div className="min-w-0 flex flex-col gap-3">
            <Marca tamano={36} />
            <div>
              <h2 className="titulo-estadio text-2xl leading-none">Panel Admin</h2>
              <p className="text-[11px] text-suave mt-1.5 uppercase tracking-[0.14em] font-bold">
                {ROL_LABEL[rol]}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="md:hidden w-10 h-10 -mr-2 flex items-center justify-center rounded-lg text-xl text-suave hover:bg-panel-alterno"
            onClick={cerrarNav}
            aria-label="Cerrar menú"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <SidebarLink href="/admin" icon="grafica" label="Dashboard" activo={activo("/admin")} onNavigate={cerrarNav} />
          <SidebarLink href="/admin/ligas" icon="trofeo" label="Ligas y Categorías" activo={activo("/admin/ligas")} onNavigate={cerrarNav} />
          <SidebarLink href="/admin/equipos" icon="escudo" label="Equipos y Rosters" activo={activo("/admin/equipos")} onNavigate={cerrarNav} />
          <SidebarLink href="/admin/partidos" icon="campo" label="Gestión de Partidos" activo={activo("/admin/partidos")} onNavigate={cerrarNav} />
          <SidebarLink href="/admin/importar" icon="tabla" label="Importar Excel" activo={activo("/admin/importar")} onNavigate={cerrarNav} />
          <SidebarLink href="/admin/reglamento" icon="reglamento" label="Reglamento" activo={activo("/admin/reglamento")} onNavigate={cerrarNav} />
          {rol === "LIGA_ADMIN" && (
            <SidebarLink href="/admin/plan" icon="trofeo" label="Mi plan" activo={activo("/admin/plan")} onNavigate={cerrarNav} />
          )}
          {rol === "SUPERADMIN" && (
            <SidebarLink href="/admin/pagos" icon="grafica" label="Pagos" activo={activo("/admin/pagos")} onNavigate={cerrarNav} />
          )}
          {(rol === "SUPERADMIN" || rol === "LIGA_ADMIN") && (
            <SidebarLink href="/admin/arbitros" icon="silbato" label="Árbitros" activo={activo("/admin/arbitros")} onNavigate={cerrarNav} />
          )}
        </nav>

        {/* Perfil del Administrador (Tu Cuenta) */}
        <div className="p-4 border-t border-texto/10 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-panuelo text-[#0A1A33] flex items-center justify-center font-display italic font-extrabold text-lg shrink-0">
              {iniciales(nombre)}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="font-semibold text-sm truncate">{nombre}</p>
              <p className="text-xs text-suave truncate">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg bg-panel-alterno border border-texto/10 text-xs font-display font-bold uppercase tracking-[0.06em]"
              aria-label="Cambiar tema"
            >
              <Icono nombre={iconoTema} className="text-sm" />
              {etiquetaTema}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 p-2 rounded-lg border border-peligro/40 text-peligro hover:bg-peligro/10 text-xs font-display font-bold uppercase tracking-[0.06em]"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Header para móviles por si abres el admin en celular */}
        <header className="md:hidden bg-panel border-b border-texto/10 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Marca tamano={30} oculta />
            <h2 className="titulo-estadio text-lg leading-none text-suave border-l border-texto/15 pl-3 shrink-0">
              Panel Admin
            </h2>
          </div>
          <button
            type="button"
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-panel-alterno border border-texto/10 text-xl shrink-0"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={mobileNavOpen}
          >
            <Icono nombre="menu" />
          </button>
        </header>

        <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto">
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
  activo,
  onNavigate,
}: {
  href: string;
  icon: NombreIcono;
  label: string;
  activo: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={activo ? "page" : undefined}
      className={`relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg transition-colors font-semibold text-sm ${
        activo ? "bg-panel-alterno text-texto" : "text-suave hover:bg-panel-alterno hover:text-texto"
      }`}
    >
      {/* Barra de pañuelo: marca la sección actual. */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full ${activo ? "bg-panuelo" : "bg-transparent"}`}
      />
      <Icono nombre={icon} className="text-lg shrink-0" />
      {label}
    </Link>
  );
}
