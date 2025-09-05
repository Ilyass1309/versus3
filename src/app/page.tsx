"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useState } from "react";
import { Logo } from "./components/ui/Logo";
import { Particles } from "./components/ui/Particles";
import { PressAnyKey } from "./components/ui/PressAnyKey";
import { RulesDialog } from "./components/ui/RulesDialog";

export default function LandingPage() {
  const r = useRouter();
  const [leaving, setLeaving] = useState(false);

  const start = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => r.push("/nickname"), 550);
  }, [leaving, r]);

  return (
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
          <div className="mt-6 flex flex-col items-center gap-4">
            <PressAnyKey onStart={start} />
            <RulesDialog />
            <a
              href="/rules"
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Page complète des règles
            </a>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 backdrop-[filter:blur(40px)_brightness(0.85)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(45deg,#6366f122,#8b5cf622_30%,#ec489922)] mix-blend-overlay" />
    </div>
  );
}