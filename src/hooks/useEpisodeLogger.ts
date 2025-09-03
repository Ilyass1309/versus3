import { useCallback, useRef, useState } from "react";

type Step = { aAI: 0 | 1 | 2; aPL: 0 | 1 | 2 };

export function useEpisodeLogger(clientVersion?: number) {
  const stepsRef = useRef<Step[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastVersion, setLastVersion] = useState<number | null>(null);

  const logStep = useCallback((aAI: 0 | 1 | 2, aPL: 0 | 1 | 2) => {
    stepsRef.current.push({ aAI, aPL });
  }, []);

  const reset = useCallback(() => {
    stepsRef.current = [];
  }, []);

  const submit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientVersion, steps: stepsRef.current }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Server error");
      setLastVersion(json.newVersion ?? null);
      stepsRef.current = [];
      return json;
    } finally {
      setBusy(false);
    }
  }, [busy, clientVersion]);

  return { logStep, submit, reset, busy, lastVersion };
}
