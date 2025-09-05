"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/app/providers/PlayerProvider";

// Composants du jeu (adapte les chemins si différents)
import { GameShell } from "@/app/components/game/GameShell";
import { GameHeader } from "@/app/components/game/GameHeader";
import { Arena } from "@/app/components/game/Arena";
import { ActionBar } from "@/app/components/game/ActionBar";
import { BattleLog } from "@/app/components/game/BattleLog";
import { ResultDialog } from "@/app/components/game/ResultDialog";
import { RulesDialog } from "@/app/components/ui/RulesDialog";

export default function GamePage() {
  const { nickname } = usePlayer();
  const router = useRouter();

  // Si pas de pseudo → redirige vers /nickname
  useEffect(() => {
    if (!nickname) router.replace("/nickname");
  }, [nickname, router]);

  if (!nickname) return null;

  return (
    <GameShell>
      <GameHeader />
      <div className="absolute top-2 right-3 z-20">
        <RulesDialog />
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