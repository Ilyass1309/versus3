export type LeaderboardEntry = { nickname: string; wins: number };

export async function fetchLeaderboardEntries(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch("/api/leaderboard", { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    const raw = json.top ?? json.leaderboard ?? json.data ?? [];
    if (!Array.isArray(raw)) return [];

    const list = raw
      .map((item: unknown) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const nickname = String(o.nickname ?? o.name ?? "");
        const wins =
          typeof o.wins === "number"
            ? o.wins
            : typeof o.points === "number"
            ? o.points
            : 0;
        if (!nickname) return null;
        return { nickname, wins } as LeaderboardEntry;
      })
      .filter((x): x is LeaderboardEntry => x !== null);

    return list;
  } catch {
    return [];
  }
}