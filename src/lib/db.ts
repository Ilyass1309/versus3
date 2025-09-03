import { sql } from "@vercel/postgres";
import type { QTable } from "./rl/qtable";

type QRowDB = { id: number; version: number; qjson: QTable };

export async function getQTable(): Promise<{ version: number; q: QTable }> {
  const { rows } = await sql<QRowDB>`
    SELECT id, version, qjson
    FROM qtable
    WHERE id = 1
  `;
  if (rows.length === 0) {
    const inserted = await sql<QRowDB>`
      INSERT INTO qtable (id, version, qjson)
      VALUES (1, 1, '{}'::jsonb)
      ON CONFLICT (id) DO NOTHING
      RETURNING id, version, qjson
    `;
    const row = inserted.rows[0] ?? { id: 1, version: 1, qjson: {} as QTable };
    return { version: row.version, q: row.qjson };
  }
  const row = rows[0] ?? { id: 1, version: 1, qjson: {} as QTable };
  return { version: row.version, q: row.qjson };
}

/**
 * Verrouille la Q-table (ligne id=1), applique updater(q), persiste et incrémente version.
 */
export async function withLockedQTable(
  updater: (q: QTable) => Promise<void> | void
): Promise<{ version: number; q: QTable }> {
  const client = await sql.connect();
  try {
    await client.sql`BEGIN`;
    // Lock (ou créer si absent)
    let { rows } = await client.sql<QRowDB>`
      SELECT id, version, qjson
      FROM qtable
      WHERE id = 1
      FOR UPDATE
    `;
    if (rows.length === 0) {
      const inserted = await client.sql<QRowDB>`
        INSERT INTO qtable (id, version, qjson)
        VALUES (1, 1, '{}'::jsonb)
        ON CONFLICT (id) DO NOTHING
        RETURNING id, version, qjson
      `;
      rows = inserted.rows;
    }
    const current = rows[0] ?? { id: 1, version: 1, qjson: {} as QTable };

    // Clone défensif pour éviter des références cachées
    const q: QTable = JSON.parse(JSON.stringify(current.qjson || {}));

    await updater(q);

    const newVersion = current.version + 1;

    // UPSERT (id unique)
    const qJson = JSON.stringify(q);
    const { rows: updatedRows } = await client.sql<QRowDB>`
      INSERT INTO qtable (id, version, qjson, updated_at)
      VALUES (1, ${newVersion}, ${qJson}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        version = EXCLUDED.version,
        qjson = EXCLUDED.qjson,
        updated_at = NOW()
      RETURNING id, version, qjson
    `;

    const updated = updatedRows[0] ?? { id: 1, version: newVersion, qjson: q as QTable };
    await client.sql`COMMIT`;
    return { version: updated.version, q: updated.qjson };
  } catch (err) {
    await client.sql`ROLLBACK`;
    throw err;
  } finally {
    client.release();
  }
}

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
