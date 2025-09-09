// src/lib/lobbyApi.ts
import { Room, ScoreRow, adaptRoom } from "../types/lobby"

// Helpers de parsing sûrs sans `any`
async function asJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const msg =
      (isRecord(body) && typeof body.error === "string" && body.error) ||
      "server";
    throw new Error(msg);
  }
  return body as T;
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function arrayFromUnknown(u: unknown): unknown[] {
  return Array.isArray(u) ? u : [];
}

/* ---------- Types de réponses API ---------- */
type MatchListResponse = {
  matches?: unknown;
  list?: unknown;
  rooms?: unknown;
  data?: unknown;
  error?: string;
};
type CreateMatchResponse = {
  matchId?: string;
  id?: string;
  match_id?: string;
  error?: string;
};
type ScoreboardResponse = {
  top?: ScoreRow[];
  leaderboard?: ScoreRow[];
  error?: string;
};

/* ---------------- API ---------------- */
export async function listMatches(): Promise<Room[]> {
  const body = await asJson<MatchListResponse>(
    await fetch("/api/match/list", { cache: "no-store" }),
  );

  const raw: unknown[] =
    arrayFromUnknown(body.matches) ||
    arrayFromUnknown(body.list) ||
    arrayFromUnknown(body.rooms) ||
    arrayFromUnknown(body.data);

  return raw.map(adaptRoom).filter(Boolean) as Room[];
}

export async function createMatch(name: string): Promise<string> {
  const body = await asJson<CreateMatchResponse>(
    await fetch("/api/match/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
  return String(body.matchId ?? body.id ?? body.match_id ?? "");
}

export async function joinMatch(matchId: string, playerId: string): Promise<void> {
  // La réponse ne nous intéresse pas, on veut juste lever si !ok
  await asJson<unknown>(
    await fetch("/api/match/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, playerId }),
    }),
  );
}

export async function deleteMatch(matchId: string, playerId: string): Promise<void> {
  await asJson<unknown>(
    await fetch("/api/match/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, playerId }),
    }),
  );
}

export async function fetchLeaderboard(): Promise<ScoreRow[]> {
  const body = await asJson<ScoreboardResponse>(
    await fetch("/api/scoreboard", { cache: "no-store" }),
  );
  return (body.top ?? body.leaderboard ?? []) as ScoreRow[];
}
