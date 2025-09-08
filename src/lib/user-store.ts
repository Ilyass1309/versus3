import { redis } from "./redis";
import bcrypt from "bcryptjs";

type DBUser = { id: string; nickname: string; pass: string };

function key(nickname: string) {
  return `user:${nickname.toLowerCase()}`;
}

export async function findUser(nickname: string): Promise<DBUser | null> {
  const raw = await redis.get(key(nickname));
  return raw ? (JSON.parse(raw) as DBUser) : null;
}

export async function createUser(nickname: string, password: string): Promise<DBUser> {
  const exists = await findUser(nickname);
  if (exists) throw new Error("exists");
  const id = Math.random().toString(36).slice(2, 10);
  const pass = await bcrypt.hash(password, 10);
  const user = { id, nickname, pass };
  await redis.set(key(nickname), JSON.stringify(user));
  return user;
}

export async function verifyPassword(nickname: string, password: string): Promise<DBUser | null> {
  const u = await findUser(nickname);
  if (!u) return null;
  const ok = await bcrypt.compare(password, u.pass);
  return ok ? u : null;
}