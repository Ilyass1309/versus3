"use client";
import { useGame } from "./GameShell";
import { BattleEvent } from "@/hooks/useGameEngine";
import { AnimatePresence, motion } from "framer-motion";
import { Sword, Shield, Battery } from "lucide-react";
import { Action } from "@/lib/rl/types";

// Ajouter util meta
function actionMeta(a: Action) {
  switch (a) {
    case Action.ATTACK:
      return {
        label: "Attaque",
        color: "bg-rose-600/80 border-rose-400/40 text-rose-50",
        icon: <Sword size={18} />,
      };
    case Action.DEFEND:
      return {
        label: "Défense",
        color: "bg-sky-600/80 border-sky-400/40 text-sky-50",
        icon: <Shield size={18} />,
      };
    case Action.CHARGE:
    default:
      return {
        label: "Charge",
        color: "bg-amber-500/80 border-amber-300/50 text-amber-900",
        icon: <Battery size={18} />,
      };
  }
}

function ChargePills({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 3 }, (_, i) => {
        const active = i < count;
        return (
          <span
            key={i}
            className={
              "h-3 w-3 rounded-sm transition-colors " +
              (active
                ? "bg-lime-400/80 shadow-[0_0_4px_#bef264]"
                : "bg-white/10")
            }
          />
        );
      })}
      <span className="ml-1 text-[10px] text-slate-400 tabular-nums">
        {count}/3
      </span>
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
  // Mapping cohérent: e* = joueur, p* = IA
  const playerHP = engine.state.eHP;
  const aiHP = engine.state.pHP;
  const playerCharge = engine.state.eCharge;
  const aiCharge = engine.state.pCharge;
  const lastTurn = events
    .filter(
      (e): e is Extract<BattleEvent, { type: "turn" }> => e.type === "turn"
    )
    .at(-1);
  const reveal = engine.lastReveal;

  return (
    <section
      aria-label="Aire de combat"
      className="relative w-full card-glass p-6 md:p-8 grid gap-8 md:grid-cols-2 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_28px_-8px_rgba(0,0,0,0.5)]"
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
      <div className="col-span-full mt-2 text-[11px] text-slate-400/80 flex justify-between tracking-wide">
        <span>
          Tour&nbsp;
          <span className="font-semibold text-slate-200">
            {lastTurn ? lastTurn.n : 0}
          </span>
        </span>
        <span className="hidden md:inline text-slate-500">
          Choisissez vos actions avec A / D / C puis Enter
        </span>
      </div>
      <AnimatePresence>
        {reveal && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-x-0 top-2 flex justify-center"
          >
            <div className="flex gap-4 rounded-xl backdrop-blur-md bg-slate-900/60 border border-white/10 px-5 py-3 shadow-lg">
              <RevealCard
                side="Vous"
                action={reveal.player.action}
                spend={reveal.player.spend}
              />
              <RevealCard
                side="IA"
                action={reveal.ai.action}
                spend={reveal.ai.spend}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

function RevealCard({
  side,
  action,
  spend,
}: {
  side: string;
  action: Action;
  spend: number;
}) {
  const meta = actionMeta(action);
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${meta.color}`}
    >
      <span className="flex items-center gap-1">
        {meta.icon}
        {side}
      </span>
      <span className="opacity-70">•</span>
      <span>
        {meta.label}
        {action === Action.ATTACK && spend > 1 && (
          <span className="ml-1 font-semibold">×{spend}</span>
        )}
      </span>
    </div>
  );
}