import { NextRequest, NextResponse } from "next/server";
import { getMatch, setMatch } from "@/lib/match-store";
import { pusherServer } from "@/lib/pusher-server";
import { matchChannel } from "@/lib/pusher-channel";
import { initialState } from "@/lib/rl/env";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

function fallbackInitial() {
  return { pHP: 20, eHP: 20, pCharge: 0, eCharge: 0, turn: 1 };
}

export async function POST(req: NextRequest) {
  const { matchId, playerId } = await req.json();
  if (!matchId || !playerId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const m = await getMatch(matchId);
  if (!m) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!m.players.includes(playerId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ready = new Set(m.rematchReady ?? []);
  ready.add(playerId);
  m.rematchReady = Array.from(ready);

  // Notifie le statut d’attente aux deux clients
  try {
    await pusherServer.trigger(matchChannel(matchId), "rematch", { ready: m.rematchReady });
  } catch {}

  // Si les deux sont prêts → reset et relance dans le même salon
  if (m.players.length === 2 && m.rematchReady.length === 2) {
    let st;
    try { st = initialState(); } catch { st = fallbackInitial(); }
    m.state = { pHP: st.pHP, eHP: st.eHP, pCharge: st.pCharge, eCharge: st.eCharge, turn: 1 };
    m.actions = {};
    m.turn = 1;
    m.phase = "collect";
    m.rematchReady = [];

    await setMatch(m);
    try {
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
    } catch {}
    return NextResponse.json({ ok: true, started: true });
  }

  await setMatch(m);
  return NextResponse.json({ ok: true, started: false, ready: m.rematchReady });
}