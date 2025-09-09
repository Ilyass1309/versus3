// src/hooks/useLobby.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type RawRoom = Record<string, unknown>;
export type Room = {
  id?: string;
  host?: string;
  players: string[];
  status?: string;
  createdAt?: number;
};

function parsePlayersField(obj: RawRoom): string[] {
  if (!obj || typeof obj !== "object") return [];
  const raw = (obj.players ?? obj.players_list ?? obj.playersArray) as unknown;
  if (Array.isArray(raw)) return raw.map((v) => String(v));
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch {
      return [];
    }
  }
  return [];
}

function getStringField(obj: RawRoom, ...keys: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

/**
 * useLobby - fetches /api/match/list and exposes helper actions.
 * - myNick: user's nickname (can be null)
 */
export function useLobby(myNick: string | null) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const MAX_PLAYERS = 2;

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/match/list");
      const body = await res.json().catch(() => ({}));
      const raw = (body?.rooms ?? body?.matches ?? body?.list ?? body) as unknown;
      const arr = Array.isArray(raw) ? (raw as RawRoom[]) : [];
      const parsed = arr.map((r) => {
        const players = parsePlayersField(r);
        return {
          id: getStringField(r, "id", "matchId", "match_id"),
          host:
            getStringField(r, "createdBy", "createdByName", "host", "host_nickname", "owner", "name") ??
            (players[0] ?? "invité"),
          players,
          status: getStringField(r, "status", "state") ?? "open",
          createdAt: (r?.createdAt as number) ?? undefined,
        } as Room;
      });
      setRooms(parsed);
    } catch (e) {
      console.error("[useLobby] fetchRooms error", e);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    // initial + polling
    fetchRooms();
    const iv = setInterval(() => {
      if (mounted) fetchRooms();
    }, 4000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [fetchRooms]);

  const visibleRooms = useMemo(
    () => rooms.filter((r) => (r.status ?? "open") === "open" && r.players.length < MAX_PLAYERS),
    [rooms],
  );

  const hasOwnRoom = useMemo(() => {
    if (!myNick) return false;
    return rooms.some((r) => {
      if (!r.players) return false;
      if (r.host === myNick) return true;
      return r.players.includes(myNick);
    });
  }, [rooms, myNick]);

  const refreshRooms = useCallback(async () => {
    await fetchRooms();
  }, [fetchRooms]);

  // quickJoin returns an id (first visible) or throws
  const quickJoin = useCallback(async (): Promise<string> => {
    const first = visibleRooms[0];
    if (!first || !first.id) throw new Error("no_room");
    return first.id;
  }, [visibleRooms]);

  // leave & delete own room (call existing API)
  const leaveAndDeleteOwn = useCallback(async (): Promise<boolean> => {
    if (!myNick) return false;
    // find own room by host
    const own = rooms.find((r) => r.host === myNick || r.players.includes(myNick));
    if (!own || !own.id) return false;
    try {
      const res = await fetch("/api/match/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: own.id, playerId: myNick }),
      });
      if (!res.ok) return false;
      // refresh local list
      await fetchRooms();
      return true;
    } catch {
      return false;
    }
  }, [myNick, rooms, fetchRooms]);

  return {
    rooms,
    loading,
    visibleRooms,
    hasOwnRoom,
    refreshRooms,
    quickJoin,
    leaveAndDeleteOwn,
    MAX_PLAYERS,
  };
}
