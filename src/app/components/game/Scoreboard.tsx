"use client";
import { useEffect, useState } from "react";
import { usePlayer } from "@/app/providers/PlayerProvider";

interface Entry {
  nickname: string;
  wins: number;
}
export function Scoreboard() {
  const { nickname } = usePlayer();
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/scoreboard", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json.top || []);
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
    <div className="w-full glass p-4 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-wide uppercase text-slate-300">
          Classement (Victoires)
        </h3>
        <button
          onClick={load}
            className="text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition"
        >
          Refresh
        </button>
      </div>
      {loading && !data.length ? (
        <p className="text-[11px] text-slate-400">Chargement…</p>
      ) : data.length === 0 ? (
        <p className="text-[11px] text-slate-400">Aucune victoire enregistrée.</p>
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