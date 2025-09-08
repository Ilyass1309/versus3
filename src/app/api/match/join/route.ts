import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { matchChannel } from "@/lib/pusher-channel";
import { getMatch, setMatch, Match } from "@/lib/match-store";
export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

export async function POST(req: NextRequest) {
  const { matchId, playerId } = await req.json();

  const m = await getMatch(matchId);
  if (!m) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!m.players.includes(playerId)) {
    if (m.players.length >= 2) {
      return NextResponse.json({ error: "full" }, { status: 409 });
    }
    m.players.push(playerId);
    await setMatch(m);
  }

  const state = publicState(m);
  try {
    await pusherServer.trigger(matchChannel(matchId), "state", state);
  } catch {}
  return NextResponse.json({ ok: true, state });
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