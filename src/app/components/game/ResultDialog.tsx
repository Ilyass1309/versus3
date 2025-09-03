"use client";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";
import { useGame } from "./GameShell";
import { Button } from "@/app/components/ui/Button";

export function ResultDialog() {
  const { engine, result } = useGame();
  return (
    <Dialog open={engine.isOver} onOpenChange={() => {}}>
      {result && (
        <DialogContent title="Fin du match">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-semibold">
                {result.outcome === "win" ? "Victoire !" : result.outcome === "lose" ? "Défaite" : "Égalité"}
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Tours: {result.turns}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => engine.restart()} variant="solid">
                Rejouer
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}