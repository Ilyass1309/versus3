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
import type { Room } from "@/types/lobby";

export default function MultiplayerPage() {
  const router = useRouter();
  const [myNick, setMyNick] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") setMyNick(localStorage.getItem("nickname"));
  }, []);

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
        await joinMatch(id, playerId);

        // redirect the user to the room page after a successful join
        router.push(`/multiplayer/${id}`);

        // still refresh lobby list as a best-effort
        await refreshRooms();
      } catch (e) {
        setRoomMessage("Erreur join : " + (e instanceof Error ? e.message : "server"));
      } finally {
        setRoomLoading(false);
      }
    },
    [hasOwnRoom, myNick, quickJoin, refreshRooms, router],
  );

  // normalize rooms coming from useLobby (types differ between hook and types/lobby)
  const normalizedRooms = useMemo(() => {
    return (rooms as any[])
      .map((r: any) => ({
        id: String(r.id ?? r.matchId ?? r.match_id ?? ""),
        host: String(r.host ?? r.owner ?? (r.players?.[0] ?? "invité")),
        players: Array.isArray(r.players) ? r.players.map(String) : [],
        status: String(r.status ?? "open"),
      }))
      .filter((r) => r.id.length > 0);
  }, [rooms]);

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
