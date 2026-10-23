"use client";

import { ServidorDespertando } from "@/components/estado/ServidorDespertando";

/**
 * Boundary del segmento raíz: cubre las páginas autenticadas que no tienen
 * uno propio (/mis-partidos, /partido/[id], …). No cubre el layout raíz.
 */
export default function RootError(props: {
  error: Error & { digest?: string };
  reset: () => void;
  retry: () => void;
}) {
  return (
    <main className="flex-1 flex flex-col justify-center p-4 w-full bg-fondo">
      <ServidorDespertando error={props.error} retry={props.retry} />
    </main>
  );
}
