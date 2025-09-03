export const runtime = "nodejs";

import { NextResponse } from "next/server";

// Types de réponse
interface WinRatePoint {
  date: string;
  winRate: number;
}
interface StatsResponse {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  recentWinRates: WinRatePoint[];
  hyperparams: { alpha: number; gamma: number; epsilon: number };
  qtableSize: number;
  qVersion: number | null;
  lastUpdate: string | null;
}

// Types des lignes SQL
interface QTablesActiveRow {
  version: string | number;
  states: number;
  created_at: string;
}
interface EpisodesAggRow {
  wins: string | null;
  losses: string | null;
  draws: string | null;
  games: string | null;
}
interface RecentRow {
  d: string;
  wins: string | null;
  games: string | null;
}

// Chargement pool (tolérant)
import type { Pool } from "pg";
let pool: Pool | null = null;

async function getPool(): Promise<Pool | null> {
  if (pool) return pool;
  try {
    const mod = await import("@/lib/db").catch(() => null);
    if (mod && "pool" in mod && (mod as any).pool) {
      pool = (mod as any).pool as Pool;
      return pool;
    }
  } catch {}
  if (!process.env.DATABASE_URL) return null;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return pool;
}

// Hyperparams (statique ici, adapter si stockés en DB)
const hyper = { alpha: 0.18, gamma: 0.98, epsilon: 0.05 };

async function fetchActiveModel(p: Pool) {
  try {
    const r = await p.query<QTablesActiveRow>(
      `SELECT version, states, created_at
       FROM q_tables
       WHERE is_active = TRUE
       ORDER BY created_at DESC
       LIMIT 1`
    );
    const row = r.rows[0];
    if (!row) {
      return { size: 0, version: null as number | null, createdAt: null as string | null };
    }
    const versionNum =
      typeof row.version === "number"
        ? row.version
        : parseInt(String(row.version), 10);
    return {
      size: row.states,
      version: Number.isFinite(versionNum) ? versionNum : null,
      createdAt: row.created_at,
    };
  } catch {
    return { size: 0, version: null as number | null, createdAt: null as string | null };
  }
}

async function fetchEpisodesAgg(p: Pool) {
  try {
    const r = await p.query<EpisodesAggRow>(
      `SELECT
         SUM(CASE WHEN reward > 0  AND terminal THEN 1 ELSE 0 END)::text AS wins,
         SUM(CASE WHEN reward < 0  AND terminal THEN 1 ELSE 0 END)::text AS losses,
         SUM(CASE WHEN reward = 0  AND terminal THEN 1 ELSE 0 END)::text AS draws,
         SUM(CASE WHEN terminal THEN 1 ELSE 0 END)::text AS games
       FROM episodes`
    );
    const row = r.rows[0];
    if (!row) return { wins: 0, losses: 0, draws: 0, games: 0 };
    return {
      wins: parseInt(row.wins || "0", 10),
      losses: parseInt(row.losses || "0", 10),
      draws: parseInt(row.draws || "0", 10),
      games: parseInt(row.games || "0", 10),
    };
  } catch {
    return { wins: 0, losses: 0, draws: 0, games: 0 };
  }
}

async function fetchRecentWinRates(p: Pool, days = 20): Promise<WinRatePoint[]> {
  try {
    const r = await p.query<RecentRow>(
      `SELECT
         DATE(created_at) AS d,
         SUM(CASE WHEN reward > 0 AND terminal THEN 1 ELSE 0 END)::text AS wins,
         SUM(CASE WHEN terminal THEN 1 ELSE 0 END)::text AS games
       FROM episodes
       GROUP BY DATE(created_at)
       ORDER BY d DESC
       LIMIT $1`,
      [days]
    );
    if (!r.rows || r.rows.length === 0) return [];
    const out: WinRatePoint[] = [];
    for (const row of r.rows) {
      if (!row) continue;
      const games = parseInt(row.games || "0", 10);
      const wins = parseInt(row.wins || "0", 10);
      out.push({
        date: row.d,
        winRate: games > 0 ? (wins / games) * 100 : 0,
      });
    }
    return out.reverse();
  } catch {
    return [];
  }
}

async function fallbackSeed(): Promise<{
  size: number;
  version: number | null;
  lastUpdate: string | null;
}> {
  try {
    const fs = await import("node:fs/promises");
    const raw = await fs.readFile(
      process.cwd() + "/public/seed-qtable.json",
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    if (parsed?.q) {
      const size = Object.keys(parsed.q).length;
      const version: number | null = parsed.version ?? null;
      return {
        size,
        version,
        lastUpdate: version ? new Date(version).toISOString() : null,
      };
    }
  } catch {}
  return { size: 0, version: null, lastUpdate: null };
}

export async function GET() {
  const p = await getPool();
  let qtableSize = 0;
  let qVersion: number | null = null;
  let lastUpdate: string | null = null;
  let totalGames = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;
  let recentWinRates: WinRatePoint[] = [];

  if (p) {
    const [model, agg, recent] = await Promise.all([
      fetchActiveModel(p),
      fetchEpisodesAgg(p),
      fetchRecentWinRates(p),
    ]);

    qtableSize = model.size;
    qVersion = model.version;
    lastUpdate = model.createdAt;

    totalGames = agg.games;
    totalWins = agg.wins;
    totalLosses = agg.losses;
    totalDraws = agg.draws;
    recentWinRates = recent;
  } else {
    // Fallback fichier (sans DB)
    const fb = await fallbackSeed();
    qtableSize = fb.size;
    qVersion = fb.version;
    lastUpdate = fb.lastUpdate;
    // recentWinRates vide -> page affichera 0
    recentWinRates = [];
  }

  const payload: StatsResponse = {
    totalGames,
    totalWins,
    totalLosses,
    totalDraws,
    recentWinRates,
    hyperparams: hyper,
    qtableSize,
    qVersion,
    lastUpdate,
  };

  return NextResponse.json(payload);
}