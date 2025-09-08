"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameShell } from "@/app/components/game/GameShell";

type ScoreRow = { nickname: string; points?: number; wins?: number };

export default function MultiplayerPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomMessage, setRoomMessage] = useState<string | null>(null);

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
        const id = body?.matchId ?? body?.id ?? "unknown";
        setRoomMessage("Salle créée: " + id);
        // optionnel : naviguer vers la page de match si implémentée
        // router.push(`/multiplayer/room/${id}`);
      }
    } catch {
      setRoomMessage("Erreur réseau");
    } finally {
      setRoomLoading(false);
    }
  }

  async function handleJoin() {
    const roomId = prompt("ID de la salle à rejoindre:");
    if (!roomId) return;
    setRoomLoading(true);
    setRoomMessage(null);
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
        // si tu as une page de room, rediriger :
        // router.push(`/multiplayer/room/${body.state.id ?? roomId}`);
      }
    } catch {
      setRoomMessage("Erreur réseau");
    } finally {
      setRoomLoading(false);
    }
  }

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
                    onClick={handleJoin}
                    className="px-3 py-2 rounded bg-emerald-500 text-black font-medium hover:bg-emerald-600"
                  >
                    {roomLoading ? "Chargement..." : "Rejoindre"}
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
                  Victoires entre joueurs — diff&eacute;rent du classement contre l&apos;IA.
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
                      {typeof p.wins === "number" ? p.wins : p.points ?? 0}
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