/* Offline trainer Q-Learning (amélioré) */
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
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const num = (f: string, d: number) => {
    const i = argv.indexOf(f);
    if (i === -1 || i === argv.length - 1) return d;
    const v = Number(argv[i + 1]);
    return Number.isFinite(v) ? v : d;
  };
  const str = (f: string, d: string) => {
    const i = argv.indexOf(f);
    if (i === -1 || i === argv.length - 1) return d;
    const v = argv[i + 1];
    return v ? String(v) : d;
  };
  return {
    episodes: num("--episodes", 40000),
    epsilonStart: num("--epsilonStart", 1.0),
    epsilonEnd: num("--epsilonEnd", 0.02),
    alphaStart: num("--alphaStart", 0.25),
    alphaFinal: num("--alphaFinal", 0.1),
    gamma: num("--gamma", 0.98),
    save: str("--save", "public/seed-qtable.json"),
    logInterval: num("--logInterval", 2000),
    evalEvery: num("--evalEvery", 5000),
    evalEpisodes: num("--evalEpisodes", 500),
  };
}

const ACTION_INDEX_MAP = {
  [Action.ATTACK]: 0,
  [Action.DEFEND]: 1,
  [Action.CHARGE]: 2,
} as const;
function actionIndex(a: Action): 0 | 1 | 2 {
  return ACTION_INDEX_MAP[a];
}

function ensureQ(q: QTable, s: string): QRow {
  if (!q[s]) q[s] = [0, 0, 0];
  return q[s];
}

function pickAction(q: QTable, s: string, eps: number): Action {
  if (Math.random() < eps || !q[s]) {
    const r = Math.random();
    return r < 1 / 3 ? Action.ATTACK : r < 2 / 3 ? Action.DEFEND : Action.CHARGE;
  }
  const row = ensureQ(q, s);
  // argmax stable
  let bestIdx = 0;
  let bestVal = row[0];
  if (row[1] > bestVal) {
    bestVal = row[1];
    bestIdx = 1;
  }
  if (row[2] > bestVal) bestIdx = 2;
  return bestIdx === 0 ? Action.ATTACK : bestIdx === 1 ? Action.DEFEND : Action.CHARGE;
}

function greedyAction(q: QTable, s: string): Action {
  return pickAction(q, s, -1); // eps<0 => jamais exploration
}

function spendForAttackAgent(state: ReturnType<typeof initialState>): number {
  return state.pCharge;
}

function opponentPolicy(state: ReturnType<typeof initialState>): { a: Action; spend: number } {
  if (state.eCharge >= 2 && Math.random() < 0.55) {
    return { a: Action.ATTACK, spend: state.eCharge };
  }
  const r = Math.random();
  if (r < 0.4) return { a: Action.CHARGE, spend: 0 };
  if (r < 0.7) return { a: Action.DEFEND, spend: 0 };
  return { a: Action.ATTACK, spend: Math.max(1, state.eCharge) };
}

function localQUpdate(
  q: QTable,
  sKey: string,
  a: Action,
  reward: number,
  s2Key: string,
  done: boolean,
  gamma: number,
  alpha: number
) {
  const row: QRow = ensureQ(q, sKey);
  const row2: QRow = ensureQ(q, s2Key);
  const nextMax = done ? 0 : Math.max(row2[0], row2[1], row2[2]);
  const i = actionIndex(a);
  const target = reward + (done ? 0 : gamma * nextMax);
  row[i] = row[i] + alpha * (target - row[i]);
}

function loadExisting(file: string): QTable {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if ("q" in parsed) return (parsed as any).q as QTable;
        return parsed as QTable;
      }
    }
  } catch (e) {
    console.warn("Lecture Q-table échouée:", (e as Error).message);
  }
  return {};
}

function saveQ(q: QTable, file: string) {
  const out = { version: Date.now(), q };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2), "utf-8");
}

// Alpha schedule exponentielle
function alphaFor(ep: number, args: Args): number {
  const t = ep / args.episodes;
  return args.alphaStart * Math.pow(args.alphaFinal / args.alphaStart, t);
}

// Epsilon schedule analytique : atteint epsilonEnd à 75% des épisodes
function epsilonFor(ep: number, args: Args): number {
  const targetFrac = 0.75;
  const k = Math.log(args.epsilonStart / args.epsilonEnd) / (args.episodes * targetFrac);
  const val = args.epsilonStart * Math.exp(-k * ep);
  return Math.max(args.epsilonEnd, val);
}

// Évaluation (greedy)
function evaluate(q: QTable, episodes: number) {
  let w = 0,
    l = 0,
    d = 0;
  for (let ep = 0; ep < episodes; ep++) {
    let s = initialState();
    let done = false;
    while (!done) {
      const sKey = encodeState(s);
      const aAI = greedyAction(q, sKey);
      const spendAI = aAI === Action.ATTACK ? Math.max(1, spendForAttackAgent(s)) : 0;
      const opp = opponentPolicy(s);
      const { s2, r, done: d2 } = stepWithPower(s, aAI, spendAI, opp.a, opp.spend);
      s = s2;
      done = d2;
      if (done) {
        if (r > 0) w++;
        else if (r < 0) l++;
        else d++;
      }
    }
  }
  return {
    win: w,
    lose: l,
    draw: d,
    winRate: (w / episodes) * 100,
  };
}

async function main() {
  const args = parseArgs();
  console.log("TRAIN CONFIG:", args);

  const q: QTable = loadExisting(args.save);

  let wins = 0,
    loses = 0,
    draws = 0;
  let cumulativeReward = 0;

  for (let ep = 1; ep <= args.episodes; ep++) {
    let s = initialState();
    ensureQ(q, encodeState(s));
    let done = false;
    let epReward = 0;

    const epsilon = epsilonFor(ep, args);
    const alpha = alphaFor(ep, args);

    while (!done) {
      const sKey = encodeState(s);
      const aAI = pickAction(q, sKey, epsilon);
      const spendAI = aAI === Action.ATTACK ? Math.max(1, spendForAttackAgent(s)) : 0;
      const opp = opponentPolicy(s);
      const { s2, r, done: d2 } = stepWithPower(s, aAI, spendAI, opp.a, opp.spend);
      localQUpdate(q, sKey, aAI, r, encodeState(s2), d2, args.gamma, alpha);
      epReward += r;
      s = s2;
      done = d2;
      if (done) {
        if (r > 0) wins++;
        else if (r < 0) loses++;
        else draws++;
      }
    }

    cumulativeReward += epReward;

    if (ep % args.logInterval === 0 || ep === args.episodes) {
      const ratio = (wins / ep) * 100;
      const avgR = (cumulativeReward / ep).toFixed(2);
      console.log(
        `[EP ${ep}] ε=${epsilon.toFixed(3)} α=${alpha.toFixed(
          3
        )} W:${wins} L:${loses} D:${draws} Win%=${ratio.toFixed(1)} AvgR=${avgR}`
      );
    }

    if (args.evalEvery > 0 && ep % args.evalEvery === 0) {
      const ev = evaluate(q, args.evalEpisodes);
      console.log(
        `>> EVAL ep=${ep} (greedy) Win=${ev.win} Lose=${ev.lose} Draw=${ev.draw} Win%=${ev.winRate.toFixed(
          1
        )}`
      );
    }
  }

  saveQ(q, args.save);
  console.log("Entraînement terminé →", args.save);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});