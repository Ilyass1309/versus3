import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
const _sql = neon(DATABASE_URL);

async function sql<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
  try {
    // Log la requête SQL et les valeurs (affichage lisible)
    console.log("[SQL]", strings.raw.join(''), values);
    const result = await _sql(strings, ...values) as unknown as Promise<T[]>;
    console.log("[SQL RESULT]", result);
    return result;
  } catch (e) {
    console.error("[SQL ERROR]", e);
    throw e;
  }
}

export type DBUser = { id: string; nickname: string; password_hash: string };

export async function findUser(nickname: string): Promise<DBUser | null> {
  console.log("[findUser] nickname:", nickname);
  const rows = await sql<DBUser>`
    select id, nickname, password_hash
    from users
    where nickname_lower = lower(${nickname})
    limit 1
  `;
  console.log("[findUser] rows:", rows);
  return rows[0] ?? null;
}

export async function createUser(nickname: string, password: string): Promise<DBUser> {
  console.log("[createUser] nickname:", nickname);
  const id = Math.random().toString(36).slice(2, 12);
  const hash = await bcrypt.hash(password, 10);
  console.log("[createUser] hash:", hash);
  const rows = await sql<DBUser>`
    insert into users (id, nickname, nickname_lower, password_hash)
    values (${id}, ${nickname}, ${nickname.toLowerCase()}, ${hash})
    returning id, nickname, password_hash
  `;
  console.log("[createUser] rows:", rows);
  if (!rows[0]) throw new Error("insert_failed");
  return rows[0];
}

export async function verifyPassword(nickname: string, password: string): Promise<DBUser | null> {
  console.log("[verifyPassword] nickname:", nickname);
  const u = await findUser(nickname);
  if (!u) {
    console.log("[verifyPassword] user not found");
    return null;
  }
  const ok = await bcrypt.compare(password, u.password_hash);
  console.log("[verifyPassword] password match:", ok);
  return ok ? u : null;
}