export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

// Types
type QValues = number[];
export interface QTable { [state: string]: QValues; }

interface CheckpointFile {
  episode?: number;
  version?: number;
  size?: number;
  q: QTable;
  meta?: unknown;
}

interface LoadedModel {
  version: number;
  q: QTable;
  states: number;
  source: string;
}

interface QTablesRow {
  version: number;
  states: number;
  data: { q: QTable };
  created_at: string;
  meta: unknown;
}

// Minimal DB wrapper (lazy)
import type { Pool } from "pg";
let pool: Pool | null = null;

async function getPool(): Promise<Pool | null> {
  if (pool) return pool;
  try {
    // Optional local db module
    const mod = await import("@/lib/db").catch(() => null);
    if (mod && "pool" in mod && mod.pool) {
      pool = mod.pool as Pool;
      return pool;
    }
  } catch { /* ignore */ }
  // Fallback direct pg (only if DATABASE_URL set)
  if (!process.env.DATABASE_URL) return null;
  const { Pool } = await import("pg");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
  return pool;
}

async function ensureTable(p: Pool): Promise<void> {
  await p.query(`
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

function isCheckpointFile(v: unknown): v is CheckpointFile {
  if (typeof v !== "object" || v === null) return false;
  if (!("q" in v)) return false;
  const q = (v as { q: unknown }).q;
  if (typeof q !== "object" || q === null) return false;
  return true;
}

function loadBestFileModel(): LoadedModel | null {
  const dir = path.join(process.cwd(), "public", "checkpoints");
  let best: { file: string; ep: number; obj: CheckpointFile } | null = null;
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (!f.startsWith("qtable_ep") || !f.endsWith(".json")) continue;
      const parsedRaw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
      if (!isCheckpointFile(parsedRaw)) continue;
      const parsedEp = parseInt(f.replace(/\D+/g, ""), 10);
      const ep = (parsedRaw.episode ?? parsedEp) || 0;
      if (!best || ep > best.ep) best = { file: f, ep, obj: parsedRaw };
    }
  } catch { /* ignore */ }

  if (best) {
    const obj = best.obj;
    return {
      version: obj.version ?? Date.now(),
      q: obj.q,
      states: obj.size ?? Object.keys(obj.q).length,
      source: "checkpoint:" + best.file,
    };
  }

  // Seed fallback
  try {
    const seedPath = path.join(process.cwd(), "public", "seed-qtable.json");
    const seedRaw = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
    if (isCheckpointFile(seedRaw)) {
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

async function bootstrapIfNeeded(p: Pool): Promise<boolean> {
  await ensureTable(p);
  const active = await p.query<{ version: number }>(
    `SELECT version FROM q_tables WHERE is_active = TRUE LIMIT 1`
  );
  if (active.rows.length > 0) return false;

  const model = loadBestFileModel();
  if (!model) return false;

  try {
    await p.query("BEGIN");
    await p.query(
      `INSERT INTO q_tables (version, states, data, is_active, meta)
       VALUES ($1,$2,$3,TRUE,$4)`,
      [
        model.version,
        model.states,
        JSON.stringify({ q: model.q }),
        JSON.stringify({ bootstrapSource: model.source }),
      ]
    );
    await p.query("COMMIT");
    return true;
  } catch {
    await p.query("ROLLBACK").catch(() => {});
    // Silent fail -> fallback file still served
    return false;
  }
}

export async function GET() {
  const p = await getPool().catch(() => null);
  let bootstrapped = false;

  if (p) {
    try {
      bootstrapped = await bootstrapIfNeeded(p);
      const res = await p.query<QTablesRow>(
        `SELECT version, states, data, created_at, meta
         FROM q_tables
         WHERE is_active = TRUE
         ORDER BY created_at DESC
         LIMIT 1`
      );

      const row = res.rows[0]; // <- sécurisation
      if (row) {
        return NextResponse.json({
          version: row.version,
          states: row.states,
          q: row.data?.q ?? {},
          source: "db",
          createdAt: row.created_at,
          meta: row.meta,
          bootstrapped,
        });
      }
      // si pas de row active on tombera sur le fallback fichier plus bas
    } catch {
      // ignore et fallback fichier
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
