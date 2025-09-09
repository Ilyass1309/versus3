// lib/lobbyApi.ts
import { Room, ScoreRow, adaptRoom } from "@/types/lobby";

async function asJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any)?.error ?? "server");
  return body as T;
}

export async function listMatches(): Promise<Room[]> {
  const body = await asJson<any>(await fetch("/api/match/list", { cache: "no-store" }));
  const raw: any[] = body?.matches ?? body?.list ?? body?.rooms ?? body?.data ?? [];
  return raw.map(adaptRoom).filter(Boolean) as Room[];
}

export async function createMatch(name: string): Promise<string> {
  const body = await asJson<any>(
    await fetch("/api/match/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
  return String(body?.matchId ?? body?.id ?? body?.match_id ?? "");
}

export async function joinMatch(matchId: string, playerId: string): Promise<void> {
  await asJson<any>(
    await fetch("/api/match/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, playerId }),
    }),
  );
}

export async function deleteMatch(matchId: string, playerId: string): Promise<void> {
  await asJson<any>(
    await fetch("/api/match/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, playerId }),
    }),
  );
}

export async function fetchLeaderboard(): Promise<ScoreRow[]> {
  const body = await asJson<any>(await fetch("/api/scoreboard", { cache: "no-store" }));
  return (body?.top ?? body?.leaderboard ?? []) as ScoreRow[];
}
