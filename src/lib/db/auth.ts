import bcrypt from "bcryptjs";
import { sql } from "./sql";
import { ensurePlayerScoresTable } from "./scores"; // si tu réutilises l'alias côté score

export interface User {
  id: number;
  nickname: string;
  created_at: string;
}

export async function ensureAuthTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nickname TEXT NOT NULL UNIQUE,
      nickname_lower TEXT,
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

  // backfill + contrainte NOT NULL
  try {
    await sql`UPDATE users SET nickname_lower = lower(nickname) WHERE nickname_lower IS NULL`;
    await sql`ALTER TABLE users ALTER COLUMN nickname_lower SET NOT NULL`;
  } catch {
    // idempotent: ok si déjà fait
  }
}

export async function registerUser(
  nickname: string,
  password: string
): Promise<{ id: number; nickname: string } | null> {
  const nick = nickname.trim();
  const nickLower = nick.toLowerCase();
  const hash = await bcrypt.hash(password, 10);

  const rows = await sql<{ id: number; nickname: string }>`
    INSERT INTO users (nickname, nickname_lower, password_hash, created_at)
    VALUES (${nick}, ${nickLower}, ${hash}, NOW())
    RETURNING id, nickname
  `;
  return rows[0] ?? null;
}

export async function findUserByNickname(
  nickname: string
): Promise<{ id: number; password_hash: string } | null> {
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
    await sql`DELETE FROM sessions WHERE token = ${token}`.catch(() => {});
    return null;
  }
  return { id: row.id, nickname: row.nickname, created_at: row.created_at };
}

export async function deleteSession(token: string) {
  await ensureAuthTables();
  await sql`DELETE FROM sessions WHERE token = ${token}`;
}
