import { NextResponse } from "next/server";

/** Versión que está publicada ahora mismo (ver next.config.ts). Nunca en caché. */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_VERSION ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
