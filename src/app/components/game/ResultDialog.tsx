"use client";
import { useEffect, useState } from "react";
import { useGame } from "./GameShell";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/Button";
import { X } from "lucide-react";

export function ResultDialog() {
  const { engine } = useGame();
  const { result } = engine;
  const [open, setOpen] = useState(false);

  // Ouvre automatiquement à la fin, mais laisse l’utilisateur fermer la fenêtre sans relancer.
  useEffect(() => {
    if (engine.isOver) setOpen(true);
    else setOpen(false);
  }, [engine.isOver]);

  if (!result) return null;

  const title =
    result.outcome === "win"
      ? "Victoire !"
      : result.outcome === "lose"
      ? "Défaite"
      : "Égalité";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title={title}>
        <button
          aria-label="Fermer"
          onClick={() => setOpen(false)}
          className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 transition"
        >
          <X size={16} />
        </button>
        <div className="space-y-4 text-sm">
          <p>
            Tours: <span className="font-semibold">{result.turns}</span>
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => engine.restart()}
              variant="solid"
              className="flex-1"
            >
              Rejouer
            </Button>
            <Button
              onClick={() => setOpen(false)}
              variant="ghost"
              className="flex-1"
            >
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}