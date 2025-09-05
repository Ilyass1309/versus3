"use client";
import { useGame } from "./GameShell";
import { Button } from "@/app/components/ui/Button";
import { Tooltip } from "../ui/tooltip";
import { Action } from "@/lib/rl/types";
import { Sword, Shield, Battery, Check } from "lucide-react";
import { useEffect } from "react";
import { useHotkeys } from "@/hooks/useHotkeys";
import { Slider } from "@/app/components/ui/slider";

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
  const showSpend = engine.playerPending === Action.ATTACK && engine.state.eCharge > 1;

  return (
    <div className="w-full card-glass p-4 md:p-5 flex flex-col gap-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_6px_20px_-6px_rgba(0,0,0,0.45)]">
      <div className="flex gap-3 flex-col md:flex-row">
        <Tooltip label="Attaque (A)">
          <Button
            aria-label="Attaquer"
            onClick={() => onPick(Action.ATTACK)}
            variant="solid"
            size="lg"
            glow={engine.playerPending === Action.ATTACK}
            disabled={disabled}
            className={`flex-1 relative ${
              engine.playerPending === Action.ATTACK ? "ring-2 ring-indigo-400/60" : ""
            }`}
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
            className={`flex-1 relative ${
              engine.playerPending === Action.DEFEND ? "ring-2 ring-indigo-400/60" : ""
            }`}
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
            className={`flex-1 relative ${
              engine.playerPending === Action.CHARGE ? "ring-2 ring-indigo-400/60" : ""
            }`}
          >
            <Battery size={20} />
            Charge
          </Button>
        </Tooltip>
      </div>

      {showSpend && (
        <div className="glass p-3 flex flex-col gap-2">
          <div className="flex justify-between text-[11px] text-slate-300 font-medium">
            <span>Puissance attaque</span>
            <span>{engine.playerAttackSpend} / {engine.state.eCharge}</span>
          </div>
          <Slider
            value={[engine.playerAttackSpend]}
            onValueChange={v => {
              const raw = v[0] ?? 1;
              const val = Math.min(
                engine.state.eCharge,
                Math.max(1, Math.round(raw))
              );
              engine.setAttackSpend(val);
            }}
            min={1}
            max={engine.state.eCharge}
            step={1}
          />
        </div>
      )}

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