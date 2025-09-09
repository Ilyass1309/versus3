import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const top = await getLeaderboard(20);
    return NextResponse.json({ ok: true, top });
  } catch (err) {
    console.error("[SCOREBOARD] error:", err);
    return NextResponse.json({ ok: false, error: String((err as Error).message) }, { status: 500 });
  }
}