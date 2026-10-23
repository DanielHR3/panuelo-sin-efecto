import { authedFetch } from "@/lib/server-api";
import type { GameEvent, PartidoConRoster } from "@/lib/types";
import ScoreboardClient from "./ScoreboardClient";

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [partido, eventos] = await Promise.all([
    authedFetch<PartidoConRoster>(`/partidos/${id}`),
    authedFetch<GameEvent[]>(`/partidos/${id}/eventos`),
  ]);

  return <ScoreboardClient partido={partido} eventosIniciales={eventos} />;
}
