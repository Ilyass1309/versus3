import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/user-store";
import { signToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

export async function POST(req: NextRequest) {
  try {
    const { nickname, password } = await req.json();
    const n = String(nickname ?? "").trim();
    const p = String(password ?? "");
    console.log("[LOGIN] attempt:", { nickname: n });
    if (!n || !p) return NextResponse.json({ error: "invalid" }, { status: 400 });

    const u = await verifyPassword(n, p);
    if (!u) {
      console.log("[LOGIN] invalid credentials for:", n);
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    if (!process.env.AUTH_SECRET) {
      console.error("[LOGIN] Missing AUTH_SECRET");
      return NextResponse.json({ error: "missing_auth_secret" }, { status: 500 });
    }

    const token = await signToken({ id: u.id, name: u.nickname }, "14d");
    return NextResponse.json({ token, user: { id: u.id, nickname: u.nickname } });
  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    return NextResponse.json({ error: "db_error", message: String((err as Error).message) }, { status: 500 });
  }
}