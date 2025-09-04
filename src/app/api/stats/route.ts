export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { initialState, encodeState, stepWithPower, MAX_TURNS } from "@/lib/rl/env";
import { Action } from "@/lib/rl/types";

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
  reachableMaxStates: number;     // AJOUT
  coveragePct: number;            // AJOUT (0..100)
}

// Types des lignes SQL
interface QTablesActiveRow {
  version: string | number;
  states: number;
  created_at: string;
}
interface EpisodesAggRow {
  games: string | null;
  ai_wins: string | null;
  player_wins: string | null;
  losses: string | null;
  draws: string | null;
  avg_steps?: string | null;
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
    const mod: unknown = await import("@/lib/db").catch(() => null);
    if (
      mod &&
      typeof mod === "object" &&
      "pool" in mod &&
      (mod as { pool?: Pool }).pool
    ) {
      pool = (mod as { pool?: Pool }).pool ?? null;
      return pool;
    }
  } catch {
    // ignore
  }
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
    const r = await p.query<EpisodesAggRow>(`
      SELECT
         COUNT(*)::text AS games,
         SUM((result = 'ai')::int)::text     AS ai_wins,
         SUM((result = 'player')::int)::text AS player_wins,
         SUM((result = 'draw')::int)::text   AS draws,
         AVG(jsonb_array_length(steps))::text AS avg_steps
       FROM episodes`
    );
    const row = r.rows[0];
    if (!row) return { wins: 0, losses: 0, draws: 0, games: 0 };
    return {
      wins: parseInt(row.player_wins || "0", 10),
      losses: parseInt(row.losses || "0", 10),
      draws: parseInt(row.draws || "0", 10),
      games: parseInt(row.games || "0", 10),
      // tu peux exposer avg_steps si tu ajoutes le champ dans StatsResponse
      avg_steps: row.avg_steps ? parseFloat(row.avg_steps) : undefined,
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
         SUM( (result = 'player')::int )::text AS wins,
         COUNT(*)::text AS games
       FROM episodes
       GROUP BY DATE(created_at)
       ORDER BY d DESC
       LIMIT $1`,
      [days]
    );
    if (!r.rows.length) return [];
    return r.rows
      .map(row => {
        const games = parseInt(row.games || "0", 10);
        const wins = parseInt(row.wins || "0", 10);
        return {
          date: row.d,
          winRate: games > 0 ? (wins / games) * 100 : 0,
        };
      })
      .reverse();
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

// --- Cache pour éviter de recalculer à chaque requête ---
let reachableCache: { total: number } | null = null;

function computeReachableMaxStates(): number {
  if (reachableCache) return reachableCache.total;

  const start = initialState();
  const seen = new Set<string>();
  const queue: typeof start[] = [start];

  while (queue.length) {
    const s = queue.shift()!;
    const key = encodeState(s);
    if (seen.has(key)) continue;
    seen.add(key);

    // Si terminal on n'expansionne pas
    if (s.pHP <= 0 || s.eHP <= 0 || s.turn >= MAX_TURNS) continue;

    // Toutes combinaisons d'actions IA/Joueur
    for (let aAI = 0; aAI < 3; aAI++) {
      for (let aPL = 0; aPL < 3; aPL++) {
        // Dépenses possibles (si ATTACK: 0..charge, sinon 0)
        const maxSpendAI = aAI === Action.ATTACK ? s.pCharge : 0;
        const maxSpendPL = aPL === Action.ATTACK ? s.eCharge : 0;
        for (let spendAI = 0; spendAI <= maxSpendAI; spendAI++) {
          for (let spendPL = 0; spendPL <= maxSpendPL; spendPL++) {
            const { s2 } = stepWithPower(
              s,
              aAI as Action,
              spendAI,
              aPL as Action,
              spendPL
            );
            const k2 = encodeState(s2);
            if (!seen.has(k2)) queue.push(s2);
          }
        }
      }
    }
  }

  reachableCache = { total: seen.size };
  return reachableCache.total;
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

  const reachableMaxStates = computeReachableMaxStates();
  const coveragePct = reachableMaxStates > 0
    ? (qtableSize / reachableMaxStates) * 100
    : 0;

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
    reachableMaxStates,
    coveragePct: Number(coveragePct.toFixed(2)),
  };

  return NextResponse.json(payload);
}