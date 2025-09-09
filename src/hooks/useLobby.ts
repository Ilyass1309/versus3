// hooks/useLobby.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room } from "@/types/lobby";
import { deleteMatch, listMatches } from "@/lib/lobbyApi";

const LOBBY_POLL_MS = 4000;
const MAX_PLAYERS = 2; // ajuste si la taille de tes matchs change

export function useLobby(myNick: string | null) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const refreshRooms = useCallback(async () => {
    try {
      setLoading(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const list = await listMatches();
      setRooms(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => mounted && (await refreshRooms()))();
    const id = setInterval(() => mounted && refreshRooms(), LOBBY_POLL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [refreshRooms]);

  const hasOwnRoom = useMemo(() => {
    if (!myNick) return false;
    return rooms.some((r) => r.host === myNick || r.players.includes(myNick));
  }, [rooms, myNick]);

  const visibleRooms = useMemo(
    () => rooms.filter((r) => r.status === "open" && r.players.length < MAX_PLAYERS),
    [rooms],
  );

  const leaveAndDeleteOwn = useCallback(async () => {
    if (!myNick) return false;
    const own = rooms.find((r) => r.host === myNick);
    if (!own) return false;
    await deleteMatch(own.id, myNick);
    await refreshRooms();
    return true;
  }, [rooms, myNick, refreshRooms]);

  const quickJoin = useCallback(async () => {
    const first = visibleRooms[0];
    if (!first) throw new Error("Aucune salle ouverte");
    return first.id;
  }, [visibleRooms]);

  return {
    rooms,
    loading,
    hasOwnRoom,
    visibleRooms,
    refreshRooms,
    leaveAndDeleteOwn,
    quickJoin,
    MAX_PLAYERS,
  };
}
