import { useEffect, useState } from "react";
import { fetchLeaderboard } from "@/lib/lobbyApi";
import type { ScoreRow } from "@/types/lobby";

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const list = await fetchLeaderboard();
      setLeaderboard(list);
      setError(null);
    } catch {
      setError("Impossible de charger le classement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 30_000);
    return () => clearInterval(iv);
  }, []);

  return { leaderboard, loading, error, refresh };
}