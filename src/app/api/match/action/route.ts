import { NextRequest, NextResponse } from "next/server";
import { matches, pusherServer } from "@/lib/pusher-server";
import { matchChannel } from "@/lib/pusher-channel";
import { stepWithPower } from "@/lib/rl/env";
export const runtime = "nodejs";

// action: 0/1/2  spend: optional for attack
export async function POST(req: NextRequest) {
  const { matchId, playerId, action, spend = 0 } = await req.json();
  const m = matches.get(matchId);
  if (!m) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (m.phase !== "collect") return NextResponse.json({ error: "phase" }, { status: 409 });
  if (!m.players.includes(playerId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  m.actions[playerId] = { action, spend };
  await pusherServer.trigger(matchChannel(matchId), "partial", { who: playerId, count: Object.keys(m.actions).length });

  // Resolve when both present
  if (m.players.length === 2 && Object.keys(m.actions).length === 2) {
    m.phase = "resolve";
    const [p1, p2] = m.players;
    const a1 = m.actions[p1];
    const a2 = m.actions[p2];
    // Map player1 as "p" (AI side) and player2 as "e" (enemy) just for reuse
    const current = m.state;
    // For fairness: assign first stored to p side
    const { s2, r, done } = stepWithPower(
      current,
      a1.action, a1.action === 0 ? a1.spend : 0,
      a2.action, a2.action === 0 ? a2.spend : 0
    );
    m.state = s2;
    m.turn = s2.turn;
    m.actions = {};
    if (done) m.phase = "ended"; else m.phase = "collect";
    await pusherServer.trigger(matchChannel(matchId), "resolution", {
      turn: m.turn,
      reveal: {
        [p1]: a1,
        [p2]: a2,
      },
      hp: { p: s2.pHP, e: s2.eHP },
      charge: { p: s2.pCharge, e: s2.eCharge },
      done,
      result: done ? (r === 0 ? "draw" : r > 0 ? p1 : p2) : null,
    });
    await pusherServer.trigger(matchChannel(matchId), "state", {
      id: m.id,
      phase: m.phase,
      turn: m.turn,
      hp: { p: s2.pHP, e: s2.eHP },
      charge: { p: s2.pCharge, e: s2.eCharge },
    });
  }

  return NextResponse.json({ ok: true });
}