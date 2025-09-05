/**
 * train-model-francois.ts
 * (corrigé)
 *
 * Objectif:
 * - Approcher 100% de couverture des états REACHABLE (depuis l'état initial)
 * - Assurer un nombre minimal de visites par état (minVisitsTarget)
 * - Reprendre l'entraînement si un fichier Q (JSON) existe (continuité)
 * - Politique IA: Q-Learning tabulaire + exploration dirigée par couverture
 * - Multi-policies adverses (curriculum + mix pondéré)
 *
 * Stratégies clés:
 *  1. Calcul BFS initial du nombre total d'états atteignables (reachableMax) (cache)
 *  2. Bonus de nouveauté + "visit deficit factor" pour pousser vers les états sous-visités
 *  3. Epsilon/adaptive:
 *       - élevé tant que coverage < coverageDecayStart (ex: 60%)
 *       - puis décroissance jusqu'à epsilonFloor
 *       - réhausse locale si on stagne (noNewStateThreshold)
 *  4. Alpha/adaptive:
 *       - alphaBase * (1 / (1 + visits(state)/alphaVisitScale))
 *       - clamp entre alphaMin/alphaMax
 *  5. Replay ciblé (optionnel léger): on rejoue quelques transitions brutes d'épisodes récents (priorité états sous-visités)
 *  6. Checkpoints + sauvegarde finale (visits inclus pour reprise)
 *
 * Format fichier sauvegarde:
 * {
 *   version: number,
 *   q: { stateKey: [qA,qD,qC] },
 *   visits: { stateKey: number },
 *   meta: {
 *     reachableMax: number,
 *     coveragePct: number,
 *     states: number,
 *     minVisits: number,
 *     maxVisits: number,
 *     avgVisits: number
 *   }
 * }
 *
 * Lancement (exemples):
 *   npx tsx scripts/train-model-francois.ts --episodes 120000 --save data/qtable-francois.json
 *
 * NOTE: Atteindre 100% peut être long si certains états exigent des trajectoires rares.
 */

import fs from "node:fs";
import path from "node:path";
import { initialState, stepWithPower, encodeState, MAX_TURNS } from "../src/lib/rl/env";
import { Action } from "../src/lib/rl/types";

// ===== Types =====
type QRow = [number, number, number];
type QTable = Record<string, QRow>;
type VisitMap = Record<string, number>;

interface SaveFile {
  version: number;
  q: QTable;
  visits?: VisitMap;
  meta?: {
    totalEpisodes?: number;
    [k: string]: any;
  };
}

interface Args {
  episodes: number;
  save: string;
  checkpointEvery: number;
  logEvery: number;
  evalEvery: number;
  evalEpisodes: number;
  targetCoverage: number;      // % (ex 0.999 = 99.9%)
  minVisitsTarget: number;     // objectif de visites par état
  coverageDecayStart: number;  // % couverture où on commence à réduire epsilon
  epsilonStart: number;
  epsilonFloor: number;
  alphaBase: number;
  alphaMin: number;
  alphaMax: number;
  alphaVisitScale: number;
  noveltyCoeff: number;
  deficitCoeff: number;
  replayBufferSize: number;
  replaySamplePerEpisode: number;
  noNewStateThreshold: number;
  epsilonBoost: number;
  curriculumPhases: number;
  seedFile?: string;
  historyFile: string;
  snapshotEvery: number;      // every N episodes take a full Q snapshot
  snapshotDir: string;        // directory for snapshot files
  snapshotSample?: number;    // optional: limit number of states stored (undefined = full)
}

interface HistoryPoint {
  episode: number;
  coverage: number;
  states: number;
  minV: number;
  maxV: number;
  avgV: number;
  epsilon: number;
  newStates: number;
  stagnate: number;
  gini: number;
  timestamp: number;
}

