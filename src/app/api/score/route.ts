import { NextResponse } from "next/server";
import { getUserBySession, incrementAuthedPlayerWin } from "@/lib/db";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const user = await getUserBySession(token);
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    await incrementAuthedPlayerWin(user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}