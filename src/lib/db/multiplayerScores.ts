import { sql } from "./sql";

export async function ensureMultiplayerPointsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS multiplayer_points (
      nickname TEXT PRIMARY KEY,
      points INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function addMultiplayerPointsToNickname(nickname: string, delta: number) {
  if (!nickname) return;
  await ensureMultiplayerPointsTable();
  await sql`
    INSERT INTO multiplayer_points (nickname, points)
    VALUES (${nickname}, ${delta})
    ON CONFLICT (nickname)
    DO UPDATE SET
      points = multiplayer_points.points + ${delta},
      updated_at = NOW()
  `;
}

export async function addMultiplayerPointsToUserId(userId: number, delta: number) {
  if (!userId) return;
  const rows = await sql<{ nickname: string }>`SELECT nickname FROM users WHERE id = ${userId}`;
  const row = rows[0];
  if (!row) return;
  await addMultiplayerPointsToNickname(row.nickname, delta);
}

export async function getMultiplayerLeaderboard(limit = 20): Promise<Array<{ nickname: string; points: number }>> {
  await ensureMultiplayerPointsTable();
  const rows = await sql<{ nickname: string; points: number }>`
    SELECT nickname, points
    FROM multiplayer_points
    ORDER BY points DESC, nickname ASC
    LIMIT ${limit}
  `;
  return rows;
}
