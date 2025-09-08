import { createUser } from "@/lib/user-store";
import { signToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

export async function POST(req: Request) {
  const { nickname, password } = await req.json();
  const n = String(nickname ?? "").trim().slice(0, 24);
  const p = String(password ?? "");
  if (!n || !p) return Response.json({ error: "invalid" }, { status: 400 });

  try {
    const u = await createUser(n, p);
    const token = await signToken({ id: u.id, name: u.nickname }, "14d");
    return Response.json({ token, user: { id: u.id, nickname: u.nickname } });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err?.code === "23505" || err?.message === "exists") {
      return Response.json({ error: "exists" }, { status: 409 });
    }
    console.error("[signup] db_error:", e);
    return Response.json({ error: "db_error" }, { status: 500 });
  }
}