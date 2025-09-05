"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const MODEL_KEY = "activeModel"; // localStorage key

interface ModelOption {
  id: string;
  label: string;
  description: string;
  available: boolean;
}

const MODELS: ModelOption[] = [
  {
    id: "francois",
    label: "François",
    description: "Current continuously trained Q-Learning model.",
    available: true,
  },
  {
    id: "esquie",
    label: "Esquie",
    description: "Coming soon (not available yet).",
    available: false,
  },
];

export default function HomePage() {
  const [model, setModel] = useState("francois");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(MODEL_KEY) : null;
    if (stored && MODELS.some(m => m.id === stored)) {
      setModel(stored);
    } else {
      localStorage.setItem(MODEL_KEY, "francois"); // default
    }
  }, []);

  function select(id: string, available: boolean) {
    if (!available) return;
    setModel(id);
    localStorage.setItem(MODEL_KEY, id);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-10 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <div className="w-full max-w-3xl space-y-10">
        <header className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
            Versus III
          </h1>
          <p className="text-sm text-slate-400">
            Tactical duel powered by a reinforcement learning agent. Pick a model and enter the arena.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Model Selection
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {MODELS.map(m => {
              const active = m.id === model;
              return (
                <button
                  key={m.id}
                  onClick={() => select(m.id, m.available)}
                  disabled={!m.available}
                  className={[
                    "group relative flex flex-col items-start p-4 rounded-xl border transition text-left",
                    active
                      ? "border-indigo-400/60 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.4)]"
                      : "border-white/10 hover:border-indigo-400/40 hover:bg-white/5",
                    !m.available ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{m.label}</span>
                    {active && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
                        Active
                      </span>
                    )}
                    {!m.available && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 border border-white/10 text-slate-300">
                        Coming Soon
                      </span>
                    )}
                  </span>
                  <span className="mt-2 text-[11px] leading-relaxed text-slate-400">
                    {m.description}
                  </span>
                  {!m.available && (
                    <span className="mt-2 text-[10px] text-rose-300/80">
                      Not selectable yet.
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">
            Selected model will be used when loading the game page (stored locally).
          </p>
        </section>

        <div className="flex justify-center">
          <Link
            href="/game"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 font-medium text-sm shadow hover:from-indigo-400 hover:to-fuchsia-400 transition"
          >
            Enter the Arena
          </Link>
        </div>

        <footer className="pt-4 text-center text-[10px] text-slate-500">
          RL Prototype • François model active • Esquie coming soon
        </footer>
      </div>
    </main>
  );
}