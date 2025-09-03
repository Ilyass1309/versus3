import { QRow } from "./types";

export type QTable = Record<string, QRow>;

export function getRow(q: QTable, key: string): QRow {
  if (!q[key]) q[key] = [0, 0, 0];
  return q[key];
}

export function argmax(row: QRow): number {
  let best = 0;
  for (let i = 1; i < row.length; i++) {
    const current = row[i] ?? Number.NEGATIVE_INFINITY;
    const bestVal = row[best] ?? Number.NEGATIVE_INFINITY;
    if (current > bestVal) best = i;
  }
  return best;
}

export function max(row: QRow): number {
  return Math.max(row[0], row[1], row[2]);
}
