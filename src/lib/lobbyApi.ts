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
  console.debug("[listMatches] body =", body);

  const raw: unknown[] =
    arrayFromUnknown(body.matches) ||
    arrayFromUnknown(body.list) ||
    arrayFromUnknown(body.rooms) ||
    arrayFromUnknown(body.data);

  const list = raw.map(adaptRoom).filter(Boolean) as Room[];
  console.debug("[listMatches] rooms =", list);
  return list;
}

/** Read nickname from cookie -> localStorage.user -> localStorage.nickname -> fallback 'guest' */
function getStoredNickname(): string {
  if (typeof window === "undefined") return "guest";

  // cookie
  try {
    const m = document.cookie.match(/(?:^|;\s*)nickname=([^;]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
  } catch {}

  // local user object (prefer)
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.nickname === "string" && parsed.nickname) return parsed.nickname;
      if (typeof parsed.name === "string" && parsed.name) return parsed.name;
    }
  } catch {}

  // legacy key
  const nick = localStorage.getItem("nickname");
  if (nick) return nick;

  return "guest";
}

/** Persist nickname in cookie + localStorage (call on login / nickname set) */
export function setStoredNickname(nick: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("nickname", nick);
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        parsed.nickname = nick;
        localStorage.setItem("user", JSON.stringify(parsed));
      } catch {
        // ignore
      }
    }
    // cookie: 30 days
    const maxAge = 60 * 60 * 24 * 30;
    const secure = location.protocol === "https:";
    document.cookie = `nickname=${encodeURIComponent(nick)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${
      secure ? "; Secure" : ""
    }`;
  } catch {
    /* ignore */
  }
}

export async function createMatch(name?: string): Promise<string> {
  const nickname = name ?? getStoredNickname();
  // persist chosen nick proactively
  setStoredNickname(nickname);

  const body = await asJson<CreateMatchResponse>(
    await fetch("/api/match/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nickname }),
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
