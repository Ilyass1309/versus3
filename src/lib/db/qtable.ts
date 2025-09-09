import { sql } from "./sql";
import type { QTable } from "../rl/qtable"; // adapte le chemin si besoin

type QRowDB = { id: number; version: number; qjson: QTable };

export async function getQTable(): Promise<{ version: number; q: QTable }> {
  const rows = await sql<QRowDB>`
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
    const row = inserted[0] ?? { id: 1, version: 1, qjson: {} as QTable };
    return { version: row.version, q: row.qjson };
  }
  const row = rows[0] ?? { id: 1, version: 1, qjson: {} as QTable };
  return { version: row.version, q: row.qjson };
}

/**
 * Version simple non-transactionnelle (pas de locking strict).
 * Si besoin de lock strict, passer par un client transactionnel dédié.
 */
export async function withLockedQTable(
  updater: (q: QTable) => Promise<void> | void
): Promise<{ version: number; q: QTable }> {
  const rows = await sql<QRowDB>`
    SELECT id, version, qjson
    FROM qtable
    WHERE id = 1
  `;
  const current = rows[0] ?? { id: 1, version: 1, qjson: {} as QTable };

  const q: QTable = JSON.parse(JSON.stringify(current.qjson || {}));
  await updater(q);

  const newVersion = (current.version ?? 1) + 1;
  const qJson = JSON.stringify(q);

  const updatedRows = await sql<QRowDB>`
    INSERT INTO qtable (id, version, qjson, updated_at)
    VALUES (1, ${newVersion}, ${qJson}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      version = EXCLUDED.version,
      qjson = EXCLUDED.qjson,
      updated_at = NOW()
    RETURNING id, version, qjson
  `;
  const updated = updatedRows[0] ?? { id: 1, version: newVersion, qjson: q as QTable };
  return { version: updated.version, q: updated.qjson };
}
