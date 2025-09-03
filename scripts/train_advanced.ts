/**
 * Advanced Q-Learning trainer (patched)
 * Fixes:
 * - Safe arg parsing (no union string|number issues)
 * - noUncheckedIndexedAccess compliance
 * - Action counts strict typing
 * - samplePolicy never returns undefined
 * - ensureQ used everywhere rows accessed
 * - Removed destructuring on possibly undefined rows
 */

import fs from "node:fs";
import path from "node:path";
import { initialState, stepWithPower, encodeState } from "../src/lib/rl/env";
import { Action } from "../src/lib/rl/types";

type QRow = [number, number, number];
type QTable = Record<string, QRow>;

interface Args {
  episodes: number;
  epsilonStart: number;
  epsilonEnd: number;
  alphaStart: number;
  alphaFinal: number;
  gamma: number;
  save: string;
  logInterval: number;
  evalEvery: number;
  evalEpisodes: number;
  checkpointEvery: number;
  intrinsicCoeff: number;
  lowVisitThreshold: number;
  pruneEvery: number;
  pruneMinVisits: number;
  pruneMaxAbs: number;
  earlyStopWindow: number;
  earlyStopDelta: number;
}

const defaultArgs: Args = {
  episodes: 40000,
  epsilonStart: 1.0,
  epsilonEnd: 0.02,
  alphaStart: 0.25,
  alphaFinal: 0.1,
  gamma: 0.98,
  save: "public/seed-qtable.json",
  logInterval: 2000,
  evalEvery: 10000,
  evalEpisodes: 1000,
  checkpointEvery: 10000,
  intrinsicCoeff: 0.1,
  lowVisitThreshold: 4,
  pruneEvery: 15000,
  pruneMinVisits: 2,
  pruneMaxAbs: 0.05,
  earlyStopWindow: 0,
  earlyStopDelta: 0.15,
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const getIndex = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && i < argv.length - 1 ? i : -1;
  };
  const getNumber = (flag: keyof Args): number => {
    const idx = getIndex("--" + flag);
    if (idx === -1) return defaultArgs[flag] as number;
    const v = Number(argv[idx + 1]);
    return Number.isFinite(v) ? v : (defaultArgs[flag] as number);
  };
  const getString = (flag: keyof Args): string => {
    const idx = getIndex("--" + flag);
    if (idx === -1) return defaultArgs[flag] as string;
    return String(argv[idx + 1]);
  };
  return {
    episodes: getNumber("episodes"),
    epsilonStart: getNumber("epsilonStart"),
    epsilonEnd: getNumber("epsilonEnd"),
    alphaStart: getNumber("alphaStart"),
    alphaFinal: getNumber("alphaFinal"),
    gamma: getNumber("gamma"),
    save: getString("save"),
    logInterval: getNumber("logInterval"),
    evalEvery: getNumber("evalEvery"),
    evalEpisodes: getNumber("evalEpisodes"),
    checkpointEvery: getNumber("checkpointEvery"),
    intrinsicCoeff: getNumber("intrinsicCoeff"),
    lowVisitThreshold: getNumber("lowVisitThreshold"),
    pruneEvery: getNumber("pruneEvery"),
    pruneMinVisits: getNumber("pruneMinVisits"),
    pruneMaxAbs: getNumber("pruneMaxAbs"),
    earlyStopWindow: getNumber("earlyStopWindow"),
    earlyStopDelta: getNumber("earlyStopDelta"),
  };
}

const ACTION_INDEX_MAP: Record<Action, 0 | 1 | 2> = {
  [Action.ATTACK]: 0,
  [Action.DEFEND]: 1,
  [Action.CHARGE]: 2,
};
const idx = (a: Action) => ACTION_INDEX_MAP[a];

function ensureQ(q: QTable, s: string): QRow {
  if (!q[s]) q[s] = [0, 0, 0];
  return q[s];
}

interface PolicyCtx {
  state: ReturnType<typeof initialState>;
  q: QTable;
  epsilon: number;
}
type PolicyFn = (ctx: PolicyCtx) => { a: Action; spend: number };

// Policies
const policyRandom: PolicyFn = ({ state }) => {
  const r = Math.random();
  const a = r < 1 / 3 ? Action.ATTACK : r < 2 / 3 ? Action.DEFEND : Action.CHARGE;
  return { a, spend: a === Action.ATTACK ? Math.max(1, state.eCharge) : 0 };
};

