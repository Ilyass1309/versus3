import { QTable, getRow, max } from "./qtable";
import { Action } from "./types";

const ALPHA = Number(process.env.ALPHA ?? 0.1);
const GAMMA = Number(process.env.GAMMA ?? 0.95);

/** Applique l’update Q-learning pour une transition */
export function qUpdate(
  q: QTable,
  sKey: string,
  a: Action,
  r: number,
  s2Key: string,
  done: boolean
) {
  const row = getRow(q, sKey);
  const current = row[a];

  const nextRow = getRow(q, s2Key);
  const target = done ? r : r + GAMMA * max(nextRow);

  row[a] = current + ALPHA * (target - current);
}
