import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { initialState } from "@/lib/rl/env";
import { createNewMatch } from "@/lib/match-store";
import { lobbyChannel, matchChannel } from "@/lib/pusher-channel";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const creator: string | undefined = body?.name ? String(body.name).slice(0, 24) : undefined;

    const id = Math.random().toString(36).slice(2, 10);
    let st;
    try { st = initialState(); } catch { st = { pHP:20, eHP:20, pCharge:0, eCharge:0, turn:1 }; }

    const m = await createNewMatch(id, st, creator);

    try {
      await pusherServer.trigger(lobbyChannel, "created", { id: m.id, players: 0, createdAt: m.createdAt, createdBy: creator });
      await pusherServer.trigger(matchChannel(id), "meta", { status: "created" });
    } catch {}
    return NextResponse.json({ matchId: id });
  } catch (e) {
    console.error("[match/create] error:", (e as Error).message);
    return NextResponse.json({ error: "match_creation_failed" }, { status: 500 });
  }
}