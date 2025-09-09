"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPusher } from "@/lib/pusher-client";
import { usePusherMatch } from "@/hooks/usePusherMatch";

type PusherLike = {
  channel?: (name: string) => ChannelLike | null;
  subscribe?: (name: string) => ChannelLike;
  unsubscribe?: (name: string) => void;
};
type ChannelLike = {
  bind: (event: string, cb: (payload?: unknown) => void) => void;
  unbind: (event: string, cb: (payload?: unknown) => void) => void;
};

type ActionName = "Attaquer" | "Défendre" | "Charger";

function actionLabel(a: number | null): ActionName | "-" {
  if (a === 0) return "Attaquer";
  if (a === 1) return "Défendre";
  if (a === 2) return "Charger";
  return "-";
}

function HealthBar({ hp, max = 20, color = "emerald" }: { hp: number; max?: number; color?: "emerald" | "rose" }) {
  const pct = Math.max(0, Math.min(100, Math.round((hp / max) * 100)));
  const bar = color === "rose" ? "bg-rose-500" : "bg-emerald-500";
  const glow = color === "rose" ? "shadow-rose-500/20" : "shadow-emerald-500/20";
  return (
    <div className="w-full">
      <div className="h-2 w-full rounded bg-slate-800 overflow-hidden shadow-inner">
        <div
          className={`h-full ${bar} transition-all duration-300 ${glow}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-slate-400 tabular-nums">{hp} / {max} HP</div>
    </div>
  );
}

function ChargePips({ value, color = "emerald" }: { value: number; color?: "emerald" | "rose" }) {
  const pipOn = color === "rose" ? "bg-rose-400" : "bg-emerald-400";
  const pipOff = "bg-slate-700";
  const max = 3;
  const arr = Array.from({ length: max }, (_, i) => i < Math.min(value, max));
  return (
    <div className="flex gap-1">
      {arr.map((on, i) => (
        <div key={i} className={`h-1.5 w-4 rounded ${on ? pipOn : pipOff}`} />
      ))}
    </div>
  );
}

export default function MatchRoomPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { playerId, state, resolving, reveal, rematch, sendAction, isJoined, mySide } = usePusherMatch(id);
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [spend, setSpend] = useState<number>(0);
  const disabled = !isJoined || state?.phase !== "collect";
  const [ended, setEnded] = useState<{ open: boolean; result?: string }>(() => ({ open: false }));
  const [wantsRematch, setWantsRematch] = useState(false);
  const [, setWaiting] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const AI_ROUTE = "/game";

  // Journal de bord
  const [log, setLog] = useState<string[]>([]);

  // Détermine les noms "Vous" / "Adversaire" à partir des playerIds reçus dans reveal
  useEffect(() => {
    if (!reveal) return;
    const entries: string[] = [];

    const youId = playerId;
    const keys = Object.keys(reveal.reveal ?? {});
    if (keys.length === 0) return;

    const describe = (act: number, spend: number) => {
      const base = actionLabel(act);
      if (act === 0 && spend > 0) return `${base} (${spend})`;
      return `${base}`;
    };

    const revMap = reveal.reveal as Record<string, { action: number; spend: number }>;
    for (const pid of keys) {
      const r = revMap[pid];
      if (!r) continue; // sécurité: clé manquante
      const who = pid === youId ? "Vous" : "Adversaire";
      entries.push(`${who}: ${describe(r.action, r.spend)}`);
    }

    const header = `Tour ${reveal.turn} — Résolution`;
    const hpLine = `HP: Vous ${reveal.hp.p} · Adversaire ${reveal.hp.e} · Charge: Vous ${reveal.charge.p} · Adv ${reveal.charge.e}`;
    const result = reveal.done ? `Fin de partie: ${reveal.result ?? "—"}` : "";

    setLog(prev => [header, ...entries, hpLine, ...(result ? [result] : []), ...prev].slice(0, 200));
  }, [reveal, playerId]);

  // Réinitialiser la sélection et le spend après retour en phase "collect"
  const phase = state?.phase;
  const turn = state?.turn;
  useEffect(() => {
    if (phase === "collect") {
      setSelected(null);
      setSpend(0);
    }
  }, [phase, turn]);

  // Mes HP et Charge vs l’adversaire
  const hpYou = mySide === "e" ? state?.hp.e ?? 0 : mySide === "p" ? state?.hp.p ?? 0 : 0;
  const hpEnemy = mySide === "e" ? state?.hp.p ?? 0 : mySide === "p" ? state?.hp.e ?? 0 : 0;
  const chYou = mySide === "e" ? state?.charge.e ?? 0 : mySide === "p" ? state?.charge.p ?? 0 : 0;
  const chEnemy = mySide === "e" ? state?.charge.p ?? 0 : mySide === "p" ? state?.charge.e ?? 0 : 0;

  const maxSpend = Math.min(3, Math.max(0, chYou));

  const ringIf = (a: number) =>
    selected === a ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-amber-400" : "";

  async function confirmAttack() {
    if (disabled || selected !== 0) return;
    await sendAction(0, Math.min(maxSpend, Math.max(0, spend)));
  }

  async function onSelectAction(a: number) {
    if (disabled) return;
    setSelected(a);
    if (a === 0) {
      // Par défaut, propose 1 si possible, sinon 0
      setSpend(maxSpend > 0 ? Math.min(1, maxSpend) : 0);
      // On attend la confirmation de l’utilisateur (ne pas envoyer tout de suite)
      return;
    }
    // Défendre / Charger -> envoi direct
    await sendAction(a);
  }

  const selectedLabel = useMemo(() => {
    if (selected === 0) {
      return spend > 0 ? (`${actionLabel(0)} (${spend})` as const) : actionLabel(0);
    }
    return actionLabel(selected);
  }, [selected, spend]);

  // Détection de fin + message résultat avec pseudo vainqueur
  function winnerLine() {
    const players = state?.players ?? [];
    const names: Record<string, string> = state?.names ?? {};
    // Priorité au résultat de reveal si présent
    const res = reveal?.result;
    if (res === "p" || res === "e") {
      const idx = res === "p" ? 0 : 1;
      const wid = players[idx];
      const winName = (wid && names[wid]) || (idx === 0 ? "Joueur P" : "Joueur E");
      return `Victoire: ${winName}`;
    }
    // Fallback: calcule via HP
    const hp = reveal?.hp ?? state?.hp;
    if (!hp) return undefined;
    if (hp.p <= 0 && hp.e <= 0) return "Match nul";
    if (hp.p > hp.e) {
      const wid = players[0];
      return `Victoire: ${wid ? names[wid] ?? "Joueur P" : "Joueur P"}`;
    }
    if (hp.e > hp.p) {
      const wid = players[1];
      return `Victoire: ${wid ? names[wid] ?? "Joueur E" : "Joueur E"}`;
    }
    return undefined;
  }

  useEffect(() => {
    if (state?.phase === "ended") {
      setEnded((p) => ({ ...p, open: true }));
    } else if (reveal?.done) {
      setEnded((p) => ({ ...p, open: true, result: reveal?.result ?? p.result }));
    }
  }, [state?.phase, reveal?.done, reveal?.result]);

  // Si le serveur redémarre la partie → fermer le popup et réinitialiser l’attente
  useEffect(() => {
    if (state?.phase === "collect" && ended.open) {
      setEnded({ open: false });
      setWantsRematch(false);
      setWaiting(false);
      setDeadline(null);
    }
  }, [state?.phase, ended.open]);

  // Met à jour l’attente si l’autre joueur est prêt
  const bothReady = (() => {
    const ready = rematch?.ready ?? [];
    return state?.players ? state.players.every(pid => ready.includes(pid)) : false;
  })();

  useEffect(() => {
    if (!wantsRematch) return;
    if (bothReady) {
      // Le serveur va envoyer state.phase=collect (géré plus haut)
      setWaiting(false);
      return;
    }
    // Démarre/maintient le timer de fallback IA
    if (!deadline) {
      const t = Date.now() + 12000; // 12s d’attente
      setDeadline(t);
    }
    const idTimer = setInterval(() => {
      if (!deadline) return;
      if (Date.now() >= deadline) {
        clearInterval(idTimer);
        setWaiting(false);
        setWantsRematch(false);
        setDeadline(null);
        router.push(AI_ROUTE);
      }
    }, 300);
    return () => clearInterval(idTimer);
  }, [wantsRematch, bothReady, deadline, router]);

  async function onClickRematch() {
    if (!id || !playerId) return;
    setWantsRematch(true);
    setWaiting(true);
    try {
      await fetch("/api/match/rematch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: id, playerId }),
      });
    } catch {}
  }

  function leave() {
    router.push("/multiplayer");
  }

  // redirect the creator when another player joins / when match starts
  useEffect(() => {
    if (!id) return;
    const channelName = `match:${id}`;
    let channel: ChannelLike | null = null;
    let pusher: PusherLike | null = null;

    try {
      pusher = getPusher() as PusherLike;
      channel = (pusher.channel ? pusher.channel(channelName) : null) ?? (pusher.subscribe ? pusher.subscribe(channelName) : null);
    } catch {
      // ignore subscription errors
      pusher = null;
      channel = null;
    }

    const onJoined = (payload: unknown) => {
      // accept different payload shapes safely
      if (!payload || typeof payload !== "object") {
        router.push(`/multiplayer/${id}`);
        return;
      }
      const p = payload as Record<string, unknown>;
      const idMatch =
        typeof p.matchId === "string"
          ? p.matchId === id
          : typeof p.id === "string"
          ? p.id === id
          : true;
      // if payload refers to this match (or payload shape unknown) -> redirect
      if (idMatch) {
        router.push(`/multiplayer/${id}`);
      }
    };

    if (channel) {
      channel.bind("player_joined", onJoined);
      channel.bind("match_started", onJoined);
    }

    return () => {
      try {
        if (channel) {
          channel.unbind("player_joined", onJoined);
          channel.unbind("match_started", onJoined);
        }
        if (pusher) {
          try { pusher.unsubscribe?.(channelName); } catch {}
        }
      } catch {}
    };
  }, [id, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Duel en ligne</h1>
            <div className="text-xs text-slate-400">Room: {id}</div>
          </div>
          <div className="text-xs text-slate-400 truncate max-w-[50%]">PlayerID: {playerId}</div>
        </header>

        {/* Statut et jauges */}
        <section className="grid grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border border-slate-800 p-5 bg-slate-900/60">
            <div className="text-sm mb-2">Vous</div>
            <HealthBar hp={hpYou} max={20} color="emerald" />
            <div className="mt-3 text-xs text-slate-400">Charge</div>
            <ChargePips value={chYou} color="emerald" />
          </div>
          <div className="rounded-xl border border-slate-800 p-5 bg-slate-900/60">
            <div className="text-sm mb-2">Adversaire</div>
            <HealthBar hp={hpEnemy} max={20} color="rose" />
            <div className="mt-3 text-xs text-slate-400">Charge</div>
            <ChargePips value={chEnemy} color="rose" />
          </div>
        </section>

        {/* Actions + sélection */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-300">
              Tour {state?.turn ?? 1} · Phase: {state?.phase}
              {resolving ? " · Résolution..." : ""}
            </div>
            <div className="text-sm text-slate-300">
              Action sélectionnée: <span className="font-medium text-amber-300">{selectedLabel}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              disabled={disabled}
              onClick={() => onSelectAction(0)}
              className={`px-4 py-3 rounded-lg bg-rose-600/80 hover:bg-rose-600 disabled:opacity-40 ${ringIf(0)}`}
            >
              Attaquer
            </button>
            <button
              disabled={disabled}
              onClick={() => onSelectAction(1)}
              className={`px-4 py-3 rounded-lg bg-sky-600/80 hover:bg-sky-600 disabled:opacity-40 ${ringIf(1)}`}
            >
              Défendre
            </button>
            <button
              disabled={disabled}
              onClick={() => onSelectAction(2)}
              className={`px-4 py-3 rounded-lg bg-amber-500/80 hover:bg-amber-500 disabled:opacity-40 ${ringIf(2)}`}
            >
              Charger
            </button>
          </div>

          {/* Sélection du nombre de charges pour l’attaque */}
          {selected === 0 && (
            <div className="mt-5 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-slate-300">Charges à utiliser</div>
                <div className="text-xs text-slate-400">Dispo: {chYou} · Max: 3</div>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={maxSpend}
                  step={1}
                  value={Math.min(spend, maxSpend)}
                  onChange={(e) => setSpend(Number(e.target.value))}
                  className="flex-1 accent-amber-400"
                />
                <div className="w-10 text-right tabular-nums text-sm text-slate-200">{Math.min(spend, maxSpend)}</div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {[0, 1, 2, 3].filter(n => n <= maxSpend).map(n => (
                  <button
                    key={n}
                    onClick={() => setSpend(n)}
                    className={`px-2 py-1 rounded border text-xs ${
                      spend === n ? "border-amber-400 text-amber-300" : "border-slate-700 text-slate-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  disabled={disabled}
                  onClick={confirmAttack}
                  className="px-3 py-2 rounded bg-amber-600 hover:bg-amber-500 text-sm disabled:opacity-40"
                >
                  Valider l’attaque
                </button>
              </div>
            </div>
          )}

          {resolving && (
            <div className="mt-4 text-xs text-slate-400">Résolution en cours…</div>
          )}
        </section>

        {/* Journal de bord */}
        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="text-sm font-medium text-slate-200 mb-3">Journal de bord</div>
          {log.length === 0 ? (
            <div className="text-sm text-slate-500">Aucun événement pour l’instant.</div>
          ) : (
            <ul className="space-y-1 text-sm text-slate-300 max-h-64 overflow-auto pr-1">
              {log.map((line, i) => (
                <li key={i} className="whitespace-pre-wrap">{line}</li>
              ))}
            </ul>
          )}
        </section>

        {ended.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-sm rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur p-5 shadow-xl">
              <div className="text-lg font-semibold mb-1">Fin de partie</div>
              <div className="text-sm text-slate-300 mb-4">
                {winnerLine() ?? "Partie terminée"}
              </div>
              <div className="flex items-center justify-between gap-2">
                <button onClick={leave} className="px-3 py-2 text-sm rounded bg-slate-800 hover:bg-slate-700">
                  Quitter
                </button>
                {!wantsRematch ? (
                  <button onClick={onClickRematch} className="px-3 py-2 text-sm rounded bg-emerald-600 hover:bg-emerald-500">
                    Relancer
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs text-slate-300">
                      En attente de l’autre joueur…
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}