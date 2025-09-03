"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Action, State } from "@/lib/rl/types";
import { initialState, stepWithPower, encodeState, MAX_HP } from "@/lib/rl/env";
import { useEpisodeLogger } from "@/hooks/useEpisodeLogger";
import { audio } from "@/lib/audio";

export type BattleEvent =
  | { type: "attack"; who: "ai" | "player"; dmg: number }
  | { type: "defend"; who: "ai" | "player" }
  | { type: "charge"; who: "ai" | "player" }
  | { type: "turn"; n: number }
  | { type: "result"; outcome: "win" | "lose" | "draw" };

export type Result = { outcome: "win" | "lose" | "draw"; turns: number };

type QRow = [number, number, number];
type QTable = Record<string, QRow>;

interface QTableData {
  version: number;
  q: QTable;
}

interface EngineOptions {
  epsilon: number;
  onError?: (msg: string) => void;
}

type BattleEventExtended =
  | BattleEvent
  | { type: "attack"; who: "ai" | "player"; dmg: number; spend: number };

export function useGameEngine(opts: EngineOptions) {
  const { epsilon } = opts;
  const [state, setState] = useState<State>(() => initialState());
  const [isResolving, setIsResolving] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [playerPending, setPlayerPending] = useState<Action | null>(null);
  const [qTable, setQTable] = useState<QTableData | null>(null);
  const [serverStatus, setServerStatus] = useState<"ok" | "error" | "loading">("loading");
  const [playerAttackSpend, setPlayerAttackSpend] = useState(1);

  const logger = useEpisodeLogger(qTable?.version ?? 0);
  const mounted = useRef(true);

  // Load Q-table on mount
  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        setServerStatus("loading");
        const res = await fetch("/api/qtable", { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json().catch(() => {
          throw new Error("invalid json");
        });
        if (mounted.current) {
          setQTable({ version: json.version, q: json.q || {} });
          setServerStatus("ok");
        }
      } catch {
        if (mounted.current) {
          setServerStatus("error");
          opts.onError?.("Impossible de charger la Q-table");
        }
      }
    })();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remap (p* = IA, e* = joueur)
  const hpRatioPlayer = state.eHP / MAX_HP;
  const hpRatioAI = state.pHP / MAX_HP;

  const chooseAIAction = useCallback(
    (s: State): Action => {
      const key = encodeState(s);
      const row = qTable?.q[key];
      // epsilon-greedy
      if (Math.random() < epsilon || !row) {
        // heuristic fallback when no knowledge
        if (!row) {
          if (s.pCharge > 0 && Math.random() < 0.7) return Action.ATTACK;
          if (s.pCharge === 0 && Math.random() < 0.7) return Action.CHARGE;
          return Action.DEFEND;
        }
        return (Math.random() * 3) | 0;
      }
      let bestIdx: Action = 0;
      let bestVal: number = row[0]; // tuple index 0 always exists
      // For a fixed-length tuple, generic numeric indexing yields (number | undefined); guard with ??
      for (let i = 1; i < 3; i++) {
        const candidate = row[i] ?? Number.NEGATIVE_INFINITY;
        if (candidate > bestVal) {
          bestVal = candidate;
          bestIdx = i as Action;
        }
      }
      return bestIdx;
    },
    [qTable, epsilon]
  );

  const appendEvents = useCallback((evs: BattleEvent[]) => {
    setEvents((prev) => [...prev, ...evs]);
  }, []);

  const resolveTurn = useCallback(async () => {
    if (playerPending == null || isResolving || isOver) return;
    setIsResolving(true);

    const prev = state;
    const aiAction = chooseAIAction(prev);

    // Politique simple IA : dépense tout en attaque
    const aiSpend = aiAction === Action.ATTACK ? prev.pCharge : 0;
    const plSpend = playerPending === Action.ATTACK
      ? Math.max(1, Math.min(playerAttackSpend, prev.eCharge))
      : 0;

    const { s2, r, done } = stepWithPower(prev, aiAction, aiSpend, playerPending, plSpend);

    const dmgPlayerToAI = Math.max(0, prev.pHP - s2.pHP);
    const dmgAIToPlayer = Math.max(0, prev.eHP - s2.eHP);

    const evs: BattleEventExtended[] = [{ type: "turn", n: s2.turn }];

    if (playerPending === Action.ATTACK) {
      evs.push({ type: "attack", who: "player", dmg: dmgPlayerToAI, spend: plSpend });
      if (dmgPlayerToAI > 0) audio.play("attack");
    } else if (playerPending === Action.DEFEND) {
      evs.push({ type: "defend", who: "player" }); audio.play("defend");
    } else if (playerPending === Action.CHARGE) {
      evs.push({ type: "charge", who: "player" }); audio.play("charge");
    }

    if (aiAction === Action.ATTACK) {
      evs.push({ type: "attack", who: "ai", dmg: dmgAIToPlayer, spend: aiSpend });
    } else if (aiAction === Action.DEFEND) {
      evs.push({ type: "defend", who: "ai" });
    } else if (aiAction === Action.CHARGE) {
      evs.push({ type: "charge", who: "ai" });
    }

    logger.logStep(aiAction, playerPending, aiSpend, plSpend);
    setState(s2);
    appendEvents(evs as BattleEvent[]);
    setPlayerPending(null);
    setPlayerAttackSpend(1);

    if (done) {
      const outcome: Result["outcome"] = r === 0 ? "draw" : r > 0 ? "win" : "lose";
      appendEvents([{ type: "result", outcome }]);
      setIsOver(true);
      setResult({ outcome, turns: s2.turn });
      audio.play(outcome === "win" ? "win" : "lose");
      try {
        const res = await logger.submit();
        if (res?.newVersion && res.newVersion !== qTable?.version) {
          const qtRes = await fetch("/api/qtable", { cache: "no-store" });
          if (qtRes.ok) {
            const json = await qtRes.json().catch(() => null);
            if (json && mounted.current) {
              setQTable({ version: json.version, q: json.q || {} });
            }
          }
        }
      } catch {
        opts.onError?.("Erreur en soumettant l'épisode");
      }
    }

    if (mounted.current) setIsResolving(false);
  }, [appendEvents, chooseAIAction, isOver, isResolving, logger, playerAttackSpend, playerPending, state, qTable?.version, opts]);

  const playerPick = useCallback(
    (a: Action) => {
      if (isResolving || isOver) return;
      setPlayerPending(a);
      if (a !== Action.ATTACK) setPlayerAttackSpend(1);
    },
    [isResolving, isOver]
  );

  const setAttackSpend = useCallback((n: number) => {
    setPlayerAttackSpend(n);
  }, []);

  const confirm = useCallback(() => {
    if (playerPending != null) resolveTurn();
  }, [playerPending, resolveTurn]);

  const restart = useCallback(() => {
    setState(initialState());
    setEvents([]);
    setIsOver(false);
    setResult(null);
    setPlayerPending(null);
    setPlayerAttackSpend(1);
  }, []);

  const hpBarColor = useCallback((ratio: number) => {
    if (ratio > 0.66) return "from-green-500 to-green-400";
    if (ratio > 0.33) return "from-amber-500 to-amber-400";
    return "from-red-600 to-red-500";
  }, []);

  return {
    state,
    hpRatioPlayer,
    hpRatioAI,
    hpBarColor,
    events,
    playerPending,
    playerAttackSpend,
    setAttackSpend,
    isResolving,
    isOver,
    result,
    qVersion: qTable?.version,
    qLoaded: !!qTable,
    serverStatus,
    playerPick,
    confirm,
    restart,
    chooseAIAction,
    setVolume: (v: number) => audio.setVolume(v),
    setEpsilon: () => {}, // compat
  };
}