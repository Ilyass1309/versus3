"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getPusher } from "@/lib/pusher-client";
import { lobbyChannel } from "@/lib/pusher-channel";
import { usePusherMatch } from "@/hooks/usePusherMatch";
import { usePlayer } from "@/app/providers/PlayerProvider";

type Room = { id: string; players: number; createdAt: number; createdBy?: string };

export default function MultiplayerPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const { playerId, state, sendAction, reveal, isJoined } = usePusherMatch(current);
  const { user } = usePlayer();
  const [leaderboard, setLeaderboard] = useState<Array<{ nickname: string; points: number }>>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

  // Charger la liste initiale
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/match/list", { cache: "no-store" });
        const j = await r.json();
        setRooms(j.rooms ?? []);
      } catch {}
    })();
  }, []);

  // S'abonner au lobby (public)
  useEffect(() => {
    let p;
    try {
      p = getPusher();
    } catch {
      return;
    }
    const ch = p.subscribe(lobbyChannel);

    const onCreated = (r: Room) => {
      setRooms(prev => {
        if (prev.find(x => x.id === r.id)) return prev;
        return [r, ...prev].sort((a, b) => b.createdAt - a.createdAt);
      });
    };
    const onUpdated = (r: { id: string; players: number }) => {
      setRooms(prev => prev.map(x => (x.id === r.id ? { ...x, players: r.players } : x)));
    };
    const onFull = (r: { id: string }) => {
      setRooms(prev => prev.filter(x => x.id !== r.id));
    };

    ch.bind("created", onCreated);
    ch.bind("updated", onUpdated);
    ch.bind("full", onFull);

    return () => {
      ch.unbind("created", onCreated);
      ch.unbind("updated", onUpdated);
      ch.unbind("full", onFull);
      try { p.unsubscribe(lobbyChannel); } catch {}
    };
  }, []);

  // Créer un salon
  async function create() {
    const r = await fetch("/api/match/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: user?.nickname }),
    });
    if (!r.ok) return;
    const j = await r.json();
    setCurrent(j.matchId);
  }

  // Rejoindre un salon
  function joinRoom(id: string) {
    setCurrent(id);
  }

  // Quand les 2 joueurs sont présents dans le salon courant, naviguer vers la page de match
  useEffect(() => {
    if (!current) return;
    const count = state?.players?.length ?? 0;
    if (isJoined && count === 2) {
      router.push(`/multiplayer/${current}`);
    }
  }, [current, isJoined, state?.players?.length, router]);

  const openRooms = useMemo(() => rooms.filter(r => r.players < 2), [rooms]);

  useEffect(() => {
    let mounted = true;
    async function fetchBoard() {
      setLoadingBoard(true);
      try {
        const res = await fetch("/api/leaderboard");
        const body = await res.json().catch(() => ({}));
        if (res.ok && mounted) setLeaderboard(body.leaderboard ?? []);
      } catch (e) {
        console.error("[multiplayer] leaderboard fetch failed:", e);
      } finally {
        if (mounted) setLoadingBoard(false);
      }
    }
    fetchBoard();
    const iv = setInterval(fetchBoard, 30_000); // refresh every 30s
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Salons multijoueur</h1>
        <button
          onClick={create}
          className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
        >
          Créer un salon
        </button>
      </div>

      <div className="rounded border border-zinc-800 overflow-hidden">
        <div className="grid grid-cols-4 bg-zinc-900/60 px-4 py-2 text-xs uppercase tracking-wide text-zinc-400">
          <div>Match ID</div>
          <div>Créateur</div>
          <div>Joueurs</div>
          <div>Action</div>
        </div>
        {openRooms.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-500">Aucun salon disponible</div>
        ) : (
          openRooms.map(r => (
            <div key={r.id} className="grid grid-cols-4 items-center px-4 py-3 border-t border-zinc-800">
              <div className="font-mono text-sm">{r.id}</div>
              <div className="text-sm">{r.createdBy ?? "-"}</div>
              <div className="text-sm">{r.players} / 2</div>
              <div>
                <button
                  onClick={() => joinRoom(r.id)}
                  className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white text-xs"
                  disabled={r.players >= 2}
                >
                  Rejoindre
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={() => router.push("/game")}
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
        >
          Retour au jeu
        </button>
      </div>

      <section className="mt-6 max-w-md">
        <h3 className="text-lg font-semibold">Classement Multijoueur</h3>
        {loadingBoard ? (
          <div>Chargement...</div>
        ) : (
          <ol className="mt-2 space-y-1">
            {leaderboard.length === 0 && <div className="text-sm text-muted">Aucun score</div>}
            {leaderboard.map((p, i) => (
              <li key={p.nickname} className="flex justify-between">
                <span>{i + 1}. {p.nickname}</span>
                <span className="font-mono">{p.points}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}