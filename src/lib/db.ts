import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import type { QTable } from "./rl/qtable";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
const _sql = neon(DATABASE_URL);

// wrapper typé qui retourne directement les lignes
async function sql<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
  // Log minimal pour debug (supprime en prod si voulu)
  try {
    // console.log("[SQL]", strings.raw.join(""), values);
    const res = await _sql(strings, ...values);
    return res as unknown as T[];
  } catch (err) {
    console.error("[SQL ERROR]", err);
    throw err;
  }
}

type QRowDB = { id: number; version: number; qjson: QTable };

export async function getQTable(): Promise<{ version: number; q: QTable }> {
  const rows = await sql<QRowDB>`
    SELECT id, version, qjson
    FROM qtable
    WHERE id = 1
  `;
  if (rows.length === 0) {
    const inserted = await sql<QRowDB>`
      INSERT INTO qtable (id, version, qjson)
      VALUES (1, 1, '{}'::jsonb)
      ON CONFLICT (id) DO NOTHING
      RETURNING id, version, qjson
    `;
    const row = inserted[0] ?? { id: 1, version: 1, qjson: {} as QTable };
    return { version: row.version, q: row.qjson };
  }
  const row = rows[0] ?? { id: 1, version: 1, qjson: {} as QTable };
  return { version: row.version, q: row.qjson };
}

/**
 * NOTE: this implementation is non-transactional to avoid depending on
 * client.connect() from the neon tag. This is simpler and removes TS errors.
 * If you need strict locking, use a dedicated DB client and transactions.
 */
export async function withLockedQTable(
  updater: (q: QTable) => Promise<void> | void
): Promise<{ version: number; q: QTable }> {
  // read current
  const rows = await sql<QRowDB>`
    SELECT id, version, qjson
    FROM qtable
    WHERE id = 1
  `;
  const current = rows[0] ?? { id: 1, version: 1, qjson: {} as QTable };

  // defensive clone
  const q: QTable = JSON.parse(JSON.stringify(current.qjson || {}));
  await updater(q);
  const newVersion = (current.version ?? 1) + 1;
  const qJson = JSON.stringify(q);

  const updatedRows = await sql<QRowDB>`
    INSERT INTO qtable (id, version, qjson, updated_at)
    VALUES (1, ${newVersion}, ${qJson}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      version = EXCLUDED.version,
      qjson = EXCLUDED.qjson,
      updated_at = NOW()
    RETURNING id, version, qjson
  `;
  const updated = updatedRows[0] ?? { id: 1, version: newVersion, qjson: q as QTable };
  return { version: updated.version, q: updated.qjson };
}

export async function logEpisode(params: {
  clientVersion?: number | null;
  steps: Array<{ aAI: number; aPL: number }>;
  turns: number;
  aiWin: boolean;
  reason: string;
}) {
  const stepsJson = JSON.stringify(params.steps);
  await sql`
    INSERT INTO episodes (client_version, steps, turns, ai_win, reason)
    VALUES (
      ${params.clientVersion ?? null},
      ${stepsJson}::jsonb,
      ${params.turns},
      ${params.aiWin},
      ${params.reason}
    )
  `;
}

/* points / leaderboard helpers */
export async function ensurePlayerPointsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS player_scores (
      nickname TEXT PRIMARY KEY,
      wins INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function addPointsToNickname(nickname: string, delta: number) {
  if (!nickname) return;
  await ensurePlayerPointsTable();
  await sql`
    INSERT INTO player_scores (nickname, wins)
    VALUES (${nickname}, ${delta})
    ON CONFLICT (nickname)
    DO UPDATE SET
      wins = player_scores.wins + ${delta},
      updated_at = NOW()
  `;
}

export async function addPointsToUserId(userId: number, delta: number) {
  if (!userId) return;
  const rows = await sql<{ nickname: string }>`
    SELECT nickname FROM users WHERE id = ${userId}
  `;
  const row = rows[0];
  if (!row) return;
  await addPointsToNickname(row.nickname, delta);
}

export async function getLeaderboard(limit = 10): Promise<Array<{ nickname: string; points: number }>> {
  await ensurePlayerPointsTable();
  const rows = await sql<{ nickname: string; points: number }>`
    SELECT nickname, wins AS points
    FROM player_scores
    ORDER BY wins DESC, nickname ASC
    LIMIT ${limit}
  `;
  return rows;
}

// Alias pour compatibilité (getTopPlayers)
export async function getTopPlayers(limit = 10) {
  return getLeaderboard(limit);
}

// compatibility alias
export const ensurePlayerScoresTable = ensurePlayerPointsTable;

// --- AUTH TABLES & HELPERS ---

export async function ensureAuthTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nickname TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export interface User {
  id: number;
  nickname: string;
  created_at: string;
}

export async function registerUser(nickname: string, password: string): Promise<{ id: number; nickname: string }> {
  await ensureAuthTables();
  const hash = await bcrypt.hash(password, 10);

  // NOTE: pass the row type (not an array type) to sql<...>
  const rows = await sql<{ id: number; nickname: string }>`
    INSERT INTO users (nickname, password_hash)
    VALUES (${nickname}, ${hash})
    ON CONFLICT (nickname) DO NOTHING
    RETURNING id, nickname
  `;

  if (!rows || !rows[0]) {
    const err = new Error("nickname_taken");
    throw err;
  }
  return rows[0];
}

export async function findUserByNickname(nickname: string): Promise<{ id: number; password_hash: string } | null> {
  await ensureAuthTables();
  const rows = await sql<{ id: number; password_hash: string }>`
    SELECT id, password_hash FROM users WHERE nickname = ${nickname}
  `;
  return rows[0] ?? null;
}

export async function createSession(userId: number) {
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const expires = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  await sql`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expires})
  `;
  return { token, expires };
}

export async function getUserBySession(token: string): Promise<User | null> {
  if (!token) return null;
  await ensureAuthTables();
  const rows = await sql<(User & { expires_at: string })>`
    SELECT u.id, u.nickname, u.created_at, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
  `;
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await sql`DELETE FROM sessions WHERE token = ${token}`.catch(()=>{});
    return null;
  }
  return { id: row.id, nickname: row.nickname, created_at: row.created_at };
}

export async function deleteSession(token: string) {
  await ensureAuthTables();
  await sql`DELETE FROM sessions WHERE token = ${token}`;
}

// Secure score increment now uses authenticated user (server-side)
export async function incrementAuthedPlayerWin(userId: number) {
  await ensurePlayerScoresTable();
  const rows = await sql<{ nickname: string }>`SELECT nickname FROM users WHERE id=${userId}`;
  const row = rows[0];
  if (!row) return;
  const nick = row.nickname;
  await sql`
    INSERT INTO player_scores (nickname, wins)
    VALUES (${nick}, 1)
    ON CONFLICT (nickname)
    DO UPDATE SET wins = player_scores.wins + 1,
                  updated_at = NOW()
  `;
}
