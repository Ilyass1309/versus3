"use client";
import { useGame } from "./GameShell";
import { usePlayer } from "@/app/providers/PlayerProvider";
import { useState } from "react";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";
import Link from "next/link";

export function GameHeader() {
  const { engine } = useGame();
  const { nickname, setNickname } = usePlayer();
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(nickname || "");
  const status = engine.serverStatus;

  return (
    <header className="w-full mb-2 flex flex-col gap-4 md:gap-2">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <h1
              className="relative font-extrabold tracking-tight text-3xl md:text-4xl leading-none"
              aria-label="Versus III"
            >
              <span className="inline-block bg-gradient-to-r from-indigo-300 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent animate-gradient-x drop-shadow-[0_0_8px_rgba(236,72,153,0.35)]">
                VERSUS <span className="text-white/70">III</span>
              </span>
            </h1>
            <div className="absolute -inset-2 blur-2xl bg-gradient-to-r from-indigo-500/20 via-fuchsia-500/10 to-rose-500/20 glow-pulse pointer-events-none" />
          </div>
          <span
            className={`text-[10px] px-2 py-1 rounded-full border uppercase tracking-wide ${
              status === "ok"
                ? "border-emerald-400/40 text-emerald-300"
                : status === "error"
                ? "border-rose-400/40 text-rose-300"
                : "border-slate-400/30 text-slate-400/80"
            }`}
          >
            {status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/stats"
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition focus:outline-none focus-visible:ring ring-indigo-400/60"
          >
            Stats
          </Link>
          {nickname && (
            <button
              onClick={() => {
                setTemp(nickname);
                setOpen(true);
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition focus:outline-none focus-visible:ring ring-indigo-400/60"
            >
              {nickname}
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] md:text-xs text-slate-400 tracking-wide uppercase">
        Duel tactique • Charge / Défense / Frappe • Intelligence Adaptative
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Changer de nom"
          description="Modifiez et sauvegardez votre pseudonyme (3 à 16 caractères)."
          idBase="nickname"
        >
          <div className="space-y-4 text-sm">
            <label className="block text-xs font-medium uppercase tracking-wider">
              Pseudo
              <input
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                maxLength={16}
                className="mt-1 w-full rounded bg-slate-800/60 border border-white/15 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 ring-indigo-400/60"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 text-xs px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/10"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (temp.trim().length >= 3) setNickname(temp.trim());
                  setOpen(false);
                }}
                className="flex-1 text-xs px-3 py-2 rounded bg-gradient-to-r from-indigo-500 to-fuchsia-500 font-medium"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}