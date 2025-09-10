"use client";

import { useEffect, useState } from "react";
import { useGame } from "./GameShell";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/Button";

export default function ResultDialog(props: any) {
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

  // secure: tell server to record a win using session (server must deduce user from cookie)
  async function reportWinToServer() {
    try {
      await fetch("/api/game/record-win", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      // best-effort, don't block UI
      console.warn("reportWin failed", err);
    }
  }

  useEffect(() => {
    // ...existing code that computes result...
    // replace any insecure client-side increment call by a call to reportWinToServer()
    if (props.result?.winner === "player") {
      void reportWinToServer();
    }
  }, [props.result]);

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