import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { getSessionToken } from "@/lib/server-api";

type Ctx = { params: Promise<{ id: string }> };

/** Muestra el comprobante (dueño de la liga o SUPERADMIN) sin exponer el token. */
export async function GET(_request: NextRequest, { params }: Ctx): Promise<Response> {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ message: "No hay sesión activa" }, { status: 401 });
  const { id } = await params;
  const res = await fetch(`${API_URL}/pagos/${encodeURIComponent(id)}/comprobante`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ message: "No se encontró el comprobante" }, { status: res.status });
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Sube el comprobante (multipart) de un pago pendiente. */
export async function POST(request: NextRequest, { params }: Ctx): Promise<Response> {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ message: "No hay sesión activa" }, { status: 401 });
  const { id } = await params;
  const archivo = (await request.formData()).get("archivo");
  if (!(archivo instanceof File)) return NextResponse.json({ message: "Elige una foto o un PDF" }, { status: 400 });
  const salida = new FormData();
  salida.append("archivo", archivo, archivo.name);
  const res = await fetch(`${API_URL}/pagos/${encodeURIComponent(id)}/comprobante`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: salida,
  });
  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
