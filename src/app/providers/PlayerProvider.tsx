"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

interface PlayerCtx {
  nickname: string | null;
  setNickname: (n: string) => void;
  clearNickname: () => void;
}

const PlayerContext = createContext<PlayerCtx | undefined>(undefined);

const NICK_KEY = "playerName";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [nickname, setNicknameState] = useState<string | null>(null);

  // Hydratation initiale
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NICK_KEY);
      if (stored) setNicknameState(stored);
    } catch {}
  }, []);

  const setNickname = useCallback((n: string) => {
    setNicknameState(n);
    try { localStorage.setItem(NICK_KEY, n); } catch {}
  }, []);

  const clearNickname = useCallback(() => {
    setNicknameState(null);
    try { localStorage.removeItem(NICK_KEY); } catch {}
  }, []);

  return (
    <PlayerContext.Provider value={{ nickname, setNickname, clearNickname }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>");
  return ctx;
}