import { NextResponse } from "next/server";
import { addMultiplayerPointsToNickname } from "@/lib/db/multiplayerScores";
import { getMatch, setMatch } from "@/lib/match-store";

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

    // If we've already awarded this match, return success (idempotent)
    // (uses a best-effort flag stored on the match object)
    if ((m as unknown as { awarded?: boolean }).awarded) {
      console.info("[match/award] already awarded, ignoring duplicate", { matchId, winner });
      return NextResponse.json({ ok: true });
    }

    // Accept winner if it matches a player id/nickname present in the match (best-effort)
    const players = m.players ?? [];
    const names = (m as unknown as { names?: Record<string, string> }).names ?? {};
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
      // mark match as awarded to prevent duplicates
      try {
        (m as unknown as { awarded?: boolean }).awarded = true;
        await setMatch(m);
      } catch (e) {
        console.warn("[match/award] failed to persist awarded flag", e);
      }
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