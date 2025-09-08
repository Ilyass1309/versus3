"use client";
import { useParams } from "next/navigation";
import { usePusherMatch } from "@/hooks/usePusherMatch";

export default function MatchRoomPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { playerId, state, resolving, reveal, sendAction, isJoined } = usePusherMatch(id);

  const disabled = !isJoined || state?.phase !== "collect";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Duel en ligne</h1>
          <div className="text-xs text-slate-400">Room: {id}</div>
        </header>

        <section className="grid grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border border-slate-800 p-5 bg-slate-900/60">
            <div className="text-sm mb-2">Vous</div>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-emerald-400">{state?.hp.p ?? 0} HP</div>
              <div className="text-sm text-emerald-300/80">Charge {state?.charge.p ?? 0}</div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 p-5 bg-slate-900/60">
            <div className="text-sm mb-2">Adversaire</div>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-rose-400">{state?.hp.e ?? 0} HP</div>
              <div className="text-sm text-rose-300/80">Charge {state?.charge.e ?? 0}</div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-300">Tour {state?.turn ?? 1} · Phase: {state?.phase}</div>
            <div className="text-xs text-slate-400 truncate max-w-[60%]">PlayerID: {playerId}</div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              disabled={disabled}
              onClick={() => sendAction(0)}
              className="px-4 py-3 rounded-lg bg-rose-600/80 hover:bg-rose-600 disabled:opacity-40"
            >Attaquer</button>
            <button
              disabled={disabled}
              onClick={() => sendAction(1)}
              className="px-4 py-3 rounded-lg bg-sky-600/80 hover:bg-sky-600 disabled:opacity-40"
            >Défendre</button>
            <button
              disabled={disabled}
              onClick={() => sendAction(2)}
              className="px-4 py-3 rounded-lg bg-amber-500/80 hover:bg-amber-500 disabled:opacity-40"
            >Charger</button>
          </div>

          {resolving && (
            <div className="mt-4 text-xs text-slate-400">
              Résolution en cours…
            </div>
          )}
        </section>
      </div>
    </div>
  );
}