"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { useGameEngine } from "@/hooks/useGameEngine";
import { BattleEvent, Result } from "@/hooks/useGameEngine";

interface Settings {
  epsilon: number;
  volume: number;
  theme: "light" | "dark" | "system";
  setEpsilon: (e: number) => void;
  setVolume: (v: number) => void;
  setTheme: (t: Settings["theme"]) => void;
}

const SettingsCtx = createContext<Settings | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("Settings context");
  return ctx;
}

interface GameCtxType {
  engine: ReturnType<typeof useGameEngine>;
  events: BattleEvent[];
  result: Result | null;
}

const GameCtx = createContext<GameCtxType | null>(null);
export function useGame() {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error("Game context");
  return ctx;
}

export function GameShell({ children }: { children: React.ReactNode }) {
  const [epsilon, setEpsilon] = useState(0.05);
  const [volume, setVolume] = useState(0.6);
  const [theme, setTheme] = useState<Settings["theme"]>("system");
  const engine = useGameEngine({
    epsilon,
    onError: (m) => console.error(m),
  });

  const settings: Settings = {
    epsilon,
    volume,
    theme,
    setEpsilon: (e) => setEpsilon(e),
    setVolume: (v) => {
      setVolume(v);
      engine.setVolume(v);
    },
    setTheme: (t) => setTheme(t),
  };

  return (
    <SettingsCtx.Provider value={settings}>
      <GameCtx.Provider value={{ engine, events: engine.events, result: engine.result }}>
        <div className="min-h-dvh w-full flex flex-col items-center py-6 px-3 md:px-8">
          {children}
        </div>
      </GameCtx.Provider>
    </SettingsCtx.Provider>
  );
}