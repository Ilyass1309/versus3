"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ScoreRow = { nickname: string; points?: number; wins?: number };

export default function MultiplayerPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main area */}
          <main className="flex-1 bg-white rounded-lg shadow-md p-6 min-h-[60vh]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-slate-800">Salle Multijoueur</h1>
                <p className="text-sm text-slate-500">Rejoins ou cr&eacute;e une partie pour affronter d&apos;autres joueurs.</p>
              </div>

              {/* Retour au jeu - repositionné et recoloré */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/game")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white font-medium shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  aria-label="Retour au jeu"
                >
                  ← Retour au jeu
                </button>
              </div>
            </div>

            {/* Placeholder pour le contenu multijoueur (liste de rooms / matchmaking) */}
            <section className="rounded-md border border-slate-100 p-4 bg-gradient-to-b from-white to-slate-50">
              <p className="text-sm text-slate-500 mb-4">
                Ici s&apos;affichera la liste des parties, l&apos;&eacute;tat des matchs, et les contr&ocirc;les de lobby.
              </p>

              {/* Exemple d'UI simplifi&eacute;e */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-md border border-dashed border-slate-200">
                  <h3 className="font-medium">Rejoindre une partie</h3>
                  <p className="text-sm text-slate-500">Rejoins un adversaire al&eacute;atoire ou choisi.</p>
                </div>
                <div className="p-4 rounded-md border border-dashed border-slate-200">
                  <h3 className="font-medium">Cr&eacute;er une partie</h3>
                  <p className="text-sm text-slate-500">Cr&eacute;e une salle et attends un adversaire.</p>
                </div>
              </div>
            </section>
          </main>

          {/* Sidebar leaderboard */}
          <aside className="w-full md:w-80 self-start sticky top-6">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Classement Multijoueur</h2>
                  <p className="text-xs text-slate-500">
                    Victoires entre joueurs — diff&eacute;rent du classement contre l&apos;IA (page Jeu).
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
                  className="text-sm text-slate-500 hover:text-slate-700"
                  aria-label="Rafraîchir le classement"
                >
                  ⟳
                </button>
              </div>

              <div className="h-[1px] bg-slate-100 my-2" />

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : leaderboard.length === 0 ? (
                <div className="text-sm text-slate-500">Aucun score disponible</div>
              ) : (
                <ol className="space-y-2">
                  {leaderboard.map((p, i) => (
                    <li
                      key={p.nickname}
                      className="flex items-center justify-between gap-3 p-2 rounded hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 text-center font-medium text-slate-700">{i + 1}</div>
                        <div className="text-sm font-medium text-slate-800">{p.nickname}</div>
                      </div>
                      <div className="text-sm font-mono text-slate-700">
                        {typeof p.wins === "number" ? p.wins : p.points ?? 0}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}