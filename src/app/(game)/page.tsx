"use client";
import { GameShell } from "../components/game/GameShell";
import { GameHeader } from "../components/game/GameHeader";
import { Arena } from "../components/game/Arena";
import { ActionBar } from "../components/game/ActionBar";
import { BattleLog } from "../components/game/BattleLog";
import { ResultDialog } from "../components/game/ResultDialog";

export default function GamePage() {
  return (
    <GameShell>
      <GameHeader />
      <Arena />
      <ActionBar />
      <BattleLog />
      <ResultDialog />
      <footer className="mt-10 text-[10px] text-slate-500">
        RL demo – charges, attaques simultanées & Q-learning.
      </footer>
    </GameShell>
  );
}