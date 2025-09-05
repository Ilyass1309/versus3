"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Pusher from "pusher-js";
import { matchChannel } from "@/lib/pusher-channel";

interface MatchState {
  id: string;
  turn: number;
  phase: string;
  hp?: { p: number; e: number };
  charge?: { p: number; e: number };
  players?: string[];
  actions?: string[];
  result?: string | null;
}

export function usePusherMatch(matchId: string | null) {
  const [playerId, setPlayerId] = useState<string>("");
  const [state, setState] = useState<MatchState | null>(null);
  const [resolving, setResolving] = useState(false);
  const [reveal, setReveal] = useState<any>(null);
  const pRef = useRef<Pusher | null>(null);

  useEffect(() => {
    if (!matchId) return;
    const p = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      authEndpoint: "/api/pusher/auth",
    });
    pRef.current = p;
    const ch = p.subscribe(matchChannel(matchId));
    ch.bind("pusher:subscription_succeeded", (m: any) => {
      if (m?.user_id) setPlayerId(m.user_id);
    });
    ch.bind("meta", () => {});
    ch.bind("partial", () => {});
    ch.bind("state", (s: any) => {
      setState(s);
      setResolving(false);
    });
    ch.bind("resolution", (r: any) => {
      setReveal(r);
      setResolving(true);
      if (r.done) setTimeout(()=> setResolving(false), 800);
    });
    return () => {
      p.unsubscribe(matchChannel(matchId));
      p.disconnect();
    };
  }, [matchId]);

  const join = useCallback(async () => {
    if (!matchId || !playerId) return;
    await fetch("/api/match/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, playerId }),
    });
  }, [matchId, playerId]);

  const sendAction = useCallback(async (action: number, spend = 0) => {
    if (!matchId || !playerId) return;
    await fetch("/api/match/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, playerId, action, spend }),
    });
  }, [matchId, playerId]);

  return { playerId, state, resolving, reveal, join, sendAction };
}