import { NextResponse } from "next/server";
import { addMultiplayerPointsToNickname } from "@/lib/db/multiplayerScores";
import { getMatch, setMatch, acquireMatchLock } from "@/lib/match-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { matchId, winner } = body as { matchId?: string; winner?: string };

    if (!matchId || !winner) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    // Acquire lock to avoid double-award races
    const release = await acquireMatchLock(matchId, 2);
    if (!release) {
      // check current match state once before returning — if already awarded, return success
      try {
        const existing = await getMatch(matchId);
        if (existing && (existing as unknown as { awarded?: boolean }).awarded) {
          return NextResponse.json({ ok: true });
        }
      } catch {
        // ignore errors here, fallthrough to returning busy
      }
      // do not warn/log loudly here; busy is expected in concurrent cases
      return NextResponse.json({ ok: false, error: "busy" }, { status: 503 });
    }

    try {
      const m = await getMatch(matchId);
      if (!m) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

      // If already awarded -> idempotent success
      if ((m as unknown as { awarded?: boolean }).awarded) {
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

      // Do the award and persist the awarded flag while holding the lock
      try {
        await addMultiplayerPointsToNickname(winner, 1);
      } catch (err) {
        console.error("[match/award] db error during add points:", err);
        return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
      }

      try {
        (m as unknown as { awarded?: boolean }).awarded = true;
        await setMatch(m);
      } catch (e) {
        console.warn("[match/award] failed to persist awarded flag", e);
        // still return success because points were added; best-effort persistence
      }

      console.info("[match/award] awarded +1 point to", winner, "for match", matchId);
      return NextResponse.json({ ok: true });
    } finally {
      try {
        if (typeof release === "function") {
          // release may be sync or async
          const r = release();
          if (r && typeof (r as Promise<unknown>).then === "function") await r;
        }
      } catch (e) {
        console.warn("[match/award] failed to release lock", e);
      }
    }
  } catch (err) {
    console.error("[match/award] error:", err);
    return NextResponse.json({ ok: false, error: String((err as Error).message) }, { status: 500 });
  }
}