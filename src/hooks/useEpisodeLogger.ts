import { useRef, useState, useCallback } from "react";

type LoggedStep = { aAI: 0|1|2; aPL: 0|1|2; nAI?: number; nPL?: number };

export function useEpisodeLogger(version: number) {
  const steps = useRef<LoggedStep[]>([]);
  const [busy, setBusy] = useState(false);
  const submittedRef = useRef(false);

  function logStep(aAI: 0|1|2, aPL: 0|1|2, nAI?: number, nPL?: number) {
    steps.current.push({ aAI, aPL, nAI, nPL });
  }

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    if (steps.current.length === 0) return;
    submittedRef.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientVersion: version,
          steps: steps.current,
        })
      });
      if (!res.ok) {
        // Optionnel: réautoriser soumis si échec pour réessayer
        submittedRef.current = false;
      }
    } catch {
      submittedRef.current = false;
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
