export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { stepWithPower, initialState, MAX_CHARGE, encodeState } from "@/lib/rl/env";
import { qUpdate } from "@/lib/rl/update";
import { withLockedQTable, logEpisode } from "@/lib/db";
import { validateAction } from "@/lib/utils/validation";
import { Action, State } from "@/lib/rl/types";

type ClientStep = { aAI: 0|1|2; aPL: 0|1|2; nAI?: number; nPL?: number };
interface EpisodeBody {
  clientVersion?: number;
  steps: ClientStep[];
}

function normN(a: number, n: unknown): number | undefined {
  if (a !== Action.ATTACK) return undefined;
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  if (n < 0) return 0;
  if (n > MAX_CHARGE) return MAX_CHARGE;
  return Math.trunc(n);
}

const MAX_STEPS_BODY = 200;

export async function POST(req: NextRequest) {
  let body: EpisodeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || !Array.isArray(body.steps)) {
    return NextResponse.json({ error: "Missing steps[]" }, { status: 400 });
  }
  if (body.steps.length === 0) {
    return NextResponse.json({ error: "Empty episode" }, { status: 400 });
  }
  if (body.steps.length > MAX_STEPS_BODY) {
    return NextResponse.json({ error: "Too many steps" }, { status: 413 });
  }

  for (const s of body.steps) {
    if (!validateAction(s.aAI) || !validateAction(s.aPL)) {
      return NextResponse.json({ error: "Invalid action in steps" }, { status: 422 });
    }
  }

  let s = initialState();
  const transitions: {
    s: State;
    a: number;
    r: number;
    s2: State;
    done: boolean;
    sKey: string;
    s2Key: string;
  }[] = [];

  for (const st of body.steps) {
    const sKey = encodeState(s);
    const nAI = normN(st.aAI, st.nAI);
    const nPL = normN(st.aPL, st.nPL);
    const { s2, r, done } = stepWithPower(s, st.aAI, nAI, st.aPL, nPL);
    const s2Key = encodeState(s2);
    transitions.push({ s, a: st.aAI, r, s2, done, sKey, s2Key });
    s = s2;
    if (done) break;
  }

  const last = transitions[transitions.length - 1];
  let reason = "completed";
  if (!last || !last.done) {
    reason = "not_terminal_truncated";
  } else if (last.r > 0) {
    reason = "ai_win";
  } else if (last.r < 0) {
    reason = "ai_lose";
  }

  const { version } = await withLockedQTable((q) => {
    for (const t of transitions) {
      qUpdate(q, t.sKey, t.a, t.r, t.s2Key, t.done);
    }
  });

  const final = s;
  await logEpisode({
    clientVersion: body.clientVersion ?? null,
    steps: body.steps,
    turns: transitions.length,
    aiWin: final.eHP <= 0 && final.pHP > 0,
    reason,
  });

  return NextResponse.json({ ok: true, newVersion: version });
}
