export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

// Lightweight internal PG pool (fallback si "@/lib/db" n'existe pas ou n'exporte pas pool)
let _pool: any;
async function getPool() {
  if (_pool) return _pool;
  try {
    // Essaye d'utiliser ton module existant (si un export par défaut ou nommé existe)
    const mod = await import("@/lib/db").catch(() => null as any);
    if (mod?.pool) {
      _pool = mod.pool;
      return _pool;
    }
    // Sinon crée un Pool local
    const { Pool } = await import("pg");
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
    return _pool;
  } catch (e) {
    console.warn("PG pool init failed:", (e as Error).message);
    throw e;
  }
}

interface LoadedModel {
  version: number;
  q: Record<string, [number, number, number]>;
  states: number;
  source: string;
}

async function ensureTable(pool: any) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS q_tables (
      id SERIAL PRIMARY KEY,
      version BIGINT NOT NULL UNIQUE,
      states INT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      is_active BOOLEAN DEFAULT FALSE,
      meta JSONB
    );
    CREATE INDEX IF NOT EXISTS q_tables_active_idx ON q_tables(is_active) WHERE is_active = TRUE;
  `);
}

function loadBestFileModel(): LoadedModel | null {
  const checkpointsDir = path.join(process.cwd(), "public", "checkpoints");
  let best: { file: string; ep: number; obj: any } | null = null;
  try {
    const files = fs.readdirSync(checkpointsDir);
    for (const f of files) {
      if (!f.startsWith("qtable_ep") || !f.endsWith(".json")) continue;
      const raw = JSON.parse(fs.readFileSync(path.join(checkpointsDir, f), "utf-8"));
      // Parenteses pour éviter mélange ?? et ||
      const parsedEp = parseInt(f.replace(/\D+/g, ""), 10);
      const ep = (raw.episode ?? parsedEp) || 0;
      if (!best || ep > best.ep) best = { file: f, ep, obj: raw };
    }
  } catch { /* ignore */ }

  if (best && best.obj?.q) {
    return {
      version: best.obj.version ?? Date.now(),
      q: best.obj.q,
      states: best.obj.size ?? Object.keys(best.obj.q).length,
      source: "checkpoint:" + best.file,
    };
  }

  // fallback seed
  try {
    const seedRaw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "public", "seed-qtable.json"), "utf-8")
    );
    if (seedRaw?.q) {
      return {
        version: seedRaw.version ?? Date.now(),
        q: seedRaw.q,
        states: Object.keys(seedRaw.q).length,
        source: "seed-file",
      };
    }
  } catch { /* ignore */ }

  return null;
}

async function bootstrapIfNeeded(pool: any): Promise<boolean> {
  try {
    await ensureTable(pool);
    const active = await pool.query(
      `SELECT version FROM q_tables WHERE is_active = TRUE LIMIT 1`
    );
    if (active.rows.length > 0) return false;

    const model = loadBestFileModel();
    if (!model) return false;

    await pool.query("BEGIN");
    await pool.query(
      `INSERT INTO q_tables (version, states, data, is_active, meta)
       VALUES ($1,$2,$3,TRUE,$4)`,
      [
        model.version,
        model.states,
        JSON.stringify({ q: model.q }),
        JSON.stringify({ bootstrapSource: model.source }),
      ]
    );
    await pool.query("COMMIT");
    return true;
  } catch (e) {
    try { await pool.query("ROLLBACK"); } catch {}
    console.warn("Bootstrap failed:", (e as Error).message);
    return false;
  }
}

export async function GET() {
  const pool = await getPool().catch(() => null);
  let bootstrapped = false;

  if (pool) {
    try {
      bootstrapped = await bootstrapIfNeeded(pool);
    } catch { /* ignore */ }
    try {
      const res = await pool.query(
        `SELECT version, states, data, created_at, meta
         FROM q_tables
         WHERE is_active = TRUE
         ORDER BY created_at DESC
         LIMIT 1`
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return NextResponse.json({
          version: row.version,
            // row.data est JSONB: s'assurer structure { q: {...} }
          states: row.states,
          q: row.data?.q ?? {},
          source: "db",
          createdAt: row.created_at,
          meta: row.meta,
          bootstrapped,
        });
      }
    } catch (e) {
      console.warn("DB read failed:", (e as Error).message);
    }
  }

  const fileModel = loadBestFileModel();
  if (fileModel) {
    return NextResponse.json({
      version: fileModel.version,
      states: fileModel.states,
      q: fileModel.q,
      source: fileModel.source,
      bootstrapped: false,
    });
  }

  return NextResponse.json({
    version: 0,
    states: 0,
    q: {},
    source: "none",
    bootstrapped: false,
  });
}
