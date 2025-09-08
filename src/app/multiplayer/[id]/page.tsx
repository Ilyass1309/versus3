"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { usePusherMatch } from "@/hooks/usePusherMatch";

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
  const { playerId, state, resolving, reveal, sendAction, isJoined, mySide } = usePusherMatch(id);

  const [selected, setSelected] = useState<number | null>(null);
  const disabled = !isJoined || state?.phase !== "collect";

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

  // Réinitialiser la sélection après chaque retour en phase "collect"
  const phase = state?.phase;
  const turn = state?.turn;
  useEffect(() => {
    if (phase === "collect") {
      setSelected(null);
    }
  }, [phase, turn]);

  const hpYou = mySide === "e" ? state?.hp.e ?? 0 : mySide === "p" ? state?.hp.p ?? 0 : 0;
  const hpEnemy = mySide === "e" ? state?.hp.p ?? 0 : mySide === "p" ? state?.hp.e ?? 0 : 0;
  const chYou = mySide === "e" ? state?.charge.e ?? 0 : mySide === "p" ? state?.charge.p ?? 0 : 0;
  const chEnemy = mySide === "e" ? state?.charge.p ?? 0 : mySide === "p" ? state?.charge.e ?? 0 : 0;

  const ringIf = (a: number) =>
    selected === a ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-amber-400" : "";

  async function onSelectAction(a: number) {
    if (disabled) return;
    setSelected(a);
    await sendAction(a); // spend par défaut calculé dans le hook
  }

  const selectedLabel = useMemo(() => actionLabel(selected), [selected]);

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
      </div>
    </div>
  );
}