"use client";
import { useGame } from "./GameShell";
import { BattleEvent } from "@/hooks/useGameEngine";
import { ScrollArea } from "./ScrollAreaInternal";
import { Action } from "@/lib/rl/types";
import { Sword, Shield, Battery } from "lucide-react";

type DisplayEvent = Exclude<BattleEvent, { type: "turn" }>;

function meta(a: Action) {
  switch (a) {
    case Action.ATTACK:
      return { label: "Attaque", icon: <Sword size={12} /> };
    case Action.DEFEND:
      return { label: "Défense", icon: <Shield size={12} /> };
    default:
      return { label: "Charge", icon: <Battery size={12} /> };
  }
}

export function BattleLog() {
  const { events } = useGame();
  const filtered: DisplayEvent[] = events.filter(
    (e): e is DisplayEvent => e.type !== "turn"
  );

  return (
    <div className="w-full max-w-5xl mt-6 glass p-4">
      <h3 className="text-sm font-semibold mb-3 tracking-wide text-slate-300">
        Journal
      </h3>
      <ScrollArea className="max-h-60 pr-2 text-xs leading-relaxed space-y-1">
        {filtered.length === 0 && (
          <p className="text-slate-500">Aucun événement.</p>
        )}
        {filtered.map((e, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-slate-500">{i + 1}.</span>
            <LogEntry entry={e} />
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}

function LogEntry({ entry }: { entry: DisplayEvent }) {
  if (entry.type === "reveal") {
    const pm = meta(entry.player.action);
    const am = meta(entry.ai.action);
    return (
      <p className="flex flex-wrap gap-2">
        <span className="flex items-center gap-1">
          {pm.icon} Vous {pm.label}
          {entry.player.action === Action.ATTACK && entry.player.spend > 1 && (
            <strong> ×{entry.player.spend}</strong>
          )}
        </span>
        <span className="opacity-50">vs</span>
        <span className="flex items-center gap-1">
          {am.icon} IA {am.label}
          {entry.ai.action === Action.ATTACK && entry.ai.spend > 1 && (
            <strong> ×{entry.ai.spend}</strong>
          )}
        </span>
      </p>
    );
  }
  switch (entry.type) {
    case "attack":
      return (
        <p className="flex items-center gap-1">
          <Sword size={12} />
          <strong>{entry.who === "player" ? "Vous" : "IA"}</strong> attaque
          {entry.spend && entry.spend > 1 && (
            <span className="font-semibold"> ×{entry.spend}</span>
          )}
          :&nbsp;-{entry.dmg} HP
        </p>
      );
    case "defend":
      return (
        <p className="flex items-center gap-1">
          <Shield size={12} />
          <strong>{entry.who === "player" ? "Vous" : "IA"}</strong> défend
        </p>
      );
    case "charge":
      return (
        <p className="flex items-center gap-1">
          <Battery size={12} />
          <strong>{entry.who === "player" ? "Vous" : "IA"}</strong> charge
        </p>
      );
    case "result":
      return (
        <p className="font-semibold">
          Résultat:&nbsp;
          {entry.outcome === "win"
            ? "Victoire"
            : entry.outcome === "lose"
            ? "Défaite"
            : "Égalité"}
        </p>
      );
    default:
      return null;
  }
}