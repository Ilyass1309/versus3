// src/types/lobby.ts

export type ScoreRow = { nickname: string; points?: number; wins?: number };

export type Room = {
  id: string;
  host: string;
  players: string[];
  status: "open" | "started" | "closed";
};

// petits helpers de garde de type
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function toStringArray(u: unknown): string[] {
  if (Array.isArray(u)) return u.map(String);
  if (typeof u === "string") {
    try {
      const parsed = JSON.parse(u);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // ignore
    }
  }
  return [];
}

/** Adaptateur robuste : normalise n'importe quelle payload Room en modèle canonique. */
export function adaptRoom(input: unknown): Room | null {
  if (!isRecord(input)) return null;

  const id = input.id ?? input.matchId ?? input.match_id;
  const host = input.host ?? input.host_nickname ?? input.owner ?? input.name;

  const rawPlayers =
    input.players ?? input.players_list ?? input.playersArray ?? [];

  const players = toStringArray(rawPlayers);

  const status = (input.status ?? "open") as Room["status"];

  if (!id || !host) return null;
  return { id: String(id), host: String(host), players, status };
}
