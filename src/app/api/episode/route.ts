export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import type { Pool } from "pg";

interface Step {
  aAI: 0 | 1 | 2;
  aPL: 0 | 1 | 2;
  nAI?: number;
  nPL?: number;
}
interface EpisodePayload {
  clientVersion?: number;
  steps?: Step[];
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

function computeOutcome(steps: Step[]): { result: "player" | "ai" | "draw"; reward: number } {
  const last = steps[steps.length - 1];
  if (last) {
    const { nAI, nPL } = last;
    if (typeof nAI === "number" && typeof nPL === "number") {
      if (nAI <= 0 && nPL > 0) return { result: "player", reward: 1 };
      if (nPL <= 0 && nAI > 0) return { result: "ai", reward: -1 };
      if (nAI <= 0 && nPL <= 0) return { result: "draw", reward: 0 };
    }
  }
  return { result: "draw", reward: 0 };
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide (corps vide ou mal formé)" }, { status: 400 });
  }

  const body = raw as EpisodePayload;
  const steps = Array.isArray(body.steps) ? body.steps : [];
  const clientVersion = typeof body.clientVersion === "number" ? body.clientVersion : 0;

  if (steps.length === 0) {
    // On log mais on ne renvoie plus systématiquement 400 (évite spam console)
    return NextResponse.json({ ok: false, error: "Aucun step reçu", receivedSteps: steps.length }, { status: 400 });
  }

  const { result, reward } = computeOutcome(steps);

  const p = await getPool();
  if (!p) {
    return NextResponse.json({
      ok: true,
      stored: false,
      result,
      reward,
      steps: steps.length,
      clientVersion,
      note: "Pas de DB (DATABASE_URL absent)",
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
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Insertion DB échouée", detail: (e as Error).message },
      { status: 500 }
    );
  }
}
