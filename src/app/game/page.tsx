"use client";
import { useEffect, useState } from "react";
import { GameShell } from "@/app/components/game/GameShell";
import { GameHeader } from "@/app/components/game/GameHeader";
import { Arena } from "@/app/components/game/Arena";
import { ActionBar } from "@/app/components/game/ActionBar";
import { BattleLog } from "@/app/components/game/BattleLog";
import { ResultDialog } from "@/app/components/game/ResultDialog";
import { RulesDialog } from "@/app/components/ui/RulesDialog";
import { Scoreboard } from "@/app/components/game/Scoreboard";

const RULES_FLAG_KEY = "rulesSeen_v1";

export default function GamePage() {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("playerName") : null;
    if (stored) setPlayerName(stored);
  }, []);

  useEffect(() => {
    if (!playerName) return;
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(RULES_FLAG_KEY)) {
      setRulesOpen(true);
      localStorage.setItem(RULES_FLAG_KEY, "1");
    }
  }, [playerName]);

  return (
    <GameShell>
      <GameHeader />
      <div className="absolute top-2 right-3 z-20">
        <RulesDialog
          open={rulesOpen}
          onOpenChange={setRulesOpen}
          trigger={(open) => (
            <button
              onClick={open}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition focus:outline-none focus-visible:ring ring-indigo-400/60"
            >
              Règles
            </button>
          )}
        />
      </div>
      <div className="flex flex-col lg:flex-row gap-6 w-full mt-2">
        <aside className="lg:w-72 xl:w-80 shrink-0 order-2 lg:order-1 space-y-6">
          <Scoreboard />
        </aside>
        <main className="flex-1 order-1 lg:order-2 flex flex-col gap-4">
          <Arena />
          <ActionBar />
          <BattleLog />
          <ResultDialog />
          <footer className="mt-2 text-[10px] text-slate-500 text-center pb-2">
            Prototype RL • Attaque / Défense / Charge
          </footer>
        </main>
      </div>
    </GameShell>
  );
}