const defaultArgs: Args = {
  episodes: 80000,
  save: "public/qtable-francois.json",
  checkpointEvery: 10000,
  logEvery: 1000,
  evalEvery: 20000,
  evalEpisodes: 1000,
  targetCoverage: 0.999,
  minVisitsTarget: 8,
  coverageDecayStart: 0.6,
  epsilonStart: 0.9,
  epsilonFloor: 0.02,
  alphaBase: 0.25,
  alphaMin: 0.02,
  alphaMax: 0.4,
  alphaVisitScale: 12,
  noveltyCoeff: 0.15,
  deficitCoeff: 0.25,
  replayBufferSize: 12000,
  replaySamplePerEpisode: 24,
  noNewStateThreshold: 4000,
  epsilonBoost: 0.25,
  curriculumPhases: 4,
  seedFile: undefined,
  historyFile: "data/training-history-francois.json",
  snapshotEvery: 100000,
  snapshotDir: "data/qtable-snapshots/francois",
  snapshotSample: undefined,
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && i < argv.length - 1 ? argv[i + 1] : undefined;
  };
  const num = <K extends keyof Args>(k: K) => {
    const v = get("--" + k);
    if (v === undefined) return defaultArgs[k] as number;
    const n = Number(v);
    return Number.isFinite(n) ? n : (defaultArgs[k] as number);
  };
  const str = <K extends keyof Args>(k: K) => {
    const v = get("--" + k);
    return v !== undefined ? v : (defaultArgs[k] as string);
  };
  return {
    episodes: num("episodes"),
    save: str("save"),
    checkpointEvery: num("checkpointEvery"),
    logEvery: num("logEvery"),
    evalEvery: num("evalEvery"),
    evalEpisodes: num("evalEpisodes"),
    targetCoverage: num("targetCoverage"),
    minVisitsTarget: num("minVisitsTarget"),
    coverageDecayStart: num("coverageDecayStart"),
    epsilonStart: num("epsilonStart"),
    epsilonFloor: num("epsilonFloor"),
    alphaBase: num("alphaBase"),
    alphaMin: num("alphaMin"),
    alphaMax: num("alphaMax"),
    alphaVisitScale: num("alphaVisitScale"),
    noveltyCoeff: num("noveltyCoeff"),
    deficitCoeff: num("deficitCoeff"),
    replayBufferSize: num("replayBufferSize"),
    replaySamplePerEpisode: num("replaySamplePerEpisode"),
    noNewStateThreshold: num("noNewStateThreshold"),
    epsilonBoost: num("epsilonBoost"),
    curriculumPhases: num("curriculumPhases"),
    seedFile: get("--seedFile") ?? defaultArgs.seedFile,
    historyFile: str("historyFile"),
    snapshotEvery: num("snapshotEvery"),
    snapshotDir: str("snapshotDir"),
    snapshotSample: num("snapshotSample"),
  };
}

// ===== Q helpers =====
function ensureQ(q: QTable, k: string): QRow {
  const existing = q[k];
  if (existing) return existing;
  const row: QRow = [0, 0, 0];
  q[k] = row;
  return row;
}
function argmax(row: QRow): number {
  let b: 0 | 1 | 2 = 0;
  for (const i of [1, 2] as const) {
    if (row[i] > row[b]) b = i;
  }
  return b;
}

// ===== Opponent policies =====
interface PolicyCtx {
  state: ReturnType<typeof initialState>;
  q: QTable;
  epsilon: number;
}
type PolicyFn = (c: PolicyCtx) => { a: Action; spend: number };

const policyRandom: PolicyFn = ({ state }) => {
  const r = Math.random();
  const a =
    r < 1 / 3 ? Action.ATTACK : r < 2 / 3 ? Action.DEFEND : Action.CHARGE;
  return { a, spend: a === Action.ATTACK ? Math.max(1, state.eCharge) : 0 };
};
const policyAggro: PolicyFn = ({ state }) => {
  if (state.eCharge > 0) return { a: Action.ATTACK, spend: state.eCharge };
  return { a: Action.CHARGE, spend: 0 };
};
const policyDef: PolicyFn = ({ state }) => {
  if (state.pCharge > state.eCharge && state.eCharge > 0)
    return { a: Action.DEFEND, spend: 0 };
  if (state.eCharge >= 2 && Math.random() < 0.4)
    return { a: Action.ATTACK, spend: state.eCharge };
  return { a: Action.CHARGE, spend: 0 };
};
const policyMirror: PolicyFn = ({ state, q }) => {
  const row = q[encodeState(state)];
  if (!row) return { a: Action.CHARGE, spend: 0 }; // guard
  const best = argmax(row as QRow);
  const a = best === 0 ? Action.ATTACK : best === 1 ? Action.DEFEND : Action.CHARGE;
  return { a, spend: a === Action.ATTACK ? Math.max(1, state.eCharge) : 0 };
};

