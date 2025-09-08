import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { matchChannel } from "@/lib/pusher-channel";
import { stepWithPower } from "@/lib/rl/env";
import { getMatch, setMatch, acquireMatchLock } from "@/lib/match-store";
export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

// action: 0/1/2  spend: optional for attack
export async function POST(req: NextRequest) {
  const { matchId, playerId, action, spend = 0 } = await req.json();

  // lock best-effort pour éviter double résolution
  const release = await acquireMatchLock(matchId, 2);
  if (!release) {
    return NextResponse.json({ error: "busy" }, { status: 429 });
  }

  try {
    const m = await getMatch(matchId);
    if (!m) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (m.phase !== "collect") {
      return NextResponse.json({ error: "wrong_phase", phase: m.phase }, { status: 409 });
    }
    if (!m.players.includes(playerId)) {
      return NextResponse.json({ error: "forbidden_not_joined", players: m.players }, { status: 403 });
    }

    m.actions[playerId] = { action, spend };
    await setMatch(m);

    await pusherServer.trigger(matchChannel(matchId), "partial", {
      who: playerId,
      count: Object.keys(m.actions).length,
    });

    if (m.players.length === 2 && Object.keys(m.actions).length === 2) {
      const [p1, p2] = m.players as [string, string];
      const a1 = m.actions[p1];
      const a2 = m.actions[p2];
      if (!a1 || !a2) {
        return NextResponse.json({ error: "actions_incomplete" }, { status: 409 });
      }

      m.phase = "resolve";
      const { s2, r, done } = stepWithPower(
        m.state,
        a1.action, a1.action === 0 ? a1.spend : 0,
        a2.action, a2.action === 0 ? a2.spend : 0
      );

      m.state = s2;
      m.turn = s2.turn;
      m.actions = {};
      m.phase = done ? "ended" : "collect";
      await setMatch(m);

      await pusherServer.trigger(matchChannel(matchId), "resolution", {
        turn: m.turn,
        reveal: { [p1]: a1, [p2]: a2 },
        hp: { p: s2.pHP, e: s2.eHP },
        charge: { p: s2.pCharge, e: s2.eCharge },
        done,
        result: done ? (r === 0 ? "draw" : r > 0 ? p1 : p2) : null,
      });

      await pusherServer.trigger(matchChannel(matchId), "state", {
        id: m.id,
        phase: m.phase,
        turn: m.turn,
        players: m.players,
        actions: Object.keys(m.actions),
        hp: { p: s2.pHP, e: s2.eHP },
        charge: { p: s2.pCharge, e: s2.eCharge },
      });
    }

    return NextResponse.json({ ok: true });
  } finally {
    await release();
  }
}