"use client";
import { useGame } from "./GameShell";
import { motion, AnimatePresence } from "framer-motion";
import { Action } from "@/lib/rl/types";
import { Sword, Shield, Battery } from "lucide-react";

function ChargePills({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
            className={`h-3 w-5 rounded-sm border border-white/15 ${i < count ? "bg-indigo-500" : "bg-white/5"}`}
        />
      ))}
    </div>
  );
}

function HPBar({ ratio, label }: { ratio: number; label: string }) {
  const pct = (ratio * 100).toFixed(1) + "%";
  const gradient =
    ratio > 0.66 ? "from-emerald-500 to-emerald-400" :
    ratio > 0.33 ? "from-amber-500 to-amber-400" :
      "from-rose-600 to-rose-500";
  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] mb-0.5 font-medium text-slate-300">
        <span>{label}</span>
        <span>{pct}</span>
      </div>
      <div className="h-4 w-full rounded bg-white/10 overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: pct }}
          className={`h-full bg-gradient-to-r ${gradient}`}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>
    </div>
  );
}

export function Arena() {
  const { engine, events } = useGame();
  const lastTurn = events.filter(e => e.type === "turn").at(-1);
  const damageEvents = events.filter(e => e.type === "attack").slice(-4);

  return (
    <section
      aria-label="Aire de combat"
      className="relative w-full max-w-5xl glass p-6 md:p-10 grid gap-8 md:grid-cols-2"
    >
      <div className="flex flex-col gap-4 justify-between">
        <div>
          <HPBar ratio={engine.hpRatioPlayer} label="Vous" />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
            <span>Charge</span>
            <ChargePills count={engine.state.pCharge} />
          </div>
        </div>
        <FighterSprite who="player" actionPending={engine.playerPending} />
      </div>

      <div className="flex flex-col gap-4 justify-between">
        <div className="text-right">
          <HPBar ratio={engine.hpRatioAI} label="Adversaire" />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
            <ChargePills count={engine.state.eCharge} />
            <span>Charge</span>
          </div>
        </div>
        <FighterSprite who="ai" actionPending={null} />
      </div>

      <AnimatePresence>
        {damageEvents.map((ev, i) => (
          <motion.div
            key={i + "-" + ev.who + "-" + ev.dmg}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: -10 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6 }}
            className={`absolute text-sm font-bold ${
              ev.who === "ai" ? "left-10 top-16 text-rose-400" : "right-10 bottom-16 text-rose-400"
            } pointer-events-none`}
          >
            -{ev.dmg}
          </motion.div>
        ))}
      </AnimatePresence>

      {lastTurn && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-medium tracking-wide text-slate-300">
          Tour {lastTurn.n}
        </div>
      )}
    </section>
  );
}

function FighterSprite({ who, actionPending }: { who: "player" | "ai"; actionPending: Action | null }) {
  const icon =
    actionPending === Action.ATTACK ? <Sword size={30} /> :
    actionPending === Action.DEFEND ? <Shield size={30} /> :
    actionPending === Action.CHARGE ? <Battery size={30} /> :
      null;
  return (
    <motion.div
      layout
      className="relative aspect-[4/3] w-full rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-white/10 flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent_60%)]" />
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        className="w-28 h-28 rounded-full bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center"
      >
        <div className="w-20 h-20 rounded-full bg-indigo-400/40 backdrop-blur-sm flex items-center justify-center text-indigo-100 text-lg font-semibold">
          {who === "player" ? "YOU" : "AI"}
        </div>
      </motion.div>
      {icon && (
        <motion.div
          key={actionPending}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.9 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
          className="absolute bottom-2 right-2 text-indigo-200"
        >
          {icon}
        </motion.div>
      )}
    </motion.div>
  );
}