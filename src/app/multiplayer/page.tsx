"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameShell } from "@/app/components/game/GameShell";

type ScoreRow = { nickname: string; points?: number; wins?: number };
// Replace the narrow Room type with a broader one that matches all server shapes
type Room = {
  id?: string;
  matchId?: string;
  match_id?: string;
  host?: string;
  host_nickname?: string;
  owner?: string;
  name?: string;
  // different APIs may return players under different keys / formats
  players?: string[] | unknown;
  players_list?: string[] | unknown;
  playersArray?: string[] | unknown;
  status?: string;
  // allow additional properties without TS errors
  [key: string]: unknown;
};

export default function MultiplayerPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<ScoreRow[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomMessage, setRoomMessage] = useState<string | null>(null);

  const MAX_PLAYERS = 2; // adjust if your match size differs

  useEffect(() => {
    let mounted = true;
    async function fetchBoard() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/scoreboard");
        const body = await res.json().catch(() => ({}));
        const list = body?.top ?? body?.leaderboard ?? [];
        if (mounted) setLeaderboard(list);
      } catch {
        if (mounted) setError("Impossible de charger le classement");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchBoard();
    const iv = setInterval(fetchBoard, 30_000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function fetchRooms() {
      setRoomsLoading(true);
      try {
        const res = await fetch("/api/match/list");
        const body = await res.json().catch(() => ({}));
        // accept several shapes returned by different implementations
        const raw: Room[] = body?.matches ?? body?.list ?? body?.rooms ?? body?.data ?? [];
        const parsed = (raw || []).map((r) => {
          let players = r.players ?? r.players_list ?? r.playersArray ?? [];
          if (typeof players === "string") {
            try {
              players = JSON.parse(players);
            } catch {
              players = [];
            }
          }
          return {
            id: r.id ?? r.matchId ?? r.match_id,
            host: r.host ?? r.host_nickname ?? r.owner ?? r.name,
            players,
            status: r.status ?? "open",
          } as Room;
        });
        if (mounted) setRooms(parsed);
      } catch (err) {
        console.error("[MULTI] fetchRooms error", err);
        if (mounted) setRooms([]);
      } finally {
        if (mounted) setRoomsLoading(false);
      }
    }

    fetchRooms();
    const iv = setInterval(fetchRooms, 4000); // refresh rooms frequently
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  async function handleCreate() {
    setRoomLoading(true);
    setRoomMessage(null);
    try {
      const name = localStorage.getItem("nickname") ?? "guest";
      const res = await fetch("/api/match/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRoomMessage("Erreur création : " + (body?.error ?? "server"));
      } else {
        const id = body?.matchId ?? body?.id ?? body?.match_id ?? "unknown";
        setRoomMessage("Salle créée: " + id);
        // refresh rooms immediately
        setTimeout(() => fetch("/api/match/list").then(r => r.json()).then(b => {
          const raw: Room[] = b?.matches ?? b?.list ?? b?.rooms ?? b?.data ?? [];
          setRooms(raw.map((r) => {
            let players = r.players ?? [];
            if (typeof players === "string") {
              try { players = JSON.parse(players); } catch { players = []; }
            }
            return { id: r.id ?? r.matchId ?? r.match_id, host: r.host ?? r.host_nickname ?? r.owner ?? r.name, players, status: r.status ?? "open" };
          }));
        }).catch(()=>{}), 200);
      }
    } catch {
      setRoomMessage("Erreur réseau");
    } finally {
      setRoomLoading(false);
    }
  }

  async function handleJoinRoom(roomId?: string) {
    setRoomLoading(true);
    setRoomMessage(null);
    if (!roomId) {
      setRoomMessage("ID de salle invalide");
      setRoomLoading(false);
      return;
    }
    try {
      const playerId = localStorage.getItem("nickname") ?? Math.random().toString(36).slice(2, 8);
      const res = await fetch("/api/match/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: roomId, playerId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRoomMessage("Erreur join : " + (body?.error ?? "server"));
      } else {
        setRoomMessage("Rejoint: " + (body?.state?.id ?? roomId));
        // refresh rooms so full rooms disappear
        try {
          const listRes = await fetch("/api/match/list");
          const listBody = await listRes.json().catch(() => ({}));
          const raw: Room[] = listBody?.matches ?? listBody?.list ?? listBody?.rooms ?? listBody?.data ?? [];
          const parsed = (raw || []).map((r) => {
            let players = r.players ?? r.players_list ?? [];
            if (typeof players === "string") {
              try { players = JSON.parse(players); } catch { players = []; }
            }
            return { id: r.id ?? r.matchId ?? r.match_id, host: r.host ?? r.host_nickname ?? r.owner ?? r.name, players, status: r.status ?? "open" };
          });
          setRooms(parsed);
        } catch {}
        // optional navigation to room page if implemented:
        // router.push(`/multiplayer/room/${roomId}`);
      }
    } catch {
      setRoomMessage("Erreur réseau");
    } finally {
      setRoomLoading(false);
    }
  }

  // filter visible rooms: open and not full
  const visibleRooms = rooms.filter((r) => {
    const players = Array.isArray(r.players) ? r.players : [];
    const count = players.length;
    return (r.status === "open" || !r.status) && count < MAX_PLAYERS;
  });

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

            {/* Return button: prominent, aligned with game style */}
            <div>
              <button
                onClick={() => router.push("/game")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-rose-500 text-white font-semibold shadow-md hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400"
                aria-label="Retour au jeu"
              >
                ← Retour au jeu
              </button>
            </div>
          </div>

          {/* Rooms table */}
          <section className="mb-6 rounded-md border border-slate-800 p-4 bg-gradient-to-b from-slate-850 via-slate-900 to-slate-950">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-slate-100">Salles disponibles</h3>
              <div className="text-sm text-slate-400">
                {roomsLoading ? "Chargement..." : `${visibleRooms.length} disponible(s)`}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-left">
                    <th className="pb-2">Hôte</th>
                    <th className="pb-2">Joueurs</th>
                    <th className="pb-2">Code</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRooms.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-slate-400">Aucune salle ouverte</td>
                    </tr>
                  ) : (
                    visibleRooms.map((r) => {
                      const players = Array.isArray(r.players) ? r.players : [];
                      const host = r.host ?? r.host_nickname ?? "invité";
                      return (
                        <tr key={r.id} className="border-t border-slate-800">
                          <td className="py-3">{host}</td>
                          <td className="py-3">{players.length}/{MAX_PLAYERS}</td>
                          <td className="py-3 font-mono">{r.id}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => r.id && handleJoinRoom(r.id)}
                              disabled={roomLoading || !r.id}
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

          <section className="rounded-md border border-slate-800 p-4 bg-gradient-to-b from-slate-850 via-slate-900 to-slate-950">
            <p className="text-sm text-slate-400 mb-4">
              Ici s&apos;affichera la liste des parties, l&apos;&eacute;tat des matchs et les contrôles de lobby.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-md bg-slate-800 border border-slate-700">
                <h3 className="font-medium text-slate-100">Rejoindre une partie</h3>
                <p className="text-sm text-slate-400 mt-1">Rejoins un adversaire al&eacute;atoire ou choisi.</p>
                <div className="mt-4">
                  <button
                    onClick={() => {
                      const first = visibleRooms[0];
                      if (first) handleJoinRoom(first.id);
                      else setRoomMessage("Aucune salle ouverte pour rejoindre");
                    }}
                    className="px-3 py-2 rounded bg-emerald-500 text-black font-medium hover:bg-emerald-600"
                  >
                    {roomLoading ? "Chargement..." : "Rejoindre (auto)"}
                  </button>
                </div>
                {roomMessage && (
                  <p className="text-sm text-slate-400 mt-2">{roomMessage}</p>
                )}
              </div>

              <div className="p-4 rounded-md bg-slate-800 border border-slate-700">
                <h3 className="font-medium text-slate-100">Créer une partie</h3>
                <p className="text-sm text-slate-400 mt-1">Crée une salle et attends un adversaire.</p>
                <div className="mt-4">
                  <button
                    onClick={handleCreate}
                    className="px-3 py-2 rounded bg-indigo-500 text-white font-medium hover:bg-indigo-600"
                  >
                    {roomLoading ? "Chargement..." : "Créer"}
                  </button>
                </div>
                {roomMessage && (
                  <p className="text-sm text-slate-400 mt-2">{roomMessage}</p>
                )}
              </div>
            </div>
          </section>
        </main>

        {/* Sidebar leaderboard styled like game page */}
        <aside className="order-1 lg:order-1 lg:w-72 xl:w-80 shrink-0">
          <div className="bg-slate-900 text-slate-100 rounded-lg shadow-lg p-4 border border-slate-800">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold">Classement Multijoueur</h2>
                <p className="text-xs text-slate-400">
                  Joueurs avec le plus de points (ranking multi).
                </p>
              </div>

              <button
                onClick={() => {
                  setLoading(true);
                  setLeaderboard([]);
                  fetch("/api/scoreboard")
                    .then((r) => r.json())
                    .then((b) => {
                      const list = b?.top ?? b?.leaderboard ?? [];
                      setLeaderboard(list);
                    })
                    .catch(() => setError("Erreur de chargement"))
                    .finally(() => setLoading(false));
                }}
                className="text-sm text-slate-400 hover:text-slate-200"
                aria-label="Rafraîchir"
              >
                ⟳
              </button>
            </div>

            <div className="h-px bg-slate-800 my-2" />

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="text-sm text-rose-400">{error}</div>
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
                    <div className="text-sm font-mono text-slate-200">
                      {p.points ?? 0}
                    </div>
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