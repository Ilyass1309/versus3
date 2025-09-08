import { NextRequest, NextResponse } from "next/server";
import { getMatch, setMatch, acquireMatchLock } from "@/lib/match-store";
import { pusherServer } from "@/lib/pusher-server";
import { matchChannel } from "@/lib/pusher-channel";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

function initialStateFallback() {
  return { pHP: 20, eHP: 20, pCharge: 0, eCharge: 0, turn: 1 };
}

export async function POST(req: NextRequest) {
  const { matchId, playerId } = await req.json();
  if (!matchId || !playerId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const release = await acquireMatchLock(matchId, 2);
  if (!release) return NextResponse.json({ error: "busy" }, { status: 423 });

  try {
    const m = await getMatch(matchId);
    if (!m) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!m.players.includes(playerId) || m.players.length < 2) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // reset état
    let st;
    try {
      // si tu as une fonction initialState()
      // @ts-ignore
      st = initialState ? initialState() : initialStateFallback();
    } catch {
      st = initialStateFallback();
    }

    m.state = { pHP: st.pHP, eHP: st.eHP, pCharge: st.pCharge, eCharge: st.eCharge, turn: 1 };
    m.actions = {};
    m.turn = 1;
    m.phase = "collect";

    await setMatch(m);

    // broadcast nouvel état
    await pusherServer.trigger(matchChannel(matchId), "state", {
      id: m.id,
      turn: m.turn,
      phase: m.phase,
      players: m.players,
      names: m.names,
      actions: Object.keys(m.actions),
      hp: { p: m.state.pHP, e: m.state.eHP },
      charge: { p: m.state.pCharge, e: m.state.eCharge },
      rematch: true,
    });

    return NextResponse.json({ ok: true });
  } finally {
    await release();
  }
}