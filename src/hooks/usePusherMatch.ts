"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Pusher from "pusher-js";
import { matchChannel } from "@/lib/pusher-channel";

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
  const pRef = useRef<Pusher | null>(null);

  useEffect(() => {
    if (!matchId) return;
    const p = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      authEndpoint: "/api/pusher/auth",
    });
    pRef.current = p;
    const ch = p.subscribe(matchChannel(matchId));

    // Pour un canal "private-" pas de payload utile : on utilise socket_id comme identifiant local
    ch.bind("pusher:subscription_succeeded", () => {
      if (!playerId) {
        setPlayerId(p.connection.socket_id);
      }
    });

    ch.bind("state", (s: StateEvent) => {
      setState(s);
      setResolving(false);
    });
    ch.bind("resolution", (r: ResolutionEvent) => {
      setReveal(r);
      setResolving(true);
      if (r.done) setTimeout(() => setResolving(false), 800);
    });

    return () => {
      p.unsubscribe(matchChannel(matchId));
      p.disconnect();
    };
  }, [matchId, playerId]);

  const join = useCallback(async () => {
    if (!matchId || !playerId) return;
    await fetch("/api/match/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, playerId }),
    });
  }, [matchId, playerId]);

  const sendAction = useCallback(
    async (action: number, spend = 0) => {
      if (!matchId || !playerId) return;
      await fetch("/api/match/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, playerId, action, spend }),
      });
    },
    [matchId, playerId]
  );

  return { playerId, state, resolving, reveal, join, sendAction };
}