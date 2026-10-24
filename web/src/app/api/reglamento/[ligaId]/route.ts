import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getSessionToken } from "@/lib/server-api";

type Ctx = { params: Promise<{ ligaId: string }> };

async function reenviar(url: string, init: RequestInit): Promise<NextResponse> {
  const res = await fetch(url, init);
  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

/** Sube o reemplaza el PDF del reglamento (multipart; /api/proxy solo reenvía JSON). */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ message: "No hay sesión activa" }, { status: 401 });
  const { ligaId } = await params;
  const archivo = (await request.formData()).get("archivo");
  if (!(archivo instanceof File)) return NextResponse.json({ message: "Elige el PDF del reglamento" }, { status: 400 });
  const salida = new FormData();
  salida.append("archivo", archivo, archivo.name);
  return reenviar(`${API_URL}/ligas/${encodeURIComponent(ligaId)}/reglamento`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: salida,
  });
}

/** Quita el reglamento propio: la liga vuelve al de IFAF. */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ message: "No hay sesión activa" }, { status: 401 });
  const { ligaId } = await params;
  return reenviar(`${API_URL}/ligas/${encodeURIComponent(ligaId)}/reglamento`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