const opponentSet: { name: string; fn: PolicyFn }[] = [
  { name: "random", fn: policyRandom },
  { name: "def", fn: policyDef },
  { name: "aggro", fn: policyAggro },
  { name: "mirror", fn: policyMirror }
];

function curriculumWeights(frac: number): number[] {
  if (frac < 0.2) return [0.5, 0.3, 0.2, 0];
  if (frac < 0.5) return [0.25, 0.25, 0.25, 0.25];
  if (frac < 0.75) return [0.15, 0.25, 0.3, 0.3];
  return [0.1, 0.15, 0.25, 0.5];
}

function samplePolicy(weights: readonly number[]): PolicyFn {
  // Sanitize: remplace toute valeur non finie ou négative par 0
  const sanitized: number[] = Array.from(weights, val =>
    Number.isFinite(val) && val > 0 ? val : 0
  );
  const total = sanitized.reduce((a, b) => a + b, 0);
  if (total <= 0) return policyRandom;
  
  let r = Math.random() * total;
  for (let i = 0; i < sanitized.length && i < opponentSet.length; i++) {
    const value = sanitized[i];
    if (value === undefined) continue; // garde pour noUncheckedIndexedAccess
    if (r < value) {
      const entry = opponentSet[i];
      if (entry) return entry.fn; // safe guard for strict indexing
      continue;
    }
    r -= value;
  }
  const first = opponentSet[0];
  return first ? first.fn : policyRandom;
}

