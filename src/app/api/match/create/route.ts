import { NextResponse } from "next/server";
import { matches, pusherServer } from "@/lib/pusher-server";
import { matchChannel } from "@/lib/pusher-channel";
import { initialState } from "@/lib/rl/env";
export const runtime = "nodejs";

export async function POST() {
  try {
    const id = Math.random().toString(36).slice(2, 10);

    let st;
    try {
      st = initialState();
    } catch {
      // Fallback minimal si initialState() jette
      st = { pHP: 20, eHP: 20, pCharge: 0, eCharge: 0, turn: 1 };
    }

    matches.set(id, {
      id,
      createdAt: Date.now(),
      players: [],
      state: st,
      actions: {},
      turn: 1,
      phase: "collect",
    });

    // N’empêche pas la réponse si Pusher échoue
    try {
      await pusherServer.trigger(matchChannel(id), "meta", { status: "created" });
    } catch (e) {
      console.warn("[pusher] trigger failed:", (e as Error).message);
    }

    return NextResponse.json({ matchId: id });
  } catch (e) {
    console.error("[match/create] error:", (e as Error).message);
    return NextResponse.json({ error: "match_creation_failed" }, { status: 500 });
  }
}