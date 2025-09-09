"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setStoredNickname } from "@/lib/lobbyApi";

export type User = { id: string; nickname: string };

type Ctx = {
  user: User | null;
  token: string | null;
  setUser: (u: User | null) => void;
  setAuth: (
    token: string,
    user: User | { id: string; name?: string; nickname?: string }
  ) => void;
  logout: () => void;
};

const Ctx = createContext<Ctx>({
  user: null,
  token: null,
  setUser: () => {},
  setAuth: () => {},
  logout: () => {},
});

function normalizeUser(u: unknown): User {
  if (!u || typeof u !== "object") return { id: "", nickname: "" };
  const rec = u as Record<string, unknown>;
  const id =
    typeof rec.id === "string" ? rec.id : rec.id != null ? String(rec.id) : "";
  const nickname =
    typeof rec.nickname === "string"
      ? rec.nickname
      : typeof rec.name === "string"
      ? rec.name
      : "";
  return { id, nickname };
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [user, _setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem("access_token");
      const raw = localStorage.getItem("user");
      if (t) setToken(t);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        const nu = normalizeUser(parsed);
        if (nu.id && nu.nickname) {
          _setUser(nu);
          // ensure nickname persisted for lobby APIs
          try {
            if (nu.nickname) setStoredNickname(nu.nickname);
          } catch {}
        }
      }
    } catch {}
  }, []);

  function setUser(u: User | null) {
    _setUser(u);
    if (u) {
      localStorage.setItem("user", JSON.stringify(u));
      // persist nickname for lobby usage
      try {
        if (u.nickname) setStoredNickname(u.nickname);
      } catch {}
    } else {
      localStorage.removeItem("user");
    }
  }

  function setAuth(
    t: string,
    u: User | { id: string; name?: string; nickname?: string }
  ) {
    const nu = normalizeUser(u);
    setToken(t);
    _setUser(nu);
    localStorage.setItem("access_token", t);
    localStorage.setItem("user", JSON.stringify(nu));
    // persist nickname for lobby usage
    try {
      if (nu.nickname) setStoredNickname(nu.nickname);
    } catch {}
  }

  function logout() {
    setToken(null);
    _setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    // optionally clear nickname cookie/localStorage - keep it if you prefer
    // localStorage.removeItem("nickname");
    // document.cookie = "nickname=; Path=/; Max-Age=0";
  }

  const value = useMemo(
    () => ({ user, token, setUser, setAuth, logout }),
    [user, token]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  return useContext(Ctx);
}