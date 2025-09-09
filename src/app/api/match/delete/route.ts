import { NextResponse } from "next/server";
import { removeFromIndex } from "@/lib/match-store";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const matchId = String(body?.matchId ?? body?.id ?? body?.match_id ?? "");
  if (!matchId) {
    return NextResponse.json({ error: "missing_matchId" }, { status: 400 });
  }

  try {
    // remove from index so it no longer appears in lists
    await removeFromIndex(matchId).catch(() => {});

    // best-effort: delete match key from redis if present
    try {
      await redis.del(`match:${matchId}`);
    } catch (e) {
      // ignore redis deletion errors
      console.warn("[match/delete] redis.del failed", e);
    }

    return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("[match/delete] error:", err);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }