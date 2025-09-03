import { useRef, useState } from "react";

type Step = { aAI: 0 | 1 | 2; aPL: 0 | 1 | 2 };
type LoggedStep = { aAI: 0 | 1 | 2; aPL: 0 | 1 | 2; nAI?: number; nPL?: number };

export function useEpisodeLogger(version: number) {
  const steps = useRef<LoggedStep[]>([]);
  const [busy, setBusy] = useState(false);

  function logStep(aAI: 0 | 1 | 2, aPL: 0 | 1 | 2, nAI?: number, nPL?: number) {
    steps.current.push({ aAI, aPL, nAI, nPL });
  }

  async function submit() {
    if (steps.current.length === 0) return null;
    const payload = { clientVersion: version, steps: steps.current };
    setBusy(true);
    try {
      const res = await fetch("/api/episode", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => null);
      steps.current = [];
      return json;
    } catch {
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { logStep, submit, busy, lastVersion: version };
}
