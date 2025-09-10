"use client";
import { useEffect, useState } from "react";
import { usePlayer } from "@/app/providers/PlayerProvider";

interface Entry {
  nickname: string;
  wins: number;
}
export function Scoreboard() {
  const { user } = usePlayer();
  const nickname = user?.nickname;
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        // support different response shapes from the API
        const raw = json.top ?? json.leaderboard ?? json.data ?? [];
        const list = Array.isArray(raw)
          ? raw.map((e: any) => ({
              nickname: String(e.nickname ?? e.name ?? ""),
              wins: typeof e.wins === "number" ? e.wins : typeof e.points === "number" ? e.points : 0,
            }))
          : [];
        setData(list);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full card-glass p-4 lg:sticky lg:top-20 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_4px_18px_-4px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold tracking-wider uppercase text-slate-300">
          Leaderboard (Wins)
        </h3>
        <button
          onClick={load}
          className="text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition"
        >
          Refresh
        </button>
      </div>
      {loading && !data.length ? (
        <p className="text-[11px] text-slate-400">Loading...</p>
      ) : data.length === 0 ? (
        <p className="text-[11px] text-slate-400">No wins recorded.</p>
      ) : (
        <ol className="space-y-1 text-[12px]">
          {data.map((e, i) => {
            const me = nickname && e.nickname === nickname;
            return (
              <li
                key={e.nickname}
                className={
                  "flex justify-between rounded px-2 py-1 " +
                  (me
                    ? "bg-indigo-600/30 text-indigo-100"
                    : i < 3
                    ? "bg-white/5"
                    : "")
                }
              >
                <span className="flex gap-2">
                  <span className="w-4 text-right tabular-nums">{i + 1}</span>
                  <span className="truncate max-w-[120px]">{e.nickname}</span>
                </span>
                <span className="font-medium tabular-nums">{e.wins}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}