const policyAggressive: PolicyFn = ({ state }) => {
  if (state.eCharge >= 1) {
    return { a: Action.ATTACK, spend: Math.max(1, state.eCharge) };
  }
  return { a: Action.CHARGE, spend: 0 };
};

const policyDefensive: PolicyFn = ({ state }) => {
  if (state.pCharge > state.eCharge && state.eCharge > 0) {
    return { a: Action.DEFEND, spend: 0 };
  }
  if (state.eCharge >= 2 && Math.random() < 0.4) {
    return { a: Action.ATTACK, spend: state.eCharge };
  }
  return { a: Action.CHARGE, spend: 0 };
};

const policyMirror: PolicyFn = ({ state, q }) => {
  const sKey = encodeState(state);
  const row = q[sKey];
  if (!row) return { a: Action.CHARGE, spend: 0 };
  let best = 0;
  let bestVal = row[0];
  if (row[1] > bestVal) {
    best = 1;
    bestVal = row[1];
  }
  if (row[2] > bestVal) best = 2;
  const a = best === 0 ? Action.ATTACK : best === 1 ? Action.DEFEND : Action.CHARGE;
  return { a, spend: a === Action.ATTACK ? Math.max(1, state.eCharge) : 0 };
};

// Agent action
function pickAction(q: QTable, s: string, epsilon: number): Action {
  if (Math.random() < epsilon || !q[s]) {
    const r = Math.random();
    return r < 1 / 3 ? Action.ATTACK : r < 2 / 3 ? Action.DEFEND : Action.CHARGE;
  }
  const row = ensureQ(q, s);
  let best = 0;
  let bestVal = row[0];
  if (row[1] > bestVal) {
    best = 1;
    bestVal = row[1];
  }
  if (row[2] > bestVal) best = 2;
  return best === 0 ? Action.ATTACK : best === 1 ? Action.DEFEND : Action.CHARGE;
}
const greedy = (q: QTable, s: string) => pickAction(q, s, -1);

function alphaFor(ep: number, args: Args) {
  const t = ep / args.episodes;
  return args.alphaStart * Math.pow(args.alphaFinal / args.alphaStart, t);
}
function epsilonFor(ep: number, args: Args) {
  const targetFrac = 0.8;
  const k = Math.log(args.epsilonStart / args.epsilonEnd) / (args.episodes * targetFrac);
  const val = args.epsilonStart * Math.exp(-k * ep);
  return Math.max(args.epsilonEnd, val);
}

function intrinsicBonus(visits: number, threshold: number, coeff: number) {
  if (visits >= threshold) return 0;
  return coeff * (1 - visits / threshold);
}

function qUpdate(
  q: QTable,
  sKey: string,
  a: Action,
  reward: number,
  s2Key: string,
  done: boolean,
  gamma: number,
  alpha: number
) {
  const row = ensureQ(q, sKey);
  const row2 = ensureQ(q, s2Key);
  const nextMax = done ? 0 : Math.max(row2[0], row2[1], row2[2]);
  const i = idx(a);
  const target = reward + (done ? 0 : gamma * nextMax);
  row[i] = row[i] + alpha * (target - row[i]);
}

interface EvalResult {
  name: string;
  win: number;
  lose: number;
  draw: number;
  winRate: number;
  avgLen: number;
}

function evaluatePolicies(
  q: QTable,
  policies: { name: string; fn: PolicyFn }[],
  episodes: number
): EvalResult[] {
  const results: EvalResult[] = [];
  for (const { name, fn } of policies) {
    let w = 0,
      l = 0,
      d = 0,
      totalLen = 0;
    for (let ep = 0; ep < episodes; ep++) {
      let s = initialState();
      let done = false;
      let len = 0;
      while (!done) {
        const sKey = encodeState(s);
        const aAI = greedy(q, sKey);
        const spendAI = aAI === Action.ATTACK ? Math.max(1, s.pCharge) : 0;
        const opp = fn({ state: s, q, epsilon: 0 });
        const { s2, r, done: d2 } = stepWithPower(s, aAI, spendAI, opp.a, opp.spend);
        s = s2;
        done = d2;
        len++;
        if (done) {
          if (r > 0) w++;
          else if (r < 0) l++;
          else d++;
        }
      }
      totalLen += len;
    }
    results.push({
      name,
      win: w,
      lose: l,
      draw: d,
      winRate: (w / episodes) * 100,
      avgLen: totalLen / episodes,
    });
  }
  return results;
}

