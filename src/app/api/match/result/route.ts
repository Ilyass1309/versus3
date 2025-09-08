// ...existing imports...
import { NextRequest, NextResponse } from "next/server";
import { addPointsToUserId } from "@/lib/db";

export const runtime = "nodejs";

/*
  POST body: { winnerId: number, loserId?: number, winDelta?: number, lossDelta?: number }
  Default: winner +10, loser -5
*/
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const winnerId = Number(body?.winnerId || 0);
    const loserId = body?.loserId ? Number(body.loserId) : null;
    const winDelta = typeof body?.winDelta === "number" ? body.winDelta : 10;
    const lossDelta = typeof body?.lossDelta === "number" ? body.lossDelta : -5;

    if (!winnerId) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

    await addPointsToUserId(winnerId, winDelta);
    if (loserId) await addPointsToUserId(loserId, lossDelta);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[MATCH/RESULT] error:", err);
    return NextResponse.json({ ok: false, error: String((err as Error).message) }, { status: 500 });
  }
}