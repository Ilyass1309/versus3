"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameShell } from "@/app/components/game/GameShell";
import { useLobby } from "@/hooks/useLobby";
import { createMatch, fetchLeaderboard, joinMatch, deleteMatch } from "@/lib/lobbyApi";
import type { ScoreRow } from "@/types/lobby";

export default function MultiplayerPage() {
  const router = useRouter();

  // nickname
  const [myNick, setMyNick] = useState<string | null>(null);
  useEffect(() => {
    setMyNick(typeof window !== "undefined" ? localStorage.getItem("nickname") : null);
  }, []);

  // lobby (rooms) — NE PAS déstructurer `rooms` pour éviter le warning unused
  const {
    rooms,
    loading: roomsLoading,
    hasOwnRoom,
    visibleRooms,
    refreshRooms,
    leaveAndDeleteOwn,
    quickJoin,
    MAX_PLAYERS,
  } = useLobby(myNick);

  // leaderboard
  const [leaderboard, setLeaderboard] = useState<ScoreRow[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [lbError, setLbError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLbLoading(true);
        const list = await fetchLeaderboard();
        if (mounted) {
          setLeaderboard(list);
          setLbError(null);
        }
      } catch {
        if (mounted) setLbError("Impossible de charger le classement");
      } finally {
        if (mounted) setLbLoading(false);
      }
    };
    run();
    const iv = setInterval(run, 30_000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  // messages & loading pour les actions
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
    } catch (e: unknown) {
      setRoomMessage(
        "Erreur création : " + (e instanceof Error ? e.message : "server"),
      );
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
        setRoomMessage("Rejoint: " + id);
        await refreshRooms();
      } catch (e: unknown) {
        setRoomMessage("Erreur join : " + (e instanceof Error ? e.message : "server"));
      } finally {
        setRoomLoading(false);
      }
    },
    [hasOwnRoom, myNick, quickJoin, refreshRooms],
  );

  const handleDeleteOwn = useCallback(async () => {
    if (!confirm("Supprimer votre salle ?")) return;
    setRoomLoading(true);
    setRoomMessage(null);
    try {
      // determine own room reliably from local rooms state
      const own = rooms.find((r) => r.host === myNick || r.players.includes(myNick ?? ""));
      if (!own || !own.id) {
        setRoomMessage("Aucune salle à supprimer");
        return;
      }

      // call API directly and refresh list
      await deleteMatch(own.id, myNick ?? "");
      setRoomMessage("Salle supprimée");
      await refreshRooms();
    } catch (err: unknown) {
      setRoomMessage("Erreur suppression: " + (err instanceof Error ? err.message : "server"));
    } finally {
      setRoomLoading(false);
    }
  }, [leaveAndDeleteOwn]);

  return (
    <GameShell>
      <div className="w-full flex flex-col lg:flex-row gap-6 mt-4">
        {/* Main lobby area */}
        <main className="flex-1 order-2 lg:order-2 bg-slate-900 text-slate-100 rounded-lg shadow-lg p-6 min-h-[60vh]">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Salle Multijoueur</h1>
              <p className="text-sm text-slate-400 mt-1">
                Rejoins ou crée une partie pour affronter d&apos;autres joueurs.
              </p>
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

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              onClick={handleCreate}
              disabled={roomLoading || hasOwnRoom}
              aria-busy={roomLoading}
              className="px-4 py-2 rounded bg-indigo-500 text-white font-medium hover:bg-indigo-600 disabled:opacity-50"
            >
              {roomLoading ? "Chargement..." : "Créer une partie"}
            </button>

            <button
              onClick={() => {
                const first = visibleRooms[0];
                if (first) handleJoin(first.id);
                else setRoomMessage("Aucune salle ouverte pour rejoindre");
              }}
              disabled={roomLoading || hasOwnRoom || visibleRooms.length === 0}
              aria-busy={roomLoading}
              className="px-4 py-2 rounded bg-emerald-500 text-black font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              {roomLoading ? "Chargement..." : "Rejoindre une partie"}
            </button>

            {hasOwnRoom && (
              <button
                onClick={handleDeleteOwn}
                disabled={roomLoading}
                aria-busy={roomLoading}
                className="px-4 py-2 rounded bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50"
              >
                Supprimer ma salle
              </button>
            )}
          </div>

          {/* Rooms table */}
          <section className="mb-6 rounded-md border border-slate-800 p-4 bg-gradient-to-b from-slate-850 via-slate-900 to-slate-950">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-slate-100">Salles disponibles</h3>
              <div className="text-sm text-slate-400">
                {roomsLoading ? "Chargement..." : `${rooms.length} salle(s)`}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-left">
                    <th className="pb-2">Hôte</th>
                    <th className="pb-2">Joueurs</th>
                    <th className="pb-2">Statut</th>
                    <th className="pb-2">Code</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-slate-400">
                        Aucune salle
                      </td>
                    </tr>
                  ) : (
                    rooms.map((r) => {
                      const players = r.players;
                      const host = r.host || (players[0] ?? "invité");
                      const status = (r.status ?? "open").toString();
                      const canJoin =
                        status.toLowerCase() !== "closed" &&
                        players.length < MAX_PLAYERS &&
                        !hasOwnRoom;

                      return (
                        <tr key={r.id} className="border-t border-slate-800">
                          <td className="py-3">{host}</td>
                          <td className="py-3">
                            {players.length}/{MAX_PLAYERS}
                          </td>
                          <td className="py-3">{status}</td>
                          <td className="py-3 font-mono">{r.id}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => canJoin && handleJoin(r.id)}
                              disabled={!canJoin || roomLoading}
                              aria-busy={roomLoading}
                              className="px-3 py-1 rounded bg-emerald-500 text-black font-medium hover:bg-emerald-600 disabled:opacity-50"
                            >
                              {roomLoading ? "..." : "Rejoindre"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        {/* Sidebar leaderboard */}
        <aside className="order-1 lg:order-1 lg:w-72 xl:w-80 shrink-0">
          <div className="bg-slate-900 text-slate-100 rounded-lg shadow-lg p-4 border border-slate-800">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold">Classement Multijoueur</h2>
                <p className="text-xs text-slate-400">Joueurs avec le plus de points (ranking multi).</p>
              </div>

              <button
                onClick={async () => {
                  try {
                    setLbLoading(true);
                    const list = await fetchLeaderboard();
                    setLeaderboard(list);
                    setLbError(null);
                  } catch {
                    setLbError("Erreur de chargement");
                  } finally {
                    setLbLoading(false);
                  }
                }}
                className="text-sm text-slate-400 hover:text-slate-200"
                aria-label="Rafraîchir"
              >
                ⟳
              </button>
            </div>

            <div className="h-px bg-slate-800 my-2" />

            {lbLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
            ) : lbError ? (
              <div className="text-sm text-rose-400">{lbError}</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-sm text-slate-400">Aucun score disponible</div>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((p, i) => (
                  <li
                    key={p.nickname}
                    className="flex items-center justify-between gap-3 p-2 rounded hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-center font-medium text-slate-200">{i + 1}</div>
                      <div className="text-sm font-medium text-slate-100">{p.nickname}</div>
                    </div>
                    <div className="text-sm font-mono text-slate-200">{p.points ?? 0}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </GameShell>
  );
}
