// Pas de "use client" (les sous-composants le déclarent déjà)
// Optionnel si tu veux éviter le prerender strict: export const dynamic = "force-dynamic";

import { GameShell } from "./components/game/GameShell";
import { GameHeader } from "./components/game/GameHeader";
import { Arena } from "./components/game/Arena";
import { ActionBar } from "./components/game/ActionBar";
import { BattleLog } from "./components/game/BattleLog";
import { ResultDialog } from "./components/game/ResultDialog";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useState } from "react";
import { Logo } from "./components/ui/Logo";
import { Particles } from "./components/ui/Particles";
import { PressAnyKey } from "./components/ui/PressAnyKey";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const r = useRouter();
  const [leaving, setLeaving] = useState(false);

  const start = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => r.push("/nickname"), 550);
  }, [leaving, r]);

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
      <div className="relative min-h-dvh overflow-hidden flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#312e81,#111827_60%)] text-slate-100">
        <Particles />
        <AnimatePresence>
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -10 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center text-center px-6"
          >
            <Logo className="w-28 h-28 drop-shadow-[0_0_12px_#818cf880]" />
            <h1 className="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-pink-300">
              VERSUS III
            </h1>
            <p className="mt-4 max-w-md text-slate-300/90 leading-relaxed">
              Un duel tactique éclair. Chargez. Défendez. Frappez. Maîtrisez le rythme.
            </p>
            <PressAnyKey onStart={start} />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 backdrop-[filter:blur(40px)_brightness(0.85)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#6366f122,#8b5cf622_30%,#ec489922)] mix-blend-overlay" />
      </div>
    </GameShell>
  );
}
