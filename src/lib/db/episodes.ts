import { sql } from "./sql";

export async function logEpisode(params: {
  clientVersion?: number | null;
  steps: Array<{ aAI: number; aPL: number }>;
  turns: number;
  aiWin: boolean;
  reason: string;
}) {
  const stepsJson = JSON.stringify(params.steps);
  await sql`
    INSERT INTO episodes (client_version, steps, turns, ai_win, reason)
    VALUES (
      ${params.clientVersion ?? null},
      ${stepsJson}::jsonb,
      ${params.turns},
      ${params.aiWin},
      ${params.reason}
    )
  `;
}
