import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getSessionToken } from "@/lib/server-api";

/**
 * Reenvía el .xlsx a POST /ligas/:ligaId/importar con la sesión. /api/proxy
 * no sirve aquí: reenvía el cuerpo como JSON y esto es multipart.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ ligaId: string }> }) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ message: "No hay sesión activa" }, { status: 401 });
  const { ligaId } = await params;
  const confirmar = request.nextUrl.searchParams.get("confirmar") === "true";

  const entrada = await request.formData();
  const archivo = entrada.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ message: "Elige un archivo .xlsx" }, { status: 400 });
  }
  const salida = new FormData();
  salida.append("archivo", archivo, archivo.name);

  const res = await fetch(
    `${API_URL}/ligas/${encodeURIComponent(ligaId)}/importar${confirmar ? "?confirmar=true" : ""}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: salida },
  );
  const texto = await res.text();
  return new NextResponse(texto, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
