import { sql } from "./pg"; // ensure this import exists (adjust path if needed)
import type { QTable } from "./rl/qtable";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

type QRowDB = { id: number; version: number; qjson: QTable };

export async function getQTable(): Promise<{ version: number; q: QTable }> {
  const { rows } = await sql<QRowDB>`
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
    const row = inserted.rows[0] ?? { id: 1, version: 1, qjson: {} as QTable };
    return { version: row.version, q: row.qjson };
  }
  const row = rows[0] ?? { id: 1, version: 1, qjson: {} as QTable };
  return { version: row.version, q: row.qjson };
}

/**
 * Verrouille la Q-table (ligne id=1), applique updater(q), persiste et incrémente version.
 */
export async function withLockedQTable(
  updater: (q: QTable) => Promise<void> | void
): Promise<{ version: number; q: QTable }> {
  const client = await sql.connect();
  try {
    await client.sql`BEGIN`;
    // Lock (ou créer si absent)
    let { rows } = await client.sql<QRowDB>`
      SELECT id, version, qjson
      FROM qtable
      WHERE id = 1
      FOR UPDATE
    `;
    if (rows.length === 0) {
      const inserted = await client.sql<QRowDB>`
        INSERT INTO qtable (id, version, qjson)
        VALUES (1, 1, '{}'::jsonb)
        ON CONFLICT (id) DO NOTHING
        RETURNING id, version, qjson
      `;
      rows = inserted.rows;
    }
    const current = rows[0] ?? { id: 1, version: 1, qjson: {} as QTable };

    // Clone défensif pour éviter des références cachées
    const q: QTable = JSON.parse(JSON.stringify(current.qjson || {}));

    await updater(q);

    const newVersion = current.version + 1;

    // UPSERT (id unique)
    const qJson = JSON.stringify(q);
    const { rows: updatedRows } = await client.sql<QRowDB>`
      INSERT INTO qtable (id, version, qjson, updated_at)
      VALUES (1, ${newVersion}, ${qJson}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        version = EXCLUDED.version,
        qjson = EXCLUDED.qjson,
        updated_at = NOW()
      RETURNING id, version, qjson
    `;

    const updated = updatedRows[0] ?? { id: 1, version: newVersion, qjson: q as QTable };
    await client.sql`COMMIT`;
    return { version: updated.version, q: updated.qjson };
  } catch (err) {
    await client.sql`ROLLBACK`;
    throw err;
  } finally {
    client.release();
  }
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

/** Player scores */
export async function ensurePlayerScoresTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS player_scores (
      nickname TEXT PRIMARY KEY,
      wins INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function incrementPlayerWin(nickname: string) {
  if (!nickname) return;
  await ensurePlayerScoresTable();
  await sql`
    INSERT INTO player_scores (nickname, wins)
    VALUES (${nickname}, 1)
    ON CONFLICT (nickname)
    DO UPDATE SET
      wins = player_scores.wins + 1,
      updated_at = NOW()
  `;
}

export async function getTopPlayers(limit = 10): Promise<Array<{ nickname: string; wins: number }>> {
  await ensurePlayerScoresTable();
  const { rows } = await sql<{ nickname: string; wins: number }>`
    SELECT nickname, wins
    FROM player_scores
    ORDER BY wins DESC, nickname ASC
    LIMIT ${limit}
  `;
  return rows;
}

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

export async function registerUser(nickname: string, password: string): Promise<User> {
  await ensureAuthTables();
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await sql<User>`
    INSERT INTO users (nickname, password_hash)
    VALUES (${nickname}, ${hash})
    ON CONFLICT (nickname) DO NOTHING
    RETURNING id, nickname, created_at
  `;
  const user = rows[0];
  if (!user) throw new Error("nickname_taken");
  return user;
}

export async function findUserByNickname(nickname: string): Promise<{ id: number; password_hash: string } | null> {
  await ensureAuthTables();
  const { rows } = await sql<{ id: number; password_hash: string }>`
    SELECT id, password_hash FROM users WHERE nickname = ${nickname}
  `;
  return rows[0] ?? null;
}

export async function createSession(userId: number, days = 7) {
  await ensureAuthTables();
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + days * 86400_000);
  await sql`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expires.toISOString()})
  `;
  return { token, expires };
}

export async function getUserBySession(token: string): Promise<User | null> {
  if (!token) return null;
  await ensureAuthTables();
  const { rows } = await sql<(User & { expires_at: string })>`
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
  const { rows } = await sql<{ nickname: string }>`SELECT nickname FROM users WHERE id=${userId}`;
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
