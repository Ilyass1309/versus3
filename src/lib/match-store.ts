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
  names: Record<string, string>;
  createdByName?: string;
  rematchReady?: string[]; // playerIds qui ont cliqué "Relancer"
}

const MATCH_TTL_SECONDS = 60 * 60 * 4; // 4h
const INDEX_KEY = "match:index";

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

export async function createNewMatch(id: string, initial: RLState, createdByName?: string): Promise<Match> {
  const m: Match = {
    id,
    createdAt: Date.now(),
    players: [],
    state: initial,
    actions: {},
    turn: initial.turn ?? 1,
    phase: "collect",
    names: {},
    createdByName,
    rematchReady: [],
  };
  await setMatch(m);
  // index pour la liste des salons (score = createdAt)
  await redis.zadd(INDEX_KEY, m.createdAt, m.id);
  return m;
}

export async function removeFromIndex(id: string): Promise<void> {
  await redis.zrem(INDEX_KEY, id);
}

export async function addToIndex(id: string, createdAt: number): Promise<void> {
  await redis.zadd(INDEX_KEY, createdAt, id);
}

export type ReleaseFn = () => Promise<void>;

// Lock best-effort pour sérialiser la résolution
export async function acquireMatchLock(
  matchId: string,
  ttlSec = 2
): Promise<ReleaseFn | null> {
  const key = lockKey(matchId);
  const token = Math.random().toString(36).slice(2);
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

// Liste des salons ouverts (non complets)
export async function listOpenMatches(limit = 50): Promise<Array<{ id: string; players: number; createdAt: number; createdBy?: string }>> {
  const ids = await redis.zrevrange(INDEX_KEY, 0, Math.max(0, limit - 1));
  if (ids.length === 0) return [];

  // pipeline mget
  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.get(matchKey(id));

  const out: Array<{ id: string; players: number; createdAt: number; createdBy?: string }> = [];
  const toCleanup: string[] = [];

  const execRes = await pipeline.exec();
  if (!execRes) {
    return out;
  }

  ids.forEach((id, i) => {
    const [err, raw] = execRes[i] as [Error | null, string | null];
    if (err || !raw) {
      toCleanup.push(id);
      return;
    }
    try {
      const m = JSON.parse(raw) as Match;
      const playersCount = m.players?.length ?? 0;
      const ended = m.phase === "ended";
      if (playersCount < 2 && !ended) {
        out.push({ id: m.id, players: playersCount, createdAt: m.createdAt, createdBy: m.createdByName });
      } else {
        toCleanup.push(id);
      }
    } catch {
      toCleanup.push(id);
    }
  });

  if (toCleanup.length) {
    try {
      await redis.zrem(INDEX_KEY, ...toCleanup);
    } catch {}
  }

  return out;
}