// ===== Coverage BFS =====
function computeReachableMax(cachePath: string): number {
  try {
    if (fs.existsSync(cachePath)) {
      const n = Number(fs.readFileSync(cachePath, "utf-8"));
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {}
  const start = initialState();
  const visited = new Set<string>();
  const queue: ReturnType<typeof initialState>[] = [start];
  while (queue.length) {
    const s = queue.shift();
    if (!s) continue;
    const key = encodeState(s);
    if (visited.has(key)) continue;
    visited.add(key);
    if (s.pHP <= 0 || s.eHP <= 0 || s.turn >= MAX_TURNS) continue;
    for (let aAI = 0; aAI < 3; aAI++) {
      for (let aPL = 0; aPL < 3; aPL++) {
        const maxSpendAI = aAI === Action.ATTACK ? s.pCharge : 0;
        const maxSpendPL = aPL === Action.ATTACK ? s.eCharge : 0;
        for (let spAI = 0; spAI <= maxSpendAI; spAI++) {
          for (let spPL = 0; spPL <= maxSpendPL; spPL++) {
            const { s2 } = stepWithPower(
              s,
              aAI as Action,
              spAI,
              aPL as Action,
              spPL
            );
            const k2 = encodeState(s2);
            if (!visited.has(k2)) queue.push(s2);
          }
        }
      }
    }
  }
  try { fs.writeFileSync(cachePath, String(visited.size)); } catch {}
  return visited.size;
}

// ===== Adaptive schedules =====
function adaptiveEpsilon(
  coverage: number,
  args: Args,
  stagnating: boolean,
  episodesSinceNew: number
): number {
  // base decay
  let eps: number;
  if (coverage < args.coverageDecayStart) eps = args.epsilonStart;
  else {
    const span = 1 - args.coverageDecayStart;
    const prog = Math.min(1, (coverage - args.coverageDecayStart) / span);
    eps = args.epsilonStart * (1 - prog) + args.epsilonFloor * prog;
  }
  // stagnation bump plus modéré
  if (stagnating && coverage < 0.70) {
    eps = Math.max(eps, 0.35 + Math.min(0.15, episodesSinceNew / (args.noNewStateThreshold * 2)));
  }
  return Math.min(0.9, Math.max(args.epsilonFloor, eps));
}

function adaptiveAlpha(visits: number, args: Args): number {
  const dyn =
    args.alphaBase * (1 / (1 + visits / args.alphaVisitScale));
  return Math.min(args.alphaMax, Math.max(args.alphaMin, dyn));
}

// ===== Q-Learning update =====
function qUpdate(
  q: QTable,
  sKey: string,
  a: Action,
  r: number,
  s2Key: string,
  done: boolean,
  alpha: number,
  gamma: number
) {
  const row = ensureQ(q, sKey);
  const row2 = ensureQ(q, s2Key);
  // Narrow action index to valid tuple indices (0|1|2) to avoid undefined access
  const ai = a as 0 | 1 | 2;
  if (ai < 0 || ai > 2) return; // runtime safeguard
  const maxNext = Math.max(row2[0], row2[1], row2[2]);
  const target = done ? r : r + gamma * maxNext;
  const oldVal = row[ai];
  row[ai] = oldVal + alpha * (target - oldVal);
}

// ===== Action selection (agent) =====
function pickAction(q: QTable, key: string, eps: number): Action {
  if (eps >= 0 && (Math.random() < eps || !q[key])) {
    const r = Math.random();
    return r < 1 / 3 ? Action.ATTACK : r < 2 / 3 ? Action.DEFEND : Action.CHARGE;
  }
  const row = ensureQ(q, key);
  const best = argmax(row);
  return best === 0 ? Action.ATTACK : best === 1 ? Action.DEFEND : Action.CHARGE;
}

// ===== Load / Save =====
function loadExisting(pathFile: string, seedFile?: string): { q: QTable; visits: VisitMap; totalEpisodes: number } {
  if (fs.existsSync(pathFile)) {
    try {
      const parsed: SaveFile = JSON.parse(fs.readFileSync(pathFile, "utf-8"));
      if (parsed?.q) {
        return {
          q: parsed.q,
            visits: parsed.visits ?? {},
            totalEpisodes: parsed.meta?.totalEpisodes ?? 0
        };
      }
    } catch {
      console.warn("Fichier existant illisible, nouveau départ.");
    }
  } else if (seedFile && fs.existsSync(seedFile)) {
    try {
      const parsed: SaveFile = JSON.parse(fs.readFileSync(seedFile, "utf-8"));
      if (parsed?.q) {
        console.log("Chargement seedFile:", seedFile);
        return {
          q: parsed.q,
          visits: parsed.visits ?? {},
          totalEpisodes: parsed.meta?.totalEpisodes ?? 0
        };
      }
    } catch {
      console.warn("Seed file illisible, ignore.");
    }
  }
  return { q: {}, visits: {}, totalEpisodes: 0 };
}

function saveAll(savePath: string, q: QTable, visits: VisitMap, meta: any) {
  fs.mkdirSync(path.dirname(savePath), { recursive: true });
  fs.writeFileSync(
    savePath,
    JSON.stringify(
      {
        version: Date.now(),
        q,
        visits,
        meta
      },
      null,
      2
    ),
    "utf-8"
  );
}

// Add helper after saveAll()
function sampleStates(q: QTable, limit?: number): QTable {
  if (!limit || limit <= 0) return q;
  const keys = Object.keys(q);
  if (keys.length <= limit) return q;
  // deterministic sample: hash-sort then slice for reproducibility
  const scored = keys.map(k => {
    // simple hash
    let h = 0;
    for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
    return { k, h };
  }).sort((a,b)=> a.h - b.h);
  const picked = scored.slice(0, limit).map(o => o.k);
  const out: QTable = {};
  for (const k of picked) out[k] = q[k];
  return out;
}

function saveSnapshot(
  args: Args,
  episode: number,
  reachableMax: number,
  q: QTable,
  visits: VisitMap,
  epsilon: number
) {
  try {
    fs.mkdirSync(args.snapshotDir, { recursive: true });
    const stateCount = Object.keys(q).length;
    const coveragePct = (100 * stateCount) / reachableMax;
    const visitVals = Object.values(visits);
    const minV = visitVals.length ? Math.min(...visitVals) : 0;
    const maxV = visitVals.length ? Math.max(...visitVals) : 0;
    const avgV = visitVals.length
      ? visitVals.reduce((a,b)=>a+b,0) / visitVals.length
      : 0;

    const qData = sampleStates(q, args.snapshotSample);
    const snap = {
      episode,
      timestamp: Date.now(),
      coveragePct: Number(coveragePct.toFixed(3)),
      states: stateCount,
      minVisits: minV,
      maxVisits: maxV,
      avgVisits: Number(avgV.toFixed(2)),
      epsilon: Number(epsilon.toFixed(4)),
      full: args.snapshotSample ? false : true,
      qCountStored: Object.keys(qData).length
    };

    const fileName = `snapshot-ep${episode}${args.snapshotSample ? `-sample${args.snapshotSample}` : ""}.json`;
    fs.writeFileSync(
      path.join(args.snapshotDir, fileName),
      JSON.stringify(
        {
          meta: snap,
          q: qData,
          // keep only sampled visits for consistency
          visits: Object.fromEntries(
            Object.keys(qData).map(k => [k, visits[k] ?? 0])
          )
        },
        null,
        2
      ),
      "utf-8"
    );
    // Also maintain an index file (append-only small)
    const indexFile = path.join(args.snapshotDir, "index.json");
    let index: any[] = [];
    if (fs.existsSync(indexFile)) {
      try { index = JSON.parse(fs.readFileSync(indexFile,"utf-8")); } catch {}
    }
    index.push(snap);
    // keep only last 200 entries
    if (index.length > 200) index = index.slice(-200);
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), "utf-8");
  } catch (e) {
    console.warn("[snapshot] failed:", (e as Error).message);
  }
}

