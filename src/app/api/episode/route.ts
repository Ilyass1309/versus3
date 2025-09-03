export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { initialState, step, encodeState } from "@/lib/rl/env";
import { qUpdate } from "@/lib/rl/update";
import { withLockedQTable, logEpisode } from "@/lib/db";
import { validateAction } from "@/lib/utils/validation";
import { Action } from "@/lib/rl/types";

type ClientStep = { aAI: number; aPL: number; /* state_enc?: string */ };
type Body = {
  clientVersion?: number;
  steps: ClientStep[];
};

const MAX_STEPS_BODY = 200; // sécurité basique anti-spam

export async function POST(req: NextRequest) {
  let body: Body;
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

  // Validation d'actions
  for (const s of body.steps) {
    if (!validateAction(s.aAI) || !validateAction(s.aPL)) {
      return NextResponse.json({ error: "Invalid action in steps" }, { status: 422 });
    }
  }

  // Rejoue l'épisode avec la logique serveur
  let s = initialState();
  let done = false;
  let reason = "completed";
  const transitions: Array<{
    sKey: string;
    a: Action;
    r: number;
    s2Key: string;
    done: boolean;
  }> = [];

  for (let i = 0; i < body.steps.length && !done; i++) {
    const { aAI, aPL } = body.steps[i]!; // non-null assertion: index is valid due to loop condition
    const sKey = encodeState(s);

    const out = step(s, aAI as Action, aPL as Action);
    const s2Key = encodeState(out.s2);

    transitions.push({
      sKey,
      a: aAI as Action,
      r: out.r,
      s2Key,
      done: out.done,
    });

    s = out.s2;
    done = out.done;
    if (done) {
      if (out.r > 0) reason = "ai_win";
      else if (out.r < 0) reason = "ai_lose";
      else reason = "draw";
    }
  }

  // Si l'épisode envoyé n'amène pas à done, on force une terminaison (sécurité)
  if (!done) {
    reason = "not_terminal_truncated";
  }

  // Applique les updates Q dans une transaction verrouillée
  const { version } = await withLockedQTable((q) => {
    for (const t of transitions) {
      qUpdate(q, t.sKey, t.a, t.r, t.s2Key, t.done);
    }
  });

  // Logging (optionnel)
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
