import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { matchChannel, lobbyChannel } from "@/lib/pusher-channel";
import { getMatch, setMatch, removeFromIndex } from "@/lib/match-store";

export const runtime = "nodejs";
export const preferredRegion = ["iad1"];

export async function POST(req: NextRequest) {
  const { matchId, playerId } = await req.json();

  const m = await getMatch(matchId);
  if (!m) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let changed = false;
  if (!m.players.includes(playerId)) {
    if (m.players.length >= 2) {
      return NextResponse.json({ error: "full" }, { status: 409 });
    }
    m.players.push(playerId);
    changed = true;
  }
  if (changed) await setMatch(m);

  // Broadcast état public
  const state = {
    id: m.id,
    turn: m.turn,
    phase: m.phase,
    players: m.players,
    actions: Object.keys(m.actions),
    hp: { p: m.state.pHP, e: m.state.eHP },
    charge: { p: m.state.pCharge, e: m.state.eCharge },
  };

  try {
    await pusherServer.trigger(matchChannel(matchId), "state", state);
    // lobby update
    const count = m.players.length;
    if (count >= 2) {
      await removeFromIndex(m.id);
      await pusherServer.trigger(lobbyChannel, "full", { id: m.id });
    } else {
      await pusherServer.trigger(lobbyChannel, "updated", { id: m.id, players: count });
    }
  } catch {}

  return NextResponse.json({ ok: true, state });
}