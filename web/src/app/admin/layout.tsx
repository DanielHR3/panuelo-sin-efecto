import { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 font-sans">
      
      {/* SIDEBAR (Diseñado para Web/Desktop) */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex-col hidden md:flex">
        <div className="p-6">
          <h2 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Panel Admin
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-bold">
            Super Administrador
          </p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarLink href="/admin" icon="📊" label="Dashboard" />
          <SidebarLink href="/admin/ligas" icon="🏆" label="Ligas y Categorías" />
          <SidebarLink href="/admin/equipos" icon="🛡️" label="Equipos y Rosters" />
          <SidebarLink href="/admin/partidos" icon="🏈" label="Gestión de Partidos" />
          <SidebarLink href="/admin/arbitros" icon="🦓" label="Árbitros" />
        </nav>
        
        {/* Perfil del Administrador (Tu Cuenta) */}
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold">
              DH
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm truncate">Daniel H.</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">danielhrubio3@gmail.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto">
        {/* Header para móviles por si abres el admin en celular */}
        <header className="md:hidden bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 p-4 flex items-center justify-between">
           <h2 className="text-xl font-black">Panel Admin</h2>
           <button className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-lg">☰</button>
        </header>
        
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label }: { href: string, icon: string, label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors font-medium text-sm">
      <span className="text-lg">{icon}</span>
      {label}
    </Link>
  );
}
