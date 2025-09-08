import { redis } from "./redis";

export type Phase = "collect" | "resolve" | "ended";

export interface RLState {
  pHP: number;
  eHP: number;
  pCharge: number;
  eCharge: number;
  turn: number;
}

export type PlayerAction = { action: number; spend: number };

export interface Match {
  id: string;
  createdAt: number;
  players: string[];
  state: RLState;
  actions: Record<string, PlayerAction>;
  turn: number;
  phase: Phase;
}

const MATCH_TTL_SECONDS = 60 * 60 * 4; // 4h

function matchKey(id: string) {
  return `match:${id}`;
}
function lockKey(id: string) {
  return `lock:match:${id}`;
}

export async function getMatch(id: string): Promise<Match | null> {
  const raw = await redis.get(matchKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Match;
  } catch {
    return null;
  }
}

export async function setMatch(m: Match): Promise<void> {
  await redis.set(matchKey(m.id), JSON.stringify(m), "EX", MATCH_TTL_SECONDS);
}

export async function createNewMatch(id: string, initial: RLState): Promise<Match> {
  const m: Match = {
    id,
    createdAt: Date.now(),
    players: [],
    state: initial,
    actions: {},
    turn: initial.turn ?? 1,
    phase: "collect",
  };
  await setMatch(m);
  return m;
}

export type ReleaseFn = () => Promise<void>;

// Lock best-effort pour sérialiser la résolution
export async function acquireMatchLock(
  matchId: string,
  ttlSec = 2
): Promise<ReleaseFn | null> {
  const key = lockKey(matchId);
  const token = Math.random().toString(36).slice(2);

  // ioredis: SET key value "EX" seconds "NX" → "OK" | null
  const secs = Math.max(1, Math.floor(ttlSec));
  const res = (await redis.set(key, token, "EX", secs, "NX")) as "OK" | null;
  if (res !== "OK") return null;

  return async () => {
    try {
      const current = await redis.get(key);
      if (current === token) await redis.del(key);
    } catch {
      // noop
    }
  };
}