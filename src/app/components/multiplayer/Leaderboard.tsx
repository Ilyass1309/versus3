"use client";
import React from "react";
import type { ScoreRow } from "@/types/lobby";

type Props = {
  leaderboard: ScoreRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
};

export const Leaderboard: React.FC<Props> = ({ leaderboard, loading, error, onRefresh }) => {
  return (
    <div className="bg-slate-900 text-slate-100 rounded-lg shadow-lg p-4 border border-slate-800">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold">Classement Multijoueur</h2>
          <p className="text-xs text-slate-400">Joueurs avec le plus de points (ranking multi).</p>
        </div>

        <button onClick={() => void onRefresh()} className="text-sm text-slate-400 hover:text-slate-200" aria-label="Rafraîchir">⟳</button>
      </div>

      <div className="h-px bg-slate-800 my-2" />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 bg-slate-800 rounded animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="text-sm text-rose-400">{error}</div>
      ) : leaderboard.length === 0 ? (
        <div className="text-sm text-slate-400">Aucun score disponible</div>
      ) : (
        <ol className="space-y-2">
          {leaderboard.map((p, i) => (
            <li key={p.nickname} className="flex items-center justify-between gap-3 p-2 rounded hover:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 text-center font-medium text-slate-200">{i + 1}</div>
                <div className="text-sm font-medium text-slate-100">{p.nickname}</div>
              </div>
              <div className="text-sm font-mono text-slate-200">{p.points ?? 0}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};