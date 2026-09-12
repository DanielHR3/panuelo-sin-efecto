"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * No forzamos Dark Mode (regla #3 de web/CLAUDE.md): por defecto sigue la
 * preferencia del sistema, y next-themes persiste el cambio manual en
 * localStorage sin parpadeo (inyecta un script antes de la hidratación).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
