"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Pusher, { Options } from "pusher-js";
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

function getPusherOptions(): Options {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!key) throw new Error("Missing NEXT_PUBLIC_PUSHER_KEY");
  const cluster = (process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu") as string;
  return {
    cluster,
    authEndpoint: "/api/pusher/auth",
  };
}

export function usePusherMatch(matchId: string | null) {
  const [playerId, setPlayerId] = useState<string>("");
  const [state, setState] = useState<MatchState | null>(null);
  const [resolving, setResolving] = useState(false);
  const [reveal, setReveal] = useState<ResolutionEvent | null>(null);
  const pRef = useRef<Pusher | null>(null);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;

    let pusher: Pusher;
    try {
      const opts = getPusherOptions();
      pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY as string, opts);
    } catch (e) {
      console.error("[pusher] init error:", (e as Error).message);
      return;
    }
    pRef.current = pusher;
    const channelName = matchChannel(matchId);
    const ch = pusher.subscribe(channelName);

    ch.bind("pusher:subscription_succeeded", () => {
      if (!cancelled && !playerId) setPlayerId(pusher.connection.socket_id);
    });

    ch.bind("state", (s: StateEvent) => {
      if (cancelled) return;
      setState(s);
      setResolving(false);
    });

    ch.bind("resolution", (r: ResolutionEvent) => {
      if (cancelled) return;
      setReveal(r);
      setResolving(true);
      if (r.done) setTimeout(() => !cancelled && setResolving(false), 800);
    });

    return () => {
      cancelled = true;
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
    // playerId intentionally excluded so we don't reconnect when it updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

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