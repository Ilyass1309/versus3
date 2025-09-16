import { NextResponse } from "next/server";
import { addMultiplayerPointsToNickname } from "@/lib/db/multiplayerScores";
import { getMatch } from "@/lib/match-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { matchId, winner } = body as { matchId?: string; winner?: string };

    if (!matchId || !winner) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    const m = await getMatch(matchId);
    if (!m) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // Accept winner if it matches a player id/nickname present in the match (best-effort)
    const players = m.players ?? [];
    const names = (m as any).names ?? {};
    const allowed =
      players.includes(winner) ||
      Object.values(names).includes(winner) ||
      Object.keys(names).includes(winner);

    if (!allowed) {
      console.warn("[match/award] winner not recognized for match", { matchId, winner, players, names });
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    try {
      await addMultiplayerPointsToNickname(winner, 1);
      console.info("[match/award] awarded +1 point to", winner, "for match", matchId);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("[match/award] db error:", err);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }
  } catch (err) {
    console.error("[match/award] error:", err);
    return NextResponse.json({ ok: false, error: String((err as Error).message) }, { status: 500 });
  }
}