"use client";

import { useEffect, useState } from "react";
import { useEpisodeLogger } from "@/hooks/useEpisodeLogger";

type QTable = Record<string, [number, number, number]>;

interface QTableApiResponse {
  version: number;
  q: QTable;
  error?: string;
}

export default function GameUI() {
  const [version, setVersion] = useState<number | null>(null);
  const [qSize, setQSize] = useState<number>(0);
  const { logStep, submit, busy, lastVersion } = useEpisodeLogger(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/qtable", { cache: "no-store" });
        const raw = await res.text();
        if (!res.ok) {
          console.error("qtable fetch error", res.status, raw);
          return;
        }
        if (!raw) {
          console.error("qtable empty response body");
          return;
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch (err) {
          console.error("Invalid JSON parse", err, raw);
          return;
        }
        if (cancelled) return;
        // Validation minimale
        if (
          !parsed ||
          typeof parsed !== "object" ||
          typeof (parsed as any).version !== "number" ||
          typeof (parsed as any).q !== "object"
        ) {
          console.error("Invalid response structure", parsed);
          return;
        }
        const json = parsed as QTableApiResponse;
        setVersion(json.version);
        setQSize(Object.keys(json.q ?? {}).length);
      } catch (err) {
        console.error("fetch /api/qtable failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const simulateMatch = async () => {
    // Simule un match de 15 tours max en random (à titre d’exemple)
    for (let i = 0; i < 15; i++) {
      const aAI = (Math.random() * 3) | 0; // 0..2
      const aPL = (Math.random() * 3) | 0;
      logStep(aAI as 0 | 1 | 2, aPL as 0 | 1 | 2);
    }
    const res = await submit();
    if (res?.newVersion) setVersion(res.newVersion);
  };

  return (
    <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
      <h2>Demo — Q-learning duel</h2>
      <p>
        Q-table version: <b>{version ?? "..."}</b>
      </p>
      <p>
        Taille Q-table (états): <b>{qSize}</b>
      </p>

      <button onClick={simulateMatch} disabled={busy} style={{ padding: "8px 12px" }}>
        {busy ? "Envoi..." : "Simuler un match (random)"}
      </button>

      {lastVersion && (
        <p style={{ marginTop: 8 }}>
          Dernière version renvoyée par le serveur : <b>{lastVersion}</b>
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <a href="/api/qtable/export" target="_blank" rel="noreferrer">
          Exporter la Q-table (JSON)
        </a>
      </div>
    </div>
  );
}
