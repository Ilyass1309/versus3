"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type User = { id: string; nickname: string };

type Ctx = {
  user: User | null;
  token: string | null;
  setUser: (u: User | null) => void;
  setAuth: (token: string, user: User | { id: string; name?: string; nickname?: string }) => void;
  logout: () => void;
};

const Ctx = createContext<Ctx>({
  user: null,
  token: null,
  setUser: () => {},
  setAuth: () => {},
  logout: () => {},
});

function normalizeUser(u: any): User {
  return { id: String(u?.id ?? ""), nickname: String(u?.nickname ?? u?.name ?? "") };
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
        const parsed = JSON.parse(raw);
        const nu = normalizeUser(parsed);
        if (nu.id && nu.nickname) _setUser(nu);
      }
    } catch {}
  }, []);

  function setUser(u: User | null) {
    _setUser(u);
    if (!u) {
      localStorage.removeItem("user");
      return;
    }
    localStorage.setItem("user", JSON.stringify(u));
  }

  function setAuth(t: string, u: User | { id: string; name?: string; nickname?: string }) {
    const nu = normalizeUser(u);
    setToken(t);
    _setUser(nu);
    localStorage.setItem("access_token", t);
    localStorage.setItem("user", JSON.stringify(nu));
  }

  function logout() {
    setToken(null);
    _setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  }

  const value = useMemo(() => ({ user, token, setUser, setAuth, logout }), [user, token]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  return useContext(Ctx);
}