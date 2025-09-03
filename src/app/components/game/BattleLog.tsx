"use client";
import { useGame } from "./GameShell";
import { BattleEvent } from "@/hooks/useGameEngine";
import { ScrollArea } from "./ScrollAreaInternal";

type LogEvent = Extract<
  BattleEvent,
  | { type: "attack"; who: "ai" | "player"; dmg: number }
  | { type: "defend"; who: "ai" | "player" }
  | { type: "charge"; who: "ai" | "player" }
  | { type: "result"; outcome: "win" | "lose" | "draw" }
>;

export function BattleLog() {
  const { events } = useGame();
  const filtered: LogEvent[] = events.filter(
    (e): e is LogEvent => e.type !== "turn"
  );

  return (
    <div className="w-full max-w-5xl mt-6 glass p-4">
      <h3 className="text-sm font-semibold mb-3 tracking-wide text-slate-300">
        Journal
      </h3>
      <ScrollArea className="max-h-48 pr-2 text-xs leading-relaxed space-y-1">
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

function LogEntry({ entry }: { entry: LogEvent }) {
  switch (entry.type) {
    case "attack":
      return (
        <p>
          <strong>{entry.who === "player" ? "Vous" : "AI"}</strong> attaque :
          &nbsp;-{entry.dmg} HP
        </p>
      );
    case "defend":
      return (
        <p>
          <strong>{entry.who === "player" ? "Vous" : "AI"}</strong> défend.
        </p>
      );
    case "charge":
      return (
        <p>
          <strong>{entry.who === "player" ? "Vous" : "AI"}</strong> charge.
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