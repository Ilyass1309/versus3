import { NextResponse } from "next/server";

function genRecent() {
  const arr: { date: string; winRate: number }[] = [];
  for (let i = 19; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    arr.push({
      date: d.toISOString().slice(0, 10),
      winRate: 50 + Math.random() * 48,
    });
  }
  return arr;
}

// const (mutation interne uniquement)
const hyper = { alpha: 0.18, gamma: 0.98, epsilon: 0.05 };

export async function GET() {
  let qtableSize = 0;
  let qVersion: number | null = null;
  try {
    const fs = await import("node:fs/promises");
    const raw = await fs.readFile(process.cwd() + "/public/seed-qtable.json", "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed?.q) {
      qtableSize = Object.keys(parsed.q).length;
      qVersion = parsed.version ?? null;
    }
  } catch {}

  const totalGames = 1234;
  const totalWins = 890;
  const totalLosses = 300;
  const totalDraws = totalGames - totalWins - totalLosses;
  const recentWinRates = genRecent();

  return NextResponse.json({
    totalGames,
    totalWins,
    totalLosses,
    totalDraws,
    recentWinRates,
    hyperparams: hyper,
    qtableSize,
    qVersion,
    lastUpdate: qVersion ? new Date(qVersion).toISOString() : null,
  });
}