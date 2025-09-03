"use client";
import { useGame } from "./GameShell";
import { Badge } from "../ui/badge";
import { SettingsSheet } from "./SettingsSheet";
import { RefreshCw } from "lucide-react";

export function GameHeader() {
  const { engine } = useGame();
  const status = engine.serverStatus;
  const statusColor = status === "ok" ? "green" : status === "error" ? "red" : "gray";
  return (
    <header className="w-full max-w-5xl mb-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
          Duel Arena
          {engine.qVersion != null && <Badge color="indigo">Q v{engine.qVersion}</Badge>}
          <Badge color={statusColor}>{status}</Badge>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Choisissez vos actions. Tour simultané. Apprentissage incrémental.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => engine.restart()}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition"
          aria-label="Recommencer"
        >
          <RefreshCw size={14} />
          Restart
        </button>
        <SettingsSheet />
      </div>
    </header>
  );
}