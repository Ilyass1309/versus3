"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { StatsCard } from "@/app/components/stats/StatsCard";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Bar,
  Legend,
  ComposedChart,
  Area,
} from "recharts";
import {
  ArrowLeft,
  Activity,
  Trophy,
  Skull,
  Database,
  SlidersHorizontal,
  Save,
  Brain,
  Info,
} from "lucide-react";

interface StatsPayload {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  recentWinRates: { date: string; winRate: number }[];
  hyperparams: { alpha: number; gamma: number; epsilon: number };
  qtableSize: number;
  qVersion?: number;         // use undefined instead of null
  lastUpdate?: string;       // use undefined instead of null
  reachableMaxStates: number;
  coveragePct: number;
  trainingEpisodes: number;
}

interface TrainingPoint {
  episode: number;
  coverage: number;
  states: number;
  minV: number;
  maxV: number;
  avgV: number;
  epsilon: number;
  newStates: number;
  stagnate: number;
  gini: number;
  timestamp: number;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return "+" + (v >= 10 ? v.toFixed(0) : v.toFixed(1)) + "M";
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return "+" + (v >= 10 ? v.toFixed(0) : v.toFixed(1)) + "K";
  }
  return "+" + n;
}

export default function StatsPage() {
  const r = useRouter();
  const [data, setData] = useState<StatsPayload | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [hyper, setHyper] = useState({ alpha: 0, gamma: 0, epsilon: 0 });
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<TrainingPoint[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (res.ok) {
        const json: StatsPayload = await res.json();
        setData(json);
        setHyper(json.hyperparams);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveHyper() {
    setSaving(true);
    try {
      await fetch("/api/hyperparams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hyper),
      });
    } finally {
      setSaving(false);
      load();
    }
  }

  // load only the summary index (index.json) — keep charts using this data
  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await fetch("/api/training/history", { cache: "no-store" });
      if (!res.ok) {
        setHistory([]);
        return;
      }
      const j = await res.json().catch(() => undefined);
      // index.json entries use coveragePct / avgVisits / minVisits / maxVisits
      const raw = j?.points ?? j ?? [];
      const pts: TrainingPoint[] = (raw || []).map((o: any) => ({
        episode: Number(o.episode ?? 0),
        coverage: Number(o.coveragePct ?? o.coverage ?? 0),
        states: Number(o.states ?? 0),
        minV: Number(o.minVisits ?? o.minV ?? 0),
        maxV: Number(o.maxVisits ?? o.maxV ?? 0),
        avgV: Number(o.avgVisits ?? o.avgV ?? 0),
        epsilon: Number(o.epsilon ?? 0),
        newStates: 0,
        stagnate: 0,
        gini: 0,
        timestamp: Number(o.timestamp ?? 0),
      }));
      setHistory(pts);
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(()=> { loadHistory(); }, [loadHistory]);

  // --- Perspective IA ---
  // Compute AI wins robustly:
  // prefer explicit totalLosses when provided, otherwise derive:
  // aiWins = totalGames - playerWins - draws
  const aiWins = useMemo(() => {
    if (!data) return 0;
    if (typeof data.totalLosses === "number" && data.totalLosses > 0) return data.totalLosses;
    const total = Number(data.totalGames ?? 0);
    const pWins = Number(data.totalWins ?? 0);
    const draws = Number(data.totalDraws ?? 0);
    return Math.max(0, total - pWins - draws);
  }, [data]);

  const aiLosses = useMemo(() => {
    // AI losses = player wins (preferred) or derive similarly
    if (!data) return 0;
    if (typeof data.totalWins === "number") return data.totalWins;
    const total = Number(data.totalGames ?? 0);
    const aiW = aiWins;
    const draws = Number(data.totalDraws ?? 0);
    return Math.max(0, total - aiW - draws);
  }, [data, aiWins]);

  const aiWinRate = useMemo(() => {
    if (!data || data.totalGames === 0) return 0;
    return (aiWins / data.totalGames) * 100;
  }, [data, aiWins]);

  const coverageCardValue = useMemo(() => {
    if (!data) return "…";
    return data.coveragePct.toFixed(2) + "%";
  }, [data]);

  const coverageFooter = useMemo(() => {
    if (!data) return "";
    return `${data.qtableSize} / ${data.reachableMaxStates} reachable states`;
  }, [data]);

  const trainingEpisodesValue = useMemo(() => {
    if (!data) return "…";
    return formatCompact(data.trainingEpisodes);
  }, [data]);

  const lastPoint = history.length ? history[history.length - 1] : undefined;

  // Tooltip formatter without 'any'
  function coverageValueFormatter(value: unknown): [string, string] {
    if (typeof value === "number") return [value.toFixed(2) + "%", "Coverage"];
    return ["0.00%", "Coverage"];
  }

  return (
    <div className="min-h-dvh px-5 py-6 md:px-10 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => r.push("/game")}
              className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition focus:outline-none focus-visible:ring ring-indigo-400/60"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-fuchsia-300">
              <Brain size={20} className="opacity-80" />
              AI Analytics
            </h1>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 disabled:opacity-40"
          >
            Refresh
          </button>
        </div>

        <div className="text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed max-w-3xl">
            <Info size={14} className="mt-[2px] shrink-0" />
            <p>
              Toutes les métriques sont montrées du point de vue de l&apos;IA.
              AI Wins = parties où l&apos;IA bat le joueur. AI Losses = parties où le joueur gagne.
              Le graphique affiche le taux de victoire de l&apos;IA (inverse de celui du joueur).
            </p>
        </div>

        {/* Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <StatsCard
            title="Total Games"
            value={loading ? "…" : data?.totalGames ?? 0}
            icon={<Activity size={20} />}
            footer={!loading && data ? `${data.totalDraws} draws` : ""}
          />
          <StatsCard
            title="AI Wins"
            value={loading ? "…" : aiWins}
            icon={<Trophy size={20} className="text-emerald-400" />}
            footer={!loading && data ? aiWinRate.toFixed(1) + "% win rate" : ""}
          />
          <StatsCard
            title="AI Losses"
            value={loading ? "…" : aiLosses}
            icon={<Skull size={20} className="text-rose-400" />}
            footer={
              !loading && data
                ? ((aiLosses / Math.max(1, data.totalGames)) * 100).toFixed(1) + "% of games"
                : ""
            }
          />
          {/* Remplacement de l'ancienne carte Q-table States */}
          <StatsCard
            title="Training Episodes"
            value={trainingEpisodesValue}
            icon={<Database size={20} className="text-indigo-300" />}
            footer={!loading && data ? "Francois model" : ""}
          />
          <StatsCard
            title="State Coverage"
            value={coverageCardValue}
            icon={<Brain size={20} className="text-fuchsia-300" />}
            footer={coverageFooter}
          />
        </div>

        {/* New cards section */}
        <div className="grid gap-5 sm:grid-cols-3">
          <StatsCard
            title="Latest Epsilon"
            value={lastPoint ? lastPoint.epsilon.toFixed(3) : "…"}
          />
          <StatsCard
            title="Visit Gini"
            value={lastPoint ? lastPoint.gini.toFixed(3) : "…"}
            footer="Higher = more imbalance"
          />
          <StatsCard
            title="Stagnation (ep)"
            value={lastPoint ? lastPoint.stagnate : "…"}
            footer="Episodes since last new state"
          />
        </div>

        {/* Graphs section */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow">
            <h2 className="text-sm font-semibold mb-4 tracking-wide text-slate-200">Coverage Over Time</h2>
            <div className="h-64">
              {histLoading ? <div className="w-full h-full animate-pulse bg-white/5 rounded"/> : (
                <ResponsiveContainer width="100%" height="100%">
                  {/* Use full-history (history) for the coverage chart with explicit XAxis numeric domain */}
                  <LineChart data={history}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <XAxis dataKey="episode" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickFormatter={v=>v+"%"} />
                    <Tooltip
                      contentStyle={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                      formatter={coverageValueFormatter}
                      labelFormatter={(l)=>"Episode "+l}
                    />
                    <Line type="monotone" dataKey="coverage" stroke="#6366f1" dot={false} strokeWidth={2}/>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow">
            <h2 className="text-sm font-semibold mb-4 tracking-wide text-slate-200">Visits Distribution Metrics</h2>
            <div className="h-64">
              {histLoading ? <div className="w-full h-full animate-pulse bg-white/5 rounded"/> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <XAxis dataKey="episode" stroke="#94a3b8" fontSize={11}/>
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(l)=>"Episode "+l}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="avgV" name="Avg" stroke="#34d399" dot={false}/>
                    <Line type="monotone" dataKey="minV" name="Min" stroke="#fbbf24" dot={false}/>
                    <Line type="monotone" dataKey="maxV" name="Max" stroke="#f87171" dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow">
            <h2 className="text-sm font-semibold mb-4 tracking-wide text-slate-200">Epsilon & New States</h2>
            <div className="h-64">
              {histLoading ? <div className="w-full h-full animate-pulse bg-white/5 rounded"/> : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={history}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <XAxis dataKey="episode" stroke="#94a3b8" fontSize={11}/>
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11}/>
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11}/>
                    <Tooltip
                      contentStyle={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="newStates" name="New States" fill="#6366f1" />
                    <Line yAxisId="right" type="monotone" dataKey="epsilon" name="Epsilon" stroke="#f472b6" dot={false}/>
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow">
            <h2 className="text-sm font-semibold mb-4 tracking-wide text-slate-200">Gini & Stagnation</h2>
            <div className="h-64">
              {histLoading ? <div className="w-full h-full animate-pulse bg-white/5 rounded"/> : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={history}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <XAxis dataKey="episode" stroke="#94a3b8" fontSize={11}/>
                    <YAxis yAxisId="gini" stroke="#94a3b8" fontSize={11} domain={[0,1]}/>
                    <YAxis yAxisId="stag" orientation="right" stroke="#94a3b8" fontSize={11}/>
                    <Tooltip
                      contentStyle={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend />
                    <Line yAxisId="gini" type="monotone" dataKey="gini" name="Gini" stroke="#a78bfa" dot={false}/>
                    <Area yAxisId="stag" type="monotone" dataKey="stagnate" name="Episodes Since New" stroke="#f59e0b" fill="#f59e0b33"/>
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </motion.div>

        {/* Hyperparams */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow space-y-6"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} />
            <h2 className="text-sm font-semibold tracking-wide text-slate-200">
              Hyperparameters (Training / Policy)
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {(["alpha", "gamma", "epsilon"] as const).map((k) => (
              <div key={k} className="space-y-2">
                <label className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
                  <span>{k}</span>
                  <span className="font-mono text-slate-200">{hyper[k].toFixed(4)}</span>
                </label>
                <input
                  type="range"
                  min={k === "epsilon" ? 0.0 : 0.5}
                  max={k === "epsilon" ? 0.5 : 1.0}
                  step="0.0001"
                  value={hyper[k]}
                  onChange={(e) =>
                    setHyper((h) => ({ ...h, [k]: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-indigo-400"
                />
              </div>
            ))}
          </div>

          <button
            onClick={saveHyper}
            disabled={saving}
            className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:brightness-110 disabled:opacity-40 focus:outline-none focus-visible:ring ring-indigo-400/60"
          >
            <Save size={14} /> {saving ? "Saving..." : "Save"}
          </button>
        </motion.div>

        {/* Raw meta */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-slate-500"
        >
          {data && (
            <p>
              Q-table version: {data.qVersion ?? "?"} • Last update:{" "}
              {data.lastUpdate ?? "n/a"}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}