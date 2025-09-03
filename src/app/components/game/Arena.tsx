"use client";
import { useGame } from "./GameShell";
import { Action } from "@/lib/rl/types";
import { Sword, Shield, Battery } from "lucide-react";

function ChargePills({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 3 }, (_, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-sm ${
            i < count ? "bg-accent" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

interface HPBarProps {
  hp: number;
  max: number;
  label: string;
  gradient?: string;
}
function HPBar({ hp, max, label, gradient }: HPBarProps) {
  const ratio = hp / max;
  const pct = Math.round(ratio * 100);
  const grad =
    gradient ??
    (ratio > 0.66
      ? "from-emerald-500 to-emerald-400"
      : ratio > 0.33
      ? "from-amber-500 to-amber-400"
      : "from-rose-600 to-rose-500");
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-slate-300 font-medium">
        <span>{label}</span>
        <span>
          {hp} / {max} ({pct}%)
        </span>
      </div>
      <div className="h-4 w-full rounded bg-white/5 overflow-hidden relative">
        <div
          className={`h-full bg-gradient-to-r ${grad} transition-[width] duration-300`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold mix-blend-plus-lighter text-white/80">
          {hp > 0 ? `${hp}` : "KO"}
        </div>
      </div>
    </div>
  );
}

export function Arena() {
  const { engine, events } = useGame();
  const playerHP = engine.state.eHP; // joueur
  const aiHP = engine.state.pHP; // IA
  const lastTurn = events.filter((e) => e.type === "turn").at(-1);

  const playerCharge = engine.state.eCharge;
  const aiCharge = engine.state.pCharge;

  return (
    <section
      aria-label="Aire de combat"
      className="relative w-full max-w-5xl glass p-6 md:p-10 grid gap-8 md:grid-cols-2"
    >
      <div className="flex flex-col gap-4 justify-between">
        <div>
          <HPBar hp={playerHP} max={20} label="Vous" />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
            <span>Charge</span>
            <ChargePills count={playerCharge} />
          </div>
        </div>
        <FighterSprite who="player" actionPending={engine.playerPending} />
      </div>

      <div className="flex flex-col gap-4 justify-between">
        <div className="text-right">
          <HPBar hp={aiHP} max={20} label="Adversaire" />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
            <ChargePills count={aiCharge} />
            <span>Charge</span>
          </div>
        </div>
        <FighterSprite who="ai" actionPending={null} />
      </div>

      <div className="col-span-full mt-4 text-[11px] text-slate-500 flex justify-between">
        <span>Tour: {lastTurn ? (lastTurn as any).n : 0}</span>
      </div>
    </section>
  );
}

function FighterSprite({
  who,
  actionPending,
}: {
  who: "player" | "ai";
  actionPending: Action | null;
}) {
  const icon =
    actionPending === Action.ATTACK ? (
      <Sword size={30} />
    ) : actionPending === Action.DEFEND ? (
      <Shield size={30} />
    ) : actionPending === Action.CHARGE ? (
      <Battery size={30} />
    ) : null;
  return (
    <div
      className={`h-28 md:h-40 rounded flex items-center justify-center text-slate-300 border border-white/10 ${
        who === "player" ? "bg-indigo-500/10" : "bg-fuchsia-500/10"
      }`}
    >
      {icon || <span className="text-xs opacity-40">En attente...</span>}
    </div>
  );
}