"use client";
import { useState } from "react";
import { usePusherMatch } from "@/hooks/usePusherMatch";
import Link from "next/link";

export default function MultiplayerPage() {
  const [matchId, setMatchId] = useState<string>("");
  const [current, setCurrent] = useState<string | null>(null);
  const { playerId, state, join, sendAction, reveal } = usePusherMatch(current);

  async function create() {
    const r = await fetch("/api/match/create", { method: "POST" });
    const j = await r.json();
    setMatchId(j.matchId);
    setCurrent(j.matchId);
    setTimeout(join, 400);
  }

  async function joinExisting() {
    if (!matchId) return;
    setCurrent(matchId);
    setTimeout(join, 400);
  }

  return (
    <div className="min-h-dvh px-6 py-8 text-slate-100">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">Home</Link>
          <h1 className="text-2xl font-bold">Multiplayer (Pusher Sandbox)</h1>
        </div>

        <div className="glass p-4 space-y-4">
          <div className="flex gap-2">
            <button onClick={create} className="px-3 py-1.5 rounded bg-indigo-600/80 hover:bg-indigo-500 text-xs font-semibold">
              Create Match
            </button>
            <input
              value={matchId}
              onChange={e=>setMatchId(e.target.value)}
              placeholder="Match ID"
              className="bg-white/10 text-xs px-2 py-1 rounded"
            />
            <button onClick={joinExisting} className="px-3 py-1.5 rounded bg-fuchsia-600/80 hover:bg-fuchsia-500 text-xs font-semibold">
              Join
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Player ID: {playerId || "…"} • Current Match: {current || "-"}
          </p>
        </div>

        {state && (
          <div className="glass p-5 space-y-4">
            <h2 className="text-sm font-semibold">Match #{state.id}</h2>
            <p className="text-xs text-slate-400">
              Phase: {state.phase} • Turn: {state.turn}
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded bg-indigo-500/10">
                <h3 className="font-semibold mb-1">Side P</h3>
                <p>HP: {state.hp?.p}</p>
                <p>Charge: {state.charge?.p}</p>
              </div>
              <div className="p-3 rounded bg-fuchsia-500/10">
                <h3 className="font-semibold mb-1">Side E</h3>
                <p>HP: {state.hp?.e}</p>
                <p>Charge: {state.charge?.e}</p>
              </div>
            </div>

            {reveal && (
              <div className="text-[11px] bg-white/5 rounded p-3">
                <p className="font-semibold mb-1">Reveal Turn {reveal.turn}</p>
                <pre className="whitespace-pre-wrap text-[10px]">
{JSON.stringify(reveal.reveal, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex gap-2">
              <button
                disabled={state.phase !== "collect"}
                onClick={()=>sendAction(0)}
                className="flex-1 px-3 py-2 rounded bg-rose-600/80 hover:bg-rose-600 text-xs font-medium disabled:opacity-40"
              >Attack</button>
              <button
                disabled={state.phase !== "collect"}
                onClick={()=>sendAction(1)}
                className="flex-1 px-3 py-2 rounded bg-sky-600/80 hover:bg-sky-600 text-xs font-medium disabled:opacity-40"
              >Defend</button>
              <button
                disabled={state.phase !== "collect"}
                onClick={()=>sendAction(2)}
                className="flex-1 px-3 py-2 rounded bg-amber-500/80 hover:bg-amber-500 text-xs font-medium disabled:opacity-40"
              >Charge</button>
            </div>
            <p className="text-[10px] text-slate-500">
              Sandbox: in-memory match state (will reset on cold start).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}