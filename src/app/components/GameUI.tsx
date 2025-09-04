"use client";

import { useEffect, useState } from "react";
import { useEpisodeLogger } from "@/hooks/useEpisodeLogger";

type QTable = Record<string, [number, number, number]>;

interface QTableApiResponse {
  version: number;
  q: QTable;
  error?: string;
}

function isQTableApiResponse(v: unknown): v is QTableApiResponse {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.version === "number" && typeof o.q === "object" && o.q !== null;
}

export default function GameUI() {
  const [version, setVersion] = useState<number | null>(null);
  const [qSize, setQSize] = useState<number>(0);

  const { logStep, submit, busy } = useEpisodeLogger(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/qtable", { cache: "no-store" });
        const raw = await res.text();
        if (!res.ok || !raw) return;
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { return; }
        if (cancelled || !isQTableApiResponse(parsed)) return;
        setVersion(parsed.version);
        setQSize(Object.keys(parsed.q).length);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const simulateMatch = async () => {
    for (let i = 0; i < 15; i++) {
      const aAI = (Math.random() * 3) | 0;
      const aPL = (Math.random() * 3) | 0;
      logStep(aAI as 0 | 1 | 2, aPL as 0 | 1 | 2);
    }
    await submit();
  };

  return (
    <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
      <h2>Demo — Q-learning duel</h2>
      <p>Q-table version: <b>{version ?? "..."}</b></p>
      <p>Taille Q-table (états): <b>{qSize}</b></p>
      <button onClick={simulateMatch} disabled={busy} style={{ padding: "8px 12px" }}>
        {busy ? "Envoi..." : "Simuler un match (random)"}
      </button>
      <div style={{ marginTop: 16 }}>
        <a href="/api/qtable/export" target="_blank" rel="noreferrer">
          Exporter la Q-table (JSON)
        </a>
      </div>
    </div>
  );
}
