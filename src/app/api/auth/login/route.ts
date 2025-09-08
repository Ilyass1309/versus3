import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/user-store";
import { signToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

export async function POST(req: NextRequest) {
  const { nickname, password } = await req.json();
  const n = String(nickname ?? "").trim();
  const p = String(password ?? "");
  const u = await verifyPassword(n, p);
  if (!u) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  const token = await signToken({ id: u.id, name: u.nickname }, "14d");
  return NextResponse.json({ token, user: { id: u.id, nickname: u.nickname } });
}