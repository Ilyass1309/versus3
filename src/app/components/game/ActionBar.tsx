"use client";
import { useGame } from "./GameShell";
import { Button } from "@/app/components/ui/Button";
import { Tooltip } from "../ui/tooltip";
import { Action } from "@/lib/rl/types";
import { Sword, Shield, Battery, Check } from "lucide-react";
import { useEffect } from "react";
import { useHotkeys } from "@/hooks/useHotkeys";

export function ActionBar() {
  const { engine } = useGame();

  useHotkeys({
    a: () => onPick(Action.ATTACK),
    d: () => onPick(Action.DEFEND),
    c: () => onPick(Action.CHARGE),
    enter: () => engine.confirm(),
    r: () => engine.restart(),
  }, [engine.playerPending, engine.isResolving, engine.isOver]);

  function onPick(a: Action) {
    if (engine.isResolving || engine.isOver) return;
    engine.playerPick(a);
    if (window.navigator.vibrate) window.navigator.vibrate(8);
  }

  useEffect(() => {
    if (engine.isOver) return;
  }, [engine.isOver]);

  const disabled = engine.isResolving || engine.isOver;
  return (
    <div className="w-full max-w-5xl mt-6 flex flex-col gap-3">
      <div className="flex gap-3 flex-col md:flex-row">
        <Tooltip label="Attaque (A)">
          <Button
            aria-label="Attaquer"
            onClick={() => onPick(Action.ATTACK)}
            variant="solid"
            size="lg"
            glow={engine.playerPending === Action.ATTACK}
            disabled={disabled}
            className="flex-1"
          >
            <Sword size={20} />
            Attack
          </Button>
        </Tooltip>
        <Tooltip label="Défense (D)">
          <Button
            aria-label="Défendre"
            onClick={() => onPick(Action.DEFEND)}
            variant="ghost"
            size="lg"
            glow={engine.playerPending === Action.DEFEND}
            disabled={disabled}
            className="flex-1"
          >
            <Shield size={20} />
            Defend
          </Button>
        </Tooltip>
        <Tooltip label="Charger (C)">
          <Button
            aria-label="Charger"
            onClick={() => onPick(Action.CHARGE)}
            variant="ghost"
            size="lg"
            glow={engine.playerPending === Action.CHARGE}
            disabled={disabled}
            className="flex-1"
          >
            <Battery size={20} />
            Charge
          </Button>
        </Tooltip>
      </div>
      <div className="flex gap-3">
        <Tooltip label="Valider le tour (Enter)">
          <Button
            aria-label="Valider"
            onClick={() => engine.confirm()}
            disabled={engine.playerPending == null || engine.isResolving || engine.isOver}
            variant="solid"
            className="flex-1"
          >
            <Check size={18} />
            Ready
          </Button>
        </Tooltip>
        <Button
          aria-label="Recommencer (R)"
          onClick={() => engine.restart()}
          variant="ghost"
          className="flex-1"
          disabled={engine.isResolving}
        >
          Restart
        </Button>
      </div>
    </div>
  );
}