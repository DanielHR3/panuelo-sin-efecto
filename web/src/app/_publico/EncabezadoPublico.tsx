import Link from "next/link";
import { getSessionUser } from "@/lib/server-api";

/**
 * Barra superior de las páginas públicas. Si hay sesión, ofrece la casa de
 * cada rol; si no, el botón de entrar (el pañuelo amarillo: es la única
 * acción de color en la página).
 */
export async function EncabezadoPublico() {
  const yo = await getSessionUser();
  return (
    <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 max-w-5xl mx-auto w-full">
      <Link href="/" className="flex items-center gap-2.5 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático propio */}
        <img src="/icon.svg" alt="" className="w-8 h-8 rounded-lg shrink-0" />
        <span className="font-extrabold tracking-tight truncate max-[359px]:hidden">Pañuelo sin efecto</span>
      </Link>
      <nav className="flex items-center gap-2 text-sm font-semibold shrink-0">
        {yo ? (
          <>
            {yo.rol === "ARBITRO" ? (
              <Link href="/mis-partidos" className="px-3 py-2 rounded-xl bg-foreground/10">
                Mis partidos
              </Link>
            ) : (
              <>
                <Link href="/mis-partidos" className="px-3 py-2 rounded-xl hover:bg-foreground/10">
                  Arbitrar
                </Link>
                <Link href="/admin" className="px-3 py-2 rounded-xl bg-foreground/10">
                  Panel
                </Link>
              </>
            )}
          </>
        ) : (
          <>
            <Link href="/login" className="px-3 py-2 rounded-xl hover:bg-foreground/10">
              Entrar
            </Link>
            <Link
              href="/arbitrar"
              className="px-4 py-2 rounded-xl bg-panuelo text-[#1a1600] shadow-sm active:scale-95 transition-transform"
            >
              Arbitrar
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
