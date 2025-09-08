import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/user-store";
import { signToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

export async function POST(req: NextRequest) {
  const { nickname, password } = await req.json();
  const n = String(nickname ?? "").trim().slice(2, 24);
  const p = String(password ?? "");
  if (!n || !p) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const u = await createUser(n, p);
    const token = await signToken({ id: u.id, name: u.nickname }, "14d");
    return NextResponse.json({ token, user: { id: u.id, nickname: u.nickname } });
  } catch (_) {
    return NextResponse.json({ error: "exists" }, { status: 409 });
  }
}