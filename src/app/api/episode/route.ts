export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import type { Pool } from "pg";

interface Step {
  aAI: 0 | 1 | 2;
  aPL: 0 | 1 | 2;
  // Nouveaux champs (HP restants après le tour)
  hpAI?: number;
  hpPL?: number;
  spendAI?: number;
  spendPL?: number;
  nAI?: number;
  nPL?: number;
}
interface EpisodePayload {
  clientVersion?: number;
  steps?: Step[];
  result?: "player" | "ai" | "draw";
}

let pool: Pool | null = null;
async function getPool(): Promise<Pool | null> {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) return null;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return pool;
}

async function ensureTable(p: Pool) {
  await p.query(`
    CREATE TABLE IF NOT EXISTS episodes (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      client_version BIGINT,
      steps JSONB NOT NULL,
      result TEXT,
      reward INT,
      terminal BOOLEAN DEFAULT TRUE
    );
    CREATE INDEX IF NOT EXISTS episodes_created_idx ON episodes(created_at);
  `);
}

function lastHP(step?: Step): { hpAI?: number; hpPL?: number } {
  if (!step) return {};
  if (typeof step.hpAI === "number" || typeof step.hpPL === "number") {
    return { hpAI: step.hpAI, hpPL: step.hpPL };
  }
  if (typeof step.nAI === "number" || typeof step.nPL === "number") {
    return { hpAI: step.nAI, hpPL: step.nPL };
  }
  return {};
}

function inferOutcome(steps: Step[]): { result: "player" | "ai" | "draw"; reward: number } {
  const last = steps[steps.length - 1];
  if (!last) return { result: "draw", reward: 0 };
  const { hpAI, hpPL } = lastHP(last);

  if (typeof hpAI === "number" && typeof hpPL === "number") {
    if (hpAI <= 0 && hpPL > 0) return { result: "player", reward: 1 };
    if (hpPL <= 0 && hpAI > 0) return { result: "ai", reward: -1 };
    if (hpAI <= 0 && hpPL <= 0) return { result: "draw", reward: 0 };
    return { result: "draw", reward: 0 }; // non terminal (devrait idéalement ne pas être soumis)
  }

  // Pas d'info fiable → neutre
  return { result: "draw", reward: 0 };
}

function normalizeSteps(raw: Step[]): Step[] {
  // Optionnel: filtrer valeurs absurdes
  return raw;
}

export async function POST(req: NextRequest) {
  let body: EpisodePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const steps = Array.isArray(body.steps) ? normalizeSteps(body.steps) : [];
  if (steps.length === 0) {
    return NextResponse.json({ error: "Aucun step reçu" }, { status: 400 });
  }

  // Validation simple: HP ne devraient pas remonter après avoir atteint 0
  let inconsistent = false;
  let minAI = Infinity;
  let minPL = Infinity;
  for (const s of steps) {
    const { hpAI, hpPL } = lastHP(s);
    if (typeof hpAI === "number") {
      if (hpAI < minAI) minAI = hpAI;
      else if (hpAI > minAI && minAI <= 0) inconsistent = true;
    }
    if (typeof hpPL === "number") {
      if (hpPL < minPL) minPL = hpPL;
      else if (hpPL > minPL && minPL <= 0) inconsistent = true;
    }
  }

  let result: "player" | "ai" | "draw";
  let reward: number;

  if (body.result) {
    // result = gagnant (player = humain / ai = IA)
    // Reward doit rester DU POINT DE VUE IA
    // IA gagne => +1 ; IA perd => -1
    result = body.result;
    reward =
      result === "ai" ? 1 :
      result === "player" ? -1 : 0;
  } else {
    ({ result, reward } = inferOutcome(steps));
    // inferOutcome retourne result côté gagnant ; reward déjà IA-centric si tu l’ajustes pareil
  }

  // Correction post-inférence (si plus bas tu modifies result) : réappliquer règle reward IA
  if (result === "ai") reward = 1;
  else if (result === "player") reward = -1;
  else reward = 0;

  // Si incohérence détectée et résultat = draw mais dernier HP <=0 côté IA uniquement → corriger
  if (result === "draw") {
    const last = steps[steps.length - 1];
    const { hpAI, hpPL } = lastHP(last);
    if (
      !body.result &&
      typeof hpAI === "number" &&
      typeof hpPL === "number" &&
      hpAI <= 0 &&
      hpPL > 0
    ) {
      result = "player";
      reward = 1;
    } else if (
      !body.result &&
      typeof hpAI === "number" &&
      typeof hpPL === "number" &&
      hpPL <= 0 &&
      hpAI > 0
    ) {
      result = "ai";
      reward = -1;
    }
  }

  const clientVersion = typeof body.clientVersion === "number" ? body.clientVersion : 0;

  const p = await getPool();
  if (!p) {
    return NextResponse.json({
      ok: true,
      stored: false,
      result,
      reward,
      steps: steps.length,
      clientVersion,
      inconsistent,
      note: "Pas de DATABASE_URL"
    });
  }

  try {
    await ensureTable(p);
    await p.query(
      `INSERT INTO episodes (client_version, steps, result, reward, terminal)
       VALUES ($1,$2,$3,$4,TRUE)`,
      [clientVersion, JSON.stringify(steps), result, reward]
    );
    return NextResponse.json({
      ok: true,
      stored: true,
      result,
      reward,
      steps: steps.length,
      clientVersion,
      inconsistent
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Insertion DB échouée", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
