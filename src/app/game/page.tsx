"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameShell } from "@/app/components/game/GameShell";
import { GameHeader } from "@/app/components/game/GameHeader";
import { Arena } from "@/app/components/game/Arena";
import { ActionBar } from "@/app/components/game/ActionBar";
import { BattleLog } from "@/app/components/game/BattleLog";
import { ResultDialog } from "@/app/components/game/ResultDialog";
import { RulesDialog } from "@/app/components/ui/RulesDialog";

const RULES_FLAG_KEY = "rulesSeen_v1";

export default function GamePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState<string | null>(null); // placeholder si pas encore branché
  const [showRules, setShowRules] = useState(false);

  // Exemple: si ton pseudo est déjà stocké ailleurs, supprime ce placeholder.
  useEffect(() => {
    // Si ton appli récupère déjà le pseudo d’une autre manière, enlève cette partie.
    const stored = localStorage.getItem("playerName");
    if (stored) setPlayerName(stored);
  }, []);

  useEffect(() => {
    if (!playerName) return;
    if (!localStorage.getItem(RULES_FLAG_KEY)) {
      setShowRules(true);
      // On marque comme "vu" dès ouverture auto
      localStorage.setItem(RULES_FLAG_KEY, "1");
    }
  }, [playerName]);

  return (
    <GameShell>
      <GameHeader />
      <div className="absolute top-2 right-3 z-20">
        <RulesDialog open={showRules} onOpenChange={setShowRules} />
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