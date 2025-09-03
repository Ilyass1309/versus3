"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

type PlayerContext = { nickname: string | null; setNickname: (n: string | null) => void };
const Ctx = createContext<PlayerContext | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [nickname, setNick] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem("player:nickname");
      if (v) setNick(v);
    } catch {}
  }, []);

  const setNickname = useCallback((n: string | null) => {
    setNick(n);
    try {
      if (n) localStorage.setItem("player:nickname", n);
      else localStorage.removeItem("player:nickname");
    } catch {}
  }, []);

  return <Ctx.Provider value={{ nickname, setNickname }}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer outside provider");
  return v;
}