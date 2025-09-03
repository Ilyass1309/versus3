"use client";
import { useEffect, useState, useCallback } from "react";
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
} from "recharts";
import { ArrowLeft, Activity, Trophy, Skull, Database, SlidersHorizontal, Save } from "lucide-react";

interface StatsPayload {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  recentWinRates: { date: string; winRate: number }[];
  hyperparams: { alpha: number; gamma: number; epsilon: number };
  qtableSize: number;
  qVersion: number | null;
  lastUpdate: string | null;
}

export default function StatsPage() {
  const r = useRouter();
  const [data, setData] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [hyper, setHyper] = useState({ alpha: 0, gamma: 0, epsilon: 0 });
  const [saving, setSaving] = useState(false);

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
              Retour
            </button>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-fuchsia-300">
              Game Analytics
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

        {/* Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Games"
            value={loading ? "…" : data?.totalGames ?? 0}
            icon={<Activity size={20} />}
            footer={!loading && data ? `${data.totalDraws} draws` : ""}
          />
          <StatsCard
            title="Wins"
            value={loading ? "…" : data?.totalWins ?? 0}
            icon={<Trophy size={20} className="text-emerald-400" />}
            footer={
              !loading && data
                ? ((data.totalWins / Math.max(1, data.totalGames)) * 100).toFixed(1) + "% win rate"
                : ""
            }
          />
          <StatsCard
            title="Losses"
            value={loading ? "…" : data?.totalLosses ?? 0}
            icon={<Skull size={20} className="text-rose-400" />}
            footer={
              !loading && data
                ? ((data.totalLosses / Math.max(1, data.totalGames)) * 100).toFixed(1) + "% of games"
                : ""
            }
          />
          <StatsCard
            title="Q-table States"
            value={loading ? "…" : data?.qtableSize ?? 0}
            icon={<Database size={20} className="text-indigo-300" />}
            footer={
              !loading && data?.lastUpdate
                ? "Version " + (data.qVersion ?? "?")
                : ""
            }
          />
        </div>

        {/* Graph */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 shadow"
        >
          <h2 className="text-sm font-semibold mb-4 tracking-wide text-slate-200">
            Win Rate Evolution
          </h2>
            <div className="h-72 w-full">
              {loading || !data ? (
                <div className="w-full h-full animate-pulse rounded-lg bg-white/5" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.recentWinRates}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickMargin={8}
                      minTickGap={16}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(v) => v + "%"}
                      domain={[0, 100]}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,23,42,0.85)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "#cbd5e1" }}
                      // éviter 'any'
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Win Rate"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="winRate"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
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
              Hyperparameters
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