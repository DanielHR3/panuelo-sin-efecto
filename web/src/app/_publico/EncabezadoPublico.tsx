import Link from "next/link";
import { getSessionUser } from "@/lib/server-api";
import { Marca } from "./Marca";

const BOTON_SECUNDARIO =
  "px-3 py-2 rounded-lg font-display font-bold uppercase tracking-[0.06em] border border-texto/15";

/**
 * Barra superior de las páginas públicas. Si hay sesión, ofrece la casa de
 * cada rol; si no, el botón de entrar (el pañuelo amarillo: es la única
 * acción de color en la página).
 */
export async function EncabezadoPublico() {
  const yo = await getSessionUser();
  return (
    <div className="border-b border-texto/10">
      <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 max-w-5xl mx-auto w-full">
        <Link href="/" className="min-w-0">
          <Marca oculta />
        </Link>
        <nav className="flex items-center gap-2 text-sm shrink-0">
          {yo ? (
            <>
              {yo.rol === "ARBITRO" ? (
                <Link href="/mis-partidos" className={`${BOTON_SECUNDARIO} bg-panel`}>
                  Mis partidos
                </Link>
              ) : (
                <>
                  <Link
                    href="/mis-partidos"
                    className="px-3 py-2 rounded-lg font-display font-bold uppercase tracking-[0.06em] hover:bg-panel"
                  >
                    Arbitrar
                  </Link>
                  <Link href="/admin" className={`${BOTON_SECUNDARIO} bg-panel`}>
                    Panel
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 rounded-lg font-display font-bold uppercase tracking-[0.06em] hover:bg-panel"
              >
                Entrar
              </Link>
              <Link href="/arbitrar" className="boton-panuelo px-4 py-2 active:scale-95 transition-transform">
                Arbitrar
              </Link>
            </>
          )}
        </nav>
      </header>
    </div>
  );
}