function loadExisting(save: string): { q: QTable; version: number | null } {
  try {
    if (fs.existsSync(save)) {
      const parsed = JSON.parse(fs.readFileSync(save, "utf-8"));
      if (parsed?.q) {
        return { q: parsed.q as QTable, version: parsed.version ?? null };
      }
    }
  } catch {}
  return { q: {}, version: null };
}

function saveQ(q: QTable, file: string, version?: number) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify({ version: version ?? Date.now(), q }, null, 2),
    "utf-8"
  );
}

function compressQ(q: QTable, decimals = 4): QTable {
  const factor = 10 ** decimals;
  const out: QTable = {};
  for (const k in q) {
    const row = ensureQ(q, k);
    out[k] = [
      Math.round(row[0] * factor) / factor,
      Math.round(row[1] * factor) / factor,
      Math.round(row[2] * factor) / factor,
    ];
  }
  return out;
}

function checkpoint(base: string, ep: number, q: QTable, visits: Record<string, number>) {
  const dir = path.join(path.dirname(base), "checkpoints");
  fs.mkdirSync(dir, { recursive: true });
  const compressed = compressQ(q);
  const visitVals = Object.values(visits);
  const minV = visitVals.length ? Math.min(...visitVals) : 0;
  const maxV = visitVals.length ? Math.max(...visitVals) : 0;
  fs.writeFileSync(
    path.join(dir, `qtable_ep${ep}.json`),
    JSON.stringify(
      {
        episode: ep,
        version: Date.now(),
        size: Object.keys(compressed).length,
        q: compressed,
        meta: { minVisits: minV, maxVisits: maxV },
      },
      null,
      2
    ),
    "utf-8"
  );
}

function pruneQ(
  q: QTable,
  visits: Record<string, number>,
  minVisits: number,
  maxAbs: number
) {
  let removed = 0;
  for (const k of Object.keys(q)) {
    const v = visits[k] || 0;
    if (v <= minVisits) {
      const row = ensureQ(q, k);
      const maxMag = Math.max(Math.abs(row[0]), Math.abs(row[1]), Math.abs(row[2]));
      if (maxMag <= maxAbs) {
        delete q[k];
        removed++;
      }
    }
  }
  return removed;
}

function curriculumWeights(ep: number, total: number): number[] {
  const frac = ep / total;
  // order: random, defensive, aggressive, mirror
  if (frac < 0.2) return [0.5, 0.3, 0.2, 0];
  if (frac < 0.5) return [0.25, 0.25, 0.25, 0.25];
  if (frac < 0.75) return [0.15, 0.25, 0.3, 0.3];
  return [0.1, 0.15, 0.25, 0.5];
}

// Replace the existing samplePolicy function with this safer version
function samplePolicy(weights: number[], policies: PolicyFn[]): PolicyFn {
  // Fallback if no policies registered
  if (policies.length === 0) return policyRandom;
  const len = Math.min(weights.length, policies.length);

  // If mismatch / empty weights → uniform random over provided policies
  if (len === 0) return policyRandom;

  let sum = 0;
  for (let i = 0; i < len; i++) {
    const w = weights[i] ?? 0;
    if (w > 0) sum += w;
  }

  // All zero / negative weights → first policy (assert non-null)
  if (sum <= 0) return policies[0]!;

  let r = Math.random() * sum;
  for (let i = 0; i < len; i++) {
    const w = weights[i] ?? 0;
    if (w <= 0) continue;
    if (r < w) return policies[i]!;
    r -= w;
  }
  return policies[len - 1]!;
}

interface ActionCounts {
  A: number;
  D: number;
  C: number;
}

