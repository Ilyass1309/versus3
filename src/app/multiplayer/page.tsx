"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GameShell } from "@/app/components/game/GameShell";
import { useLobby } from "@/hooks/useLobby";
import { createMatch, joinMatch, deleteMatch } from "@/lib/lobbyApi";
import { RoomsTable } from "@/app/components/multiplayer/RoomsTable";
import { LobbyControls } from "@/app/components/multiplayer/LobbyControls";
import { Leaderboard } from "@/app/components/multiplayer/Leaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { getPusher } from "@/lib/pusher-client";
import { matchChannel } from "@/lib/pusher-channel";
import type { Room as LobbyRoom } from "@/types/lobby";
type PusherLike = { channel?: (n: string) => ChannelLike | null; subscribe?: (n: string) => ChannelLike; unsubscribe?: (n: string) => void; connection?: { state?: string; bind?: (ev: string, cb: () => void) => void } };
type ChannelLike = { bind: (e: string, cb: (p?: unknown) => void) => void; unbind: (e: string, cb: (p?: unknown) => void) => void };

export default function MultiplayerPage() {
  const router = useRouter();
  const [myNick, setMyNick] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") setMyNick(localStorage.getItem("nickname"));
  }, []);

  useEffect(() => {
    console.debug("[MultiplayerPage] myNick =", myNick);
  }, [myNick]);

  const {
    rooms,
    loading: roomsLoading,
    hasOwnRoom,
    refreshRooms,
    quickJoin,
    MAX_PLAYERS,
  } = useLobby(myNick);
  const { leaderboard, loading: lbLoading, error: lbError, refresh: refreshLeaderboard } = useLeaderboard();

  const [roomLoading, setRoomLoading] = useState(false);
  const [roomMessage, setRoomMessage] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (hasOwnRoom) return setRoomMessage("Vous avez déjà une salle ouverte");
    setRoomLoading(true);
    setRoomMessage(null);
    try {
      const id = await createMatch(myNick ?? "guest");
      console.info("[MultiplayerPage] created match", id, "by", myNick);
      setRoomMessage("Salle créée: " + id);
      await refreshRooms();
    } catch (e) {
      setRoomMessage("Erreur création : " + (e instanceof Error ? e.message : "server"));
    } finally {
      setRoomLoading(false);
    }
  }, [hasOwnRoom, myNick, refreshRooms]);

  const handleJoin = useCallback(
    async (roomId?: string) => {
      if (hasOwnRoom) return setRoomMessage("Vous avez déjà une salle ouverte");
      setRoomLoading(true);
      setRoomMessage(null);
      try {
        const id = roomId ?? (await quickJoin());
        const playerId = myNick ?? Math.random().toString(36).slice(2, 8);
        console.info("[MultiplayerPage] joining match", id, "as", playerId);
        await joinMatch(id, playerId);

        // redirect the user to the room page after a successful join
        router.push(`/multiplayer/${id}`);

        // still refresh lobby list as a best-effort
        await refreshRooms();
      } catch (e) {
        setRoomMessage("Erreur join : " + (e instanceof Error ? e.message : "server"));
        console.error("[MultiplayerPage] join error", e);
      } finally {
        setRoomLoading(false);
      }
    },
    [hasOwnRoom, myNick, quickJoin, refreshRooms, router],
  );

  // normalize rooms coming from useLobby (types may differ between hook and types/lobby)
  function normalizeRoom(raw: unknown): LobbyRoom | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;

    const idRaw = obj.id ?? obj.matchId ?? obj.match_id;
    const id = typeof idRaw === "string" || typeof idRaw === "number" ? String(idRaw) : "";
    if (!id) return null;

    const playersRaw = obj.players;
    const players = Array.isArray(playersRaw)
      ? playersRaw.filter((p) => typeof p === "string" || typeof p === "number").map(String)
      : [];

    const hostRaw = obj.host ?? obj.owner ?? players[0];
    const host = typeof hostRaw === "string" ? hostRaw : String(hostRaw ?? "invité");

    const status = typeof obj.status === "string" ? obj.status : String(obj.status ?? "open");

    return { id, host, players, status };
  }

  const normalizedRooms = useMemo(() => {
    return (Array.isArray(rooms) ? rooms : []).map(normalizeRoom).filter((r): r is LobbyRoom => r !== null);
  }, [rooms]);

  useEffect(() => {
    console.debug("[MultiplayerPage] normalizedRooms", normalizedRooms);
  }, [normalizedRooms]);

  // Redirect creator from lobby to match page when someone joins their room
  useEffect(() => {
    // find own room id
    const own = normalizedRooms.find((r) => r.host === (myNick ?? "") || r.players.includes(myNick ?? ""));
    if (!own?.id) return;

    // use the same channel naming as server
    const channelName = matchChannel(own.id);
    let pusher: PusherLike | null = null;
    let channel: ChannelLike | null = null;

    try {
      pusher = getPusher() as PusherLike;
      channel = (pusher.channel ? pusher.channel(channelName) : null) ?? (pusher.subscribe ? pusher.subscribe(channelName) : null);
      console.debug("[MultiplayerPage] subscribed to", channelName, { pusherExists: !!pusher, channelExists: !!channel });
    } catch {
      pusher = null;
      channel = null;
    }

    // handle state events (authoritative): redirect when server state shows room full
    const onStateEvent = (s: { players?: string[] } | unknown) => {
      try {
        console.info("[MultiplayerPage] received state event", channelName, s);
        const players = (() => {
          if (!s || typeof s !== "object") return [] as string[];
          const obj = s as Record<string, unknown>;
          const p = obj.players;
          if (Array.isArray(p)) return p.map(String);
          return [] as string[];
        })();
        if (players.length >= MAX_PLAYERS) {
          console.info("[MultiplayerPage] state indicates room is full, redirecting to match", own.id);
          router.push(`/multiplayer/${own.id}`);
        } else {
          console.debug("[MultiplayerPage] state players count", players.length);
        }
      } catch (e) {
        console.error("[MultiplayerPage] onStateEvent error", e);
      }
    };

    // keep player_joined for logging but use state as the source of truth for redirect
    const onPlayerJoined = (payload?: unknown) => {
      console.info("[MultiplayerPage] player_joined payload", channelName, payload);
    };

    if (channel) {
      channel.bind("state", onStateEvent);
      channel.bind("player_joined", onPlayerJoined);
      channel.bind("match_started", onStateEvent);
    }

    return () => {
      try {
        if (channel) {
          channel.unbind("player_joined", onPlayerJoined);
          channel.unbind("match_started", onStateEvent);
          channel.unbind("state", onStateEvent);
        }
        if (pusher) {
          try { pusher.unsubscribe?.(channelName); } catch {}
        }
      } catch (e) {
        console.warn("[MultiplayerPage] cleanup error", e);
      }
    };
  }, [normalizedRooms, myNick, router, MAX_PLAYERS]);

  const handleDeleteOwn = useCallback(async () => {
    if (!confirm("Supprimer votre salle ?")) return;
    setRoomLoading(true);
    setRoomMessage(null);
    try {
      const own = normalizedRooms.find((r) => r.host === (myNick ?? "") || r.players.includes(myNick ?? ""));
      if (!own?.id) {
        setRoomMessage("Aucune salle à supprimer");
        return;
      }
      console.info("[MultiplayerPage] deleting own match", own.id);
      await deleteMatch(String(own.id), myNick ?? "");
      setRoomMessage("Salle supprimée");
      await refreshRooms();
    } catch (err) {
      setRoomMessage("Erreur suppression: " + (err instanceof Error ? err.message : "server"));
    } finally {
      setRoomLoading(false);
    }
  }, [normalizedRooms, myNick, refreshRooms]);

  return (
    <GameShell>
      <div className="w-full flex flex-col lg:flex-row gap-6 mt-4">
        <main className="flex-1 order-2 lg:order-2 bg-slate-900 text-slate-100 rounded-lg shadow-lg p-6 min-h-[60vh]">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Salle Multijoueur</h1>
              <p className="text-sm text-slate-400 mt-1">Rejoins ou crée une partie pour affronter d&apos;autres joueurs.</p>
            </div>

            {/* Return button */}
            <div>
              <button
                onClick={() => router.push("/game")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-rose-500 text-white font-semibold shadow-md hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400"
                aria-label="Retour au jeu"
              >
                Accueil
              </button>
            </div>
          </div>

          <LobbyControls
            hasOwnRoom={hasOwnRoom}
            roomLoading={roomLoading}
            visibleRooms={normalizedRooms}
            onCreate={handleCreate}
            onQuickJoin={() => handleJoin()}
            onDeleteOwn={handleDeleteOwn}
            message={roomMessage}
          />

          <RoomsTable
            rooms={normalizedRooms}
            roomsLoading={roomsLoading}
            maxPlayers={MAX_PLAYERS}
            roomLoading={roomLoading}
            onJoin={(id) => void handleJoin(id)}
            hasOwnRoom={hasOwnRoom}
          />
        </main>

        {/* Sidebar leaderboard */}
        <aside className="order-1 lg:order-1 lg:w-72 xl:w-80 shrink-0">
          <Leaderboard leaderboard={leaderboard} loading={lbLoading} error={lbError} onRefresh={refreshLeaderboard} />
        </aside>
      </div>
    </GameShell>
  );
}
