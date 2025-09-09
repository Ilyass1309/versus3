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

/* Ajout : removeFromIndex + acquireMatchLock (pour les routes join/action) */
export async function removeFromIndex(id: string): Promise<void> {
  try {
    await redis.zrem(INDEX_KEY, id);
  } catch {
    // ignore
  }
}

/**
 * Essaye d'acquérir un lock pour une matchId.
 * Retourne une fonction `release()` à appeler (await release()) ou null si indisponible.
 * ttl est en secondes (default 5s).
 */
export async function acquireMatchLock(id: string, ttl = 5): Promise<(() => Promise<void>) | null> {
  const token = Math.random().toString(36).slice(2);
  // ioredis signature: set(key, value, "EX", ttl, "NX")
  const res = await redis.set(lockKey(id), token, "EX", ttl, "NX");
  if (res !== "OK") return null;

  const release = async () => {
    try {
      // safe release: supprime la clé seulement si le token correspond
      const lua = `if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`;
      await redis.eval(lua, 1, lockKey(id), token);
    } catch {
      // ignore
    }
  };

  return release;
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
  // If a creator nickname is provided, add them as the first player so the room is visible
  const initialPlayers = createdByName ? [createdByName] : [];
  const initialNames: Record<string, string> = createdByName ? { [createdByName]: createdByName } : {};

  const m: Match = {
    id,
    createdAt: Date.now(),
    players: initialPlayers,
    state: initial,
    actions: {},
    turn: initial.turn ?? 1,
    phase: "collect",
    names: initialNames,
    createdByName,
    rematchReady: [],
  };
  await setMatch(m);
  // index pour la liste des salons (score = createdAt)
  await redis.zadd(INDEX_KEY, m.createdAt, m.id);
  return m;
}

// Liste des salons ouverts (non complets)
// Now returns the list of players (nicknames) instead of only a players count.
export async function listOpenMatches(limit = 50): Promise<Array<{ id: string; players: string[]; createdAt: number; createdBy?: string }>> {
  const ids = await redis.zrevrange(INDEX_KEY, 0, Math.max(0, limit - 1));
  if (ids.length === 0) return [];

  // pipeline mget
  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.get(matchKey(id));

  const out: Array<{ id: string; players: string[]; createdAt: number; createdBy?: string }> = [];
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
      const playersArr = Array.isArray(m.players) ? m.players.map((p) => String(p)) : [];
      const playersCount = playersArr.length;
      const ended = m.phase === "ended";
      // keep matches that are not full (less than 2 players) and not ended
      if (playersCount < 2 && !ended) {
        out.push({ id: m.id, players: playersArr, createdAt: m.createdAt, createdBy: m.createdByName });
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