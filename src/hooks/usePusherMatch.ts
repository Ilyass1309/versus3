"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type Pusher from "pusher-js";
import { matchChannel } from "@/lib/pusher-channel";
import { getPusher } from "@/lib/pusher-client";

interface ResolutionEvent {
  turn: number;
  reveal: Record<string, { action: number; spend: number }>;
  hp: { p: number; e: number };
  charge: { p: number; e: number };
  done: boolean;
  result: string | null;
}

interface StateEvent {
  id: string;
  turn: number;
  phase: string;
  hp: { p: number; e: number };
  charge: { p: number; e: number };
  players?: string[];
  actions?: string[];
}

// Alias pour cohérence interne
type MatchState = StateEvent;

export function usePusherMatch(matchId: string | null) {
  const [playerId, setPlayerId] = useState<string>("");
  const [state, setState] = useState<MatchState | null>(null);
  const [resolving, setResolving] = useState(false);
  const [reveal, setReveal] = useState<ResolutionEvent | null>(null);
  const joinedRef = useRef(false);

  // reset le flag quand on change de match
  useEffect(() => {
    joinedRef.current = false;
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;

    let p: Pusher;
    try {
      p = getPusher();
    } catch (e) {
      console.warn("[pusher] init error:", (e as Error).message);
      return;
    }

    const channelName = matchChannel(matchId);
    const ch = p.subscribe(channelName);

    // Set player id when connected/subscribed
    const onConnected = () => {
      if (!cancelled && p.connection.socket_id) {
        setPlayerId(p.connection.socket_id);
      }
    };
    p.connection.bind("connected", onConnected);
    ch.bind("pusher:subscription_succeeded", onConnected);

    const onState = (s: StateEvent) => {
      if (cancelled) return;
      setState(s);
      setResolving(false);
    };
    const onResolution = (r: ResolutionEvent) => {
      if (cancelled) return;
      setReveal(r);
      setResolving(true);
      if (r.done) setTimeout(() => !cancelled && setResolving(false), 800);
    };

    ch.bind("state", onState);
    ch.bind("resolution", onResolution);

    return () => {
      cancelled = true;
      ch.unbind("state", onState);
      ch.unbind("resolution", onResolution);
      ch.unbind("pusher:subscription_succeeded", onConnected);
      p.connection.unbind("connected", onConnected);
      try {
        if (p.connection.state === "connected") p.unsubscribe(channelName);
      } catch {}
    };
  }, [matchId]);

  // auto-join dès qu’on a matchId + playerId
  useEffect(() => {
    if (!matchId || !playerId || joinedRef.current) return;
    joinedRef.current = true;
    fetch("/api/match/join", { method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ matchId, playerId }) })
    .catch(() => { joinedRef.current = false; });
  }, [matchId, playerId]);

  const sendAction = useCallback(
    async (action: number, spend?: number) => {
      if (!matchId || !playerId) return;

      // Détermine mon côté pour lire la charge
      const mySide: "p" | "e" | null = (() => {
        const idx = state?.players?.indexOf?.(playerId) ?? -1;
        return idx === 0 ? "p" : idx === 1 ? "e" : null;
      })();

      // spend par défaut: 1 si attaque et assez de charge
      let s = spend;
      if ((s == null || s <= 0) && action === 0) {
        const ch = mySide === "p" ? state?.charge?.p ?? 0 : mySide === "e" ? state?.charge?.e ?? 0 : 0;
        s = ch > 0 ? 1 : 0;
      }

      await fetch("/api/match/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, playerId, action, spend: s ?? 0 }),
      });
    },
    [matchId, playerId, state]
  );

  const isJoined = !!(state?.players?.includes?.(playerId));
  const mySide = useMemo<"p" | "e" | null>(() => {
    const idx = state?.players?.indexOf?.(playerId) ?? -1;
    return idx === 0 ? "p" : idx === 1 ? "e" : null;
  }, [state?.players, playerId]);

  return { playerId, state, resolving, reveal, sendAction, isJoined, mySide };
}