async function main() {
  const args = parseArgs();
  console.log("ADV TRAIN CONFIG:", args);

  const { q } = loadExisting(args.save);
  const visitCounts: Record<string, number> = {};
  const actionCounts: ActionCounts = { A: 0, D: 0, C: 0 };

  let wins = 0,
    loses = 0,
    draws = 0,
    cumulativeReward = 0,
    cumulativeLength = 0;

  const opponents: { name: string; fn: PolicyFn }[] = [
    { name: "random", fn: policyRandom },
    { name: "defensive", fn: policyDefensive },
    { name: "aggressive", fn: policyAggressive },
    { name: "mirror", fn: policyMirror },
  ];
  const opponentFns: PolicyFn[] = opponents.map(o => o.fn);
  if (opponentFns.length === 0) {
    throw new Error("No opponent policies available.");
  }

  const evalHistory: number[] = [];
  let earlyStopTriggered = false;

  for (let ep = 1; ep <= args.episodes; ep++) {
    const epsilon = epsilonFor(ep, args);
    const alpha = alphaFor(ep, args);
    const weights = curriculumWeights(ep, args.episodes);
    const opponentPolicy = samplePolicy(weights, opponentFns);

    let s = initialState();
    let done = false;
    let epReward = 0;
    let epLen = 0;

    while (!done) {
      const sKey = encodeState(s);
      visitCounts[sKey] = (visitCounts[sKey] || 0) + 1;
      ensureQ(q, sKey);

      const aAI = pickAction(q, sKey, epsilon);
      if (aAI === Action.ATTACK) actionCounts.A++;
      else if (aAI === Action.DEFEND) actionCounts.D++;
      else actionCounts.C++;

      const spendAI = aAI === Action.ATTACK ? Math.max(1, s.pCharge) : 0;
      const opp = opponentPolicy({ state: s, q, epsilon });
      const { s2, r, done: d2 } = stepWithPower(s, aAI, spendAI, opp.a, opp.spend);

      const s2Key = encodeState(s2);
      ensureQ(q, s2Key);

      const bonus = intrinsicBonus(
        (visitCounts[s2Key] || 0),
        args.lowVisitThreshold,
        args.intrinsicCoeff
      );

      qUpdate(q, sKey, aAI, r + bonus, s2Key, d2, args.gamma, alpha);

      epReward += r;
      s = s2;
      done = d2;
      epLen++;
      if (done) {
        if (r > 0) wins++;
        else if (r < 0) loses++;
        else draws++;
      }
    }

    cumulativeReward += epReward;
    cumulativeLength += epLen;

    if (ep % args.logInterval === 0 || ep === args.episodes) {
      const trainWinRate = (wins / ep) * 100;
      const avgR = (cumulativeReward / ep).toFixed(3);
      const avgLen = (cumulativeLength / ep).toFixed(2);
      const actSum = actionCounts.A + actionCounts.D + actionCounts.C || 1;
      const distA = ((actionCounts.A / actSum) * 100).toFixed(1);
      const distD = ((actionCounts.D / actSum) * 100).toFixed(1);
      const distC = ((actionCounts.C / actSum) * 100).toFixed(1);
      console.log(
        `[EP ${ep}] ε=${epsilon.toFixed(3)} α=${alpha.toFixed(
          3
        )} TrainWin=${trainWinRate.toFixed(1)}% AvgR=${avgR} AvgLen=${avgLen} ActDist=(${distA}% A, ${distD}% D, ${distC}% C) Q|S|=${
          Object.keys(q).length
        }`
      );
    }

    if (args.checkpointEvery > 0 && ep % args.checkpointEvery === 0) {
      checkpoint(args.save, ep, q, visitCounts);
    }

    if (args.pruneEvery > 0 && ep % args.pruneEvery === 0 && ep !== args.episodes) {
      const removed = pruneQ(q, visitCounts, args.pruneMinVisits, args.pruneMaxAbs);
      if (removed > 0) {
        console.log(`Prune @${ep}: removed ${removed} low-impact states.`);
      }
    }

    if (args.evalEvery > 0 && ep % args.evalEvery === 0) {
      const evalRes = evaluatePolicies(q, opponents, args.evalEpisodes);
      evalRes.forEach((r) =>
        console.log(
          `>> EVAL ep=${ep} ${r.name} Win=${r.win} Lose=${r.lose} Draw=${r.draw} WinRate=${r.winRate.toFixed(
            2
          )}% AvgLen=${r.avgLen.toFixed(2)}`
        )
      );
      const overall =
        evalRes.reduce((sum, r) => sum + r.winRate, 0) / evalRes.length;
      evalHistory.push(overall);
      if (
        args.earlyStopWindow > 0 &&
        evalHistory.length >= args.earlyStopWindow
      ) {
        const recent = evalHistory.slice(-args.earlyStopWindow);
        const min = Math.min(...recent);
        const max = Math.max(...recent);
        if (max - min < args.earlyStopDelta) {
          console.log(
            `EARLY STOP ep=${ep} stability Δ=${(max - min).toFixed(2)}%`
          );
            // break out early
          break;
        }
      }
    }
  }

  const finalCompressed = compressQ(q, 5);
  saveQ(finalCompressed, args.save);
  console.log(
    `Training complete. States=${Object.keys(finalCompressed).length}`
  );

  const topStates = Object.entries(visitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, v]) => ({ state: k, visits: v }));
  console.log("Top visited states:", topStates);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});