// ===== Replay Buffer =====
interface Transition {
  s: string;
  a: Action;
  r: number;
  s2: string;
  done: boolean;
  visitsAfter: number;
}
class ReplayBuffer {
  private buf: Transition[] = [];
  constructor(private capacity: number) {}
  push(t: Transition) {
    if (this.buf.length >= this.capacity) this.buf.shift();
    this.buf.push(t);
  }
  sample(n: number): Transition[] {
    if (!this.buf.length) return [];
    if (this.buf.length <= n) return [...this.buf];
    const sorted = [...this.buf].sort((a, b) => a.visitsAfter - b.visitsAfter);
    const slice = sorted.slice(0, Math.min(sorted.length, n * 3));
    if (!slice.length) return [];
    const out: Transition[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * slice.length);
      const picked = slice[idx];
      if (picked) out.push(picked);
    }
    return out;
  }
}

// ===== Evaluation =====
function evaluate(q: QTable, episodes: number): { win: number; lose: number; draw: number; winRate: number } {
  let w = 0, l = 0, d = 0;
  for (let ep = 0; ep < episodes; ep++) {
    let s = initialState();
    let done = false;
    while (!done) {
      const sk = encodeState(s);
      const aAI = pickAction(q, sk, -1); // greedy
      const spendAI = aAI === Action.ATTACK ? Math.max(1, s.pCharge) : 0;
      const pol = samplePolicy([0.25,0.25,0.25,0.25]);
      const opp = pol({ state: s, q, epsilon: 0 });
      const { s2, r, done: d2 } = stepWithPower(s, aAI, spendAI, opp.a, opp.spend);
      s = s2;
      done = d2;
      if (done) {
        if (r > 0) w++; else if (r < 0) l++; else d++;
      }
    }
  }
  return { win: w, lose: l, draw: d, winRate: (w / episodes) * 100 };
}

