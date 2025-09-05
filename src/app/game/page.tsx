"use client";
import { useEffect, useState } from "react";
import { GameShell } from "@/app/components/game/GameShell";
import { GameHeader } from "@/app/components/game/GameHeader";
import { Arena } from "@/app/components/game/Arena";
import { ActionBar } from "@/app/components/game/ActionBar";
import { BattleLog } from "@/app/components/game/BattleLog";
import { ResultDialog } from "@/app/components/game/ResultDialog";
import { RulesDialog } from "@/app/components/ui/RulesDialog";

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
        <RulesDialog open={rulesOpen} onOpenChange={setRulesOpen} />
      </div>
      <Arena />
      <ActionBar />
      <BattleLog />
      <ResultDialog />
      <footer className="mt-10 text-[10px] text-slate-500">
        Prototype RL • Attaque / Défense / Charge
      </footer>
    </GameShell>
  );
}