"use client";
import { useGame } from "./GameShell";
import { usePlayer } from "@/app/providers/PlayerProvider";
import { useState } from "react";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";

export function GameHeader() {
  const { engine } = useGame();
  const { nickname, setNickname } = usePlayer();
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(nickname || "");
  const status = engine.serverStatus;
  return (
    <header className="w-full max-w-5xl mb-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-wide text-slate-200">
          Versus III
        </h1>
        <span
          className={`text-[10px] px-2 py-1 rounded-full border ${
            status === "ok"
              ? "border-emerald-400/40 text-emerald-300"
              : status === "error"
              ? "border-rose-400/40 text-rose-300"
              : "border-slate-400/30 text-slate-300/70"
          }`}
        >
          {status}
        </span>
      </div>
      <div className="flex items-center gap-3">
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Changer de nom">
          <div className="space-y-4 text-sm">
            <label className="block text-xs font-medium uppercase tracking-wider">
              Pseudo
              <input
                value={temp}
                onChange={e => setTemp(e.target.value)}
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