import { NextRequest, NextResponse } from "next/server";
import { matches, Match } from "@/lib/pusher-server";
import { pusherServer } from "@/lib/pusher-server";
import { matchChannel } from "@/lib/pusher-channel";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { matchId, playerId } = await req.json();
  const m = matches.get(matchId);
  if (!m) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (m.players.length >= 2) return NextResponse.json({ error: "full" }, { status: 409 });
  if (!m.players.includes(playerId)) m.players.push(playerId);
  await pusherServer.trigger(matchChannel(matchId), "state", publicState(m));
  return NextResponse.json({ ok: true, state: publicState(m) });
}

function publicState(m: Match) {
  return {
    id: m.id,
    turn: m.turn,
    phase: m.phase,
    players: m.players,
    actions: Object.keys(m.actions),
    hp: { p: m.state.pHP, e: m.state.eHP },
    charge: { p: m.state.pCharge, e: m.state.eCharge },
  };
}