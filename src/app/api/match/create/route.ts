import { NextResponse } from "next/server";
import { matches, pusherServer } from "@/lib/pusher-server";
import { matchChannel } from "@/lib/pusher-channel";
import { initialState } from "@/lib/rl/env";
export const runtime = "nodejs";

export async function POST() {
  const id = Math.random().toString(36).slice(2, 10);
  const st = initialState();
  matches.set(id, {
    id,
    createdAt: Date.now(),
    players: [],
    state: st,
    actions: {},
    turn: 1,
    phase: "collect",
  });
  await pusherServer.trigger(matchChannel(id), "meta", { status: "created" });
  return NextResponse.json({ matchId: id });
}