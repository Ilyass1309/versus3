// types/Lobby.ts
export type ScoreRow = { nickname: string; points?: number; wins?: number };

export type Room = {
  id: string;
  host: string;
  players: string[];
  status: "open" | "started" | "closed";
};

/** Adaptateur robuste : normalise n'importe quelle payload Room en modèle canonique. */
export function adaptRoom(input: any): Room | null {
  if (!input) return null;

  const id = input.id ?? input.matchId ?? input.match_id;
  const host = input.host ?? input.host_nickname ?? input.owner ?? input.name;

  const rawPlayers = input.players ?? input.players_list ?? input.playersArray ?? [];
  let players: string[] = [];
  if (Array.isArray(rawPlayers)) {
    players = rawPlayers.map(String);
  } else if (typeof rawPlayers === "string") {
    try {
      const parsed = JSON.parse(rawPlayers);
      if (Array.isArray(parsed)) players = parsed.map(String);
    } catch {
      // ignore parse error
    }
  }

  const status = (input.status ?? "open") as Room["status"];

  if (!id || !host) return null;
  return { id: String(id), host: String(host), players, status };
}