// ===== Main =====
async function main() {
  const args = parseArgs();
  console.log("CONFIG:", args);

  const cacheReachable = path.join(path.dirname(args.save), "reachable-max.cache");
  const reachableMax = computeReachableMax(cacheReachable);
  console.log("Reachable states (BFS):", reachableMax);

  const { q, visits, totalEpisodes: loadedTotal } = loadExisting(args.save, args.seedFile);
  let totalEpisodes = loadedTotal;
  const replay = new ReplayBuffer(args.replayBufferSize);

  let newStatesFound = 0;
  let lastNewStateAt = 0;
  let wins = 0, loses = 0, draws = 0;
  let cumulativeReward = 0;
  let bestCoverage = 0;

  // Charger historique existant
  function loadHistory(pathFile: string): HistoryPoint[] {
    try {
      if (fs.existsSync(pathFile)) {
        const raw = JSON.parse(fs.readFileSync(pathFile,"utf-8"));
        if (Array.isArray(raw)) return raw as HistoryPoint[];
      }
    } catch {}
    return [];
  }

  function saveHistory(pathFile: string, history: HistoryPoint[]) {
    fs.mkdirSync(path.dirname(pathFile), { recursive: true });
    fs.writeFileSync(pathFile, JSON.stringify(history, null, 2), "utf-8");
  }

  const history: HistoryPoint[] = loadHistory(args.historyFile);

  for (let ep = 1; ep <= args.episodes; ep++) {
    let s = initialState();
    ensureQ(q, encodeState(s));
    let done = false;
    let epReward = 0;

    const coverage = Object.keys(q).length / reachableMax;
    if (coverage > bestCoverage) bestCoverage = coverage;

    const episodesSinceNew = ep - lastNewStateAt;
    const stagnating = episodesSinceNew > args.noNewStateThreshold && coverage < args.targetCoverage;
    const epsilon = adaptiveEpsilon(coverage, args, stagnating, episodesSinceNew);
    const phaseFrac = ep / args.episodes;
    const weights = curriculumWeights(phaseFrac);
    const opponentPolicy = samplePolicy(weights);

    while (!done) {
      const sKey = encodeState(s);
      visits[sKey] = (visits[sKey] || 0) + 1;
      const aAI = pickAction(q, sKey, epsilon);
      const spendAI = aAI === Action.ATTACK ? Math.max(1, s.pCharge) : 0;

      const opp = opponentPolicy({ state: s, q, epsilon });
      const { s2, r, done: d2 } = stepWithPower(s, aAI, spendAI, opp.a, opp.spend);
      const s2Key = encodeState(s2);
      if (!q[s2Key]) {
        newStatesFound++;
        lastNewStateAt = ep;
      }
      ensureQ(q, s2Key);
      const v2 = (visits[s2Key] = (visits[s2Key] || 0) + 1);

      const novelty = v2 <= 2 ? args.noveltyCoeff : args.noveltyCoeff * (1 / Math.sqrt(v2));
      const deficit =
        v2 < args.minVisitsTarget
          ? args.deficitCoeff * (1 - v2 / args.minVisitsTarget)
          : 0;

      const shapedReward = r + novelty + deficit;

      const alpha = adaptiveAlpha(visits[sKey] || 1, args);
      qUpdate(q, sKey, aAI, shapedReward, s2Key, d2, alpha, 0.98);

      replay.push({
        s: sKey,
        a: aAI,
        r: shapedReward,
        s2: s2Key,
        done: d2,
        visitsAfter: v2
      });

      epReward += r;
      s = s2;
      done = d2;
      if (done) {
        if (r > 0) wins++;
        else if (r < 0) loses++;
        else draws++;
      }
    }

    // Mini replay sampling (corrigé: utilisation d'args.replaySamplePerEpisode)
    if (args.replaySamplePerEpisode > 0) {
      const batch = replay.sample(args.replaySamplePerEpisode);
      for (const tr of batch) {
        // tr est garanti défini
        const alphaR = adaptiveAlpha(visits[tr.s] || 1, args);
        qUpdate(q, tr.s, tr.a, tr.r, tr.s2, tr.done, alphaR * 0.5, 0.98);
      }
    }

    cumulativeReward += epReward;
    totalEpisodes++;

    if (ep % args.logEvery === 0 || ep === args.episodes) {
      const stateCount = Object.keys(q).length;
      const coveragePct = (100 * stateCount) / reachableMax;
      const visitVals = Object.values(visits);
      const minV = visitVals.length ? Math.min(...visitVals) : 0;
      const maxV = visitVals.length ? Math.max(...visitVals) : 0;
      const avgV = visitVals.length
        ? visitVals.reduce((a, b) => a + b, 0) / visitVals.length
        : 0;

      console.log(
        `[EP ${ep}] cov=${coveragePct.toFixed(2)}% states=${stateCount} new=${newStatesFound}` +
        ` eps=${epsilon.toFixed(3)} W:${wins} L:${loses} D:${draws} minV=${minV}` +
        ` avgV=${avgV.toFixed(1)} maxV=${maxV} stagnate=${(ep - lastNewStateAt)}`
      );

      const g = gini(visitVals);
      history.push({
        episode: totalEpisodes, // total cumulé
        coverage: coveragePct,
        states: stateCount,
        minV: minV,
        maxV: maxV,
        avgV: avgV,
        epsilon,
        newStates: newStatesFound,
        stagnate: episodesSinceNew,
        gini: Number(g.toFixed(4)),
        timestamp: Date.now()
      });
      if (ep % args.checkpointEvery === 0 || ep === args.episodes) {
        saveAll(args.save, q, visits, {
          coveragePct: Number(coveragePct.toFixed(3)),
          reachableMax,
          states: stateCount,
          minVisits: minV,
          maxVisits: maxV,
          avgVisits: Number(avgV.toFixed(2)),
          lastNewStateEpisode: lastNewStateAt,
          episode: ep,
          totalEpisodes   // <-- cumul sur toutes les relances
        });
        saveHistory(args.historyFile, history.slice(-5000)); // garder fenêtre (évite trop gros)
      }
    }

    if (
      coverage >= args.targetCoverage &&
      Object.values(visits).every((v) => v >= args.minVisitsTarget)
    ) {
      console.log(
        `Cible atteinte (coverage & minVisits) à l'épisode ${ep}. Arrêt anticipé.`
      );
      break;
    }

    if (args.evalEvery > 0 && ep % args.evalEvery === 0) {
      const ev = evaluate(q, args.evalEpisodes);
      console.log(
        `>> EVAL ep=${ep} greedy WinRate=${ev.winRate.toFixed(
          2
        )}% W:${ev.win} L:${ev.lose} D:${ev.draw}`
      );
    }

    if ((ep % args.snapshotEvery === 0 || ep === args.episodes)) {
      // Use latest computed coverage stats lazily (recompute minimally)
      saveSnapshot(args, totalEpisodes, reachableMax, q, visits, /*current epsilon*/ epsilon);
    }
  }

  const finalStateCount = Object.keys(q).length;
  const finalCoverage = (finalStateCount / reachableMax) * 100;
  const visitVals = Object.values(visits);
  const minV = visitVals.length ? Math.min(...visitVals) : 0;
  const maxV = visitVals.length ? Math.max(...visitVals) : 0;
  const avgV = visitVals.length
    ? visitVals.reduce((a, b) => a + b, 0) / visitVals.length
    : 0;
  const lastHist = history.length ? history[history.length - 1] : undefined;
  saveAll(args.save, q, visits, {
    coveragePct: Number(finalCoverage.toFixed(3)),
    reachableMax,
    states: finalStateCount,
    minVisits: minV,
    maxVisits: maxV,
    avgVisits: Number(avgV.toFixed(2)),
    completed: true,
    gini: lastHist ? lastHist.gini : 0,
    totalEpisodes
  });

  console.log(
    `Terminé. Couverture=${finalCoverage.toFixed(
      2
    )}% states=${finalStateCount} minVisits=${minV} avg=${avgV.toFixed(
      2
    )} max=${maxV}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

function gini(values: number[]): number {
  if (!values.length) return 0;
  const arr = [...values].sort((a,b)=>a-b);
  const n = arr.length;
  const sum = arr.reduce((a,b)=>a+b,0);
  if (sum === 0) return 0;
  let cum = 0;
  let weighted = 0;
  for (let i=0;i<n;i++){
    const v = arr[i];
    if (v === undefined) continue; // guard for noUncheckedIndexedAccess
    cum += v;
    weighted += cum;
  }
  // Gini = (n+1 - 2 * (weighted/sum)) / n
  return (n + 1 - 2 * (weighted / sum)) / n;
}