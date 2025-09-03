"use client";
import { Dialog, DialogTrigger, DialogContent } from "@/app/components/ui/dialog";
import { useSettings, useGame } from "./GameShell";
import { Slider } from "@/app/components/ui/slider";
import { Switch } from "@/app/components/ui/switch";
import { Settings } from "lucide-react";
import { useState } from "react";

export function SettingsSheet() {
  const settings = useSettings();
  const { engine } = useGame();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition"
          aria-label="Paramètres"
        >
          <Settings size={14} />
          Settings
        </button>
      </DialogTrigger>
      <DialogContent title="Paramètres">
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">
              Epsilon (exploration IA): {settings.epsilon.toFixed(2)}
            </label>
            <Slider
              value={[settings.epsilon]}
              onValueChange={(vals) => {
                const raw = vals[0];
                const val = typeof raw === "number" ? Number(raw.toFixed(2)) : 0;
                settings.setEpsilon(val);
              }}
              min={0}
              max={0.5}
              step={0.01}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">
              Volume SFX: {(settings.volume * 100).toFixed(0)}%
            </label>
            <Slider
              value={[settings.volume]}
              onValueChange={(vals) => {
                const raw = vals[0];
                const val = typeof raw === "number" ? Number(raw.toFixed(2)) : 0;
                settings.setVolume(val);
              }}
              min={0}
              max={1}
              step={0.01}
            />
          </div>
          <div className="flex gap-4">
            <Switch
              checked={settings.theme === "dark"}
              onCheckedChange={(c) => settings.setTheme(c ? "dark" : "light")}
              label="Dark"
            />
            <button
              onClick={() => engine.restart()}
              className="text-xs px-3 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white"
            >
              Reset game
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Les paramètres sont locaux et ne changent pas l&apos;apprentissage côté serveur (épisodes envoyés seulement).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}