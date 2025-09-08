// ...existing imports...
import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const top = await getLeaderboard(20);
    return NextResponse.json({ ok: true, leaderboard: top });
  } catch (err) {
    console.error("[LEADERBOARD] error:", err);
    return NextResponse.json({ ok: false, error: String((err as Error).message) }, { status: 500 });
  }
}