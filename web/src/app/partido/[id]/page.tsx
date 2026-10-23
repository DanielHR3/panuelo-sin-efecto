import { notFound, redirect } from "next/navigation";
import { authedFetch } from "@/lib/server-api";
import type { GameEvent, PartidoConRoster } from "@/lib/types";
import ScoreboardClient from "./ScoreboardClient";
import { accesoDenegado, loginParaPartido, type AccesoDenegado } from "./acceso";
import { NoAsignado } from "./NoAsignado";

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let datos: [PartidoConRoster, GameEvent[]] | null = null;
  let denegado: AccesoDenegado | null = null;
  try {
    datos = await Promise.all([
      authedFetch<PartidoConRoster>(`/partidos/${id}`),
      authedFetch<GameEvent[]>(`/partidos/${id}/eventos`),
    ]);
  } catch (error) {
    denegado = accesoDenegado(error);
    if (!denegado) throw error; // 5xx, red caída…: boundary de error
  }

  // notFound()/redirect() lanzan: van fuera del try.
  if (denegado === "no-encontrado") notFound();
  if (denegado === "sin-sesion") redirect(loginParaPartido(id));
  if (denegado === "no-asignado" || !datos) return <NoAsignado partidoId={id} />;

  const [partido, eventos] = datos;
  return <ScoreboardClient partido={partido} eventosIniciales={eventos} />;
}
