"use client";
import { useEffect, useState } from "react";
import { useGame } from "./GameShell";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/Button";

export function ResultDialog() {
  const { engine } = useGame();
  const { result } = engine;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(engine.isOver);
  }, [engine.isOver]);

  if (!result) return null;

  const title =
    result.outcome === "win"
      ? "Victory!"
      : result.outcome === "lose"
      ? "Defeat"
      : "Draw";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title={title}>
        <div className="space-y-4 text-sm">
          <p>
            Tours: <span className="font-semibold">{result.turns}</span>
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setOpen(false);
                engine.restart();
              }}
              variant="solid"
              className="flex-1"
            >
              Play Again
            </Button>
            <Button
              onClick={() => setOpen(false)}
              variant="ghost"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}