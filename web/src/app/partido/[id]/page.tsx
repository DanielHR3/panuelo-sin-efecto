import { apiFetch } from "@/lib/api";
import type { GameEvent, PartidoConRoster } from "@/lib/types";
import ScoreboardClient from "./ScoreboardClient";

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [partido, eventos] = await Promise.all([
    apiFetch<PartidoConRoster>(`/partidos/${id}`),
    apiFetch<GameEvent[]>(`/partidos/${id}/eventos`),
  ]);

  return <ScoreboardClient partido={partido} eventosIniciales={eventos} />;
}
