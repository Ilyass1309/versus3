import { NextResponse } from "next/server";
import { getUserBySession } from "@/lib/db";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return NextResponse.json({ user: null });
  const user = await getUserBySession(token);
  return NextResponse.json({ user: user ? { id: user.id, nickname: user.nickname } : null });
}