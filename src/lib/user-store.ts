import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
const _sql = neon(DATABASE_URL);

// Petit wrapper typé pour éviter les erreurs TS sur le tag template
async function sql<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
  return _sql(strings, ...values) as unknown as Promise<T[]>;
}

export type DBUser = { id: string; nickname: string; password_hash: string };

export async function findUser(nickname: string): Promise<DBUser | null> {
  const rows = await sql<DBUser>`
    select id, nickname, password_hash
    from users
    where lower(nickname) = lower(${nickname})
    limit 1
  `;
  return rows[0] ?? null;
}

export async function createUser(nickname: string, password: string): Promise<DBUser> {
  const id = Math.random().toString(36).slice(2, 12);
  const hash = await bcrypt.hash(password, 10);
  const rows = await sql<DBUser>`
    insert into users (id, nickname, password_hash)
    values (${id}, ${nickname}, ${hash})
    returning id, nickname, password_hash
  `;
  if (!rows[0]) throw new Error("insert_failed");
  return rows[0];
}

export async function verifyPassword(nickname: string, password: string): Promise<DBUser | null> {
  const u = await findUser(nickname);
  if (!u) return null;
  const ok = await bcrypt.compare(password, u.password_hash);
  return ok ? u : null;
}