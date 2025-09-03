"use client";

import { useEffect, useState } from "react";
import { useEpisodeLogger } from "@/hooks/useEpisodeLogger";

type QRow = [number, number, number];

export default function GameUI() {
  const [version, setVersion] = useState<number | null>(null);
  const [qSize, setQSize] = useState<number>(0);
  const { logStep, submit, busy, lastVersion } = useEpisodeLogger(1);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/qtable");
      const json = await res.json();
      setVersion(json.version);
      setQSize(Object.keys(json.q ?? {}).length);
    })();
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
      <p>Q-table version: <b>{version ?? "..."}</b></p>
      <p>Taille Q-table (états): <b>{qSize}</b></p>

      <button onClick={simulateMatch} disabled={busy} style={{ padding: "8px 12px" }}>
        {busy ? "Envoi..." : "Simuler un match (random)"}
      </button>

      {lastVersion && (
        <p style={{ marginTop: 8 }}>
          Dernière version renvoyée par le serveur : <b>{lastVersion}</b>
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <a href="/api/qtable/export" target="_blank" rel="noreferrer">Exporter la Q-table (JSON)</a>
      </div>
    </div>
  );
}
