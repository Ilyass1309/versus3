"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface PlayerCtx {
  user: { id: number; nickname: string } | null;
  loading: boolean;
  refresh(): Promise<void>;
  setUser(u: { id: number; nickname: string } | null): void;
}

const PlayerContext = createContext<PlayerCtx | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PlayerCtx["user"]>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setUser(json.user);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <PlayerContext.Provider value={{ user, loading, refresh, setUser }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}