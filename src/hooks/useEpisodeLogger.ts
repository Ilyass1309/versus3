import { useRef, useState, useCallback } from "react";

type LoggedStep = {
  aAI: 0|1|2;
  aPL: 0|1|2;
  hpAI: number;
  hpPL: number;
  spendAI?: number;
  spendPL?: number;
};

export function useEpisodeLogger(version: number) {
  const steps = useRef<LoggedStep[]>([]);
  const [busy, setBusy] = useState(false);
  const submittedRef = useRef(false);

  function logStep(
    aAI: 0|1|2,
    aPL: 0|1|2,
    hpAI: number,
    hpPL: number,
    spendAI?: number,
    spendPL?: number
  ) {
    steps.current.push({ aAI, aPL, hpAI, hpPL, spendAI, spendPL });
  }

  const submit = useCallback(async (finalResult?: "player"|"ai"|"draw") => {
    if (submittedRef.current) return;
    if (steps.current.length === 0) return;
    submittedRef.current = true;
    setBusy(true);
    try {
      await fetch("/api/episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientVersion: version,
          steps: steps.current,
          result: finalResult, // facultatif
        })
      });
    } catch {
      submittedRef.current = false; // autorise retry si erreur réseau
    } finally {
      setBusy(false);
    }
  }, [version]);

  function resetEpisode() {
    steps.current = [];
    submittedRef.current = false;
  }

  return { logStep, submit, resetEpisode, stepsCount: () => steps.current.length, busy };
}
