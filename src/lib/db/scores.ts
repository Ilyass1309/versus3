import { sql } from "./sql";

export async function ensurePlayerScoresTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS player_scores (
      nickname TEXT PRIMARY KEY,
      wins INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function addPointsToNickname(nickname: string, delta: number) {
  if (!nickname) return;
  await ensurePlayerScoresTable();
  await sql`
    INSERT INTO player_scores (nickname, wins)
    VALUES (${nickname}, ${delta})
    ON CONFLICT (nickname)
    DO UPDATE SET
      wins = player_scores.wins + ${delta},
      updated_at = NOW()
  `;
}

export async function addPointsToUserId(userId: number, delta: number) {
  if (!userId) return;
  const rows = await sql<{ nickname: string }>`
    SELECT nickname FROM users WHERE id = ${userId}
  `;
  const row = rows[0];
  if (!row) return;
  await addPointsToNickname(row.nickname, delta);
}

export async function getLeaderboard(limit = 10): Promise<Array<{ nickname: string; wins: number }>> {
  await ensurePlayerScoresTable();
  const rows = await sql<{ nickname: string; wins: number }>`
    SELECT nickname, wins
    FROM player_scores
    ORDER BY wins DESC, nickname ASC
    LIMIT ${limit}
  `;
  return rows;
}

// alias compat
export async function getTopPlayers(limit = 10) {
  return getLeaderboard(limit);
}

/** Bonus: incrément sécurisé côté serveur pour un user authentifié */
export async function incrementAuthedPlayerWin(userId: number) {
  // log entry
  // eslint-disable-next-line no-console
  console.log("[scores] incrementAuthedPlayerWin called for userId:", userId);

  await ensurePlayerScoresTable();

  const rows = await sql<{ nickname: string }>`SELECT nickname FROM users WHERE id=${userId}`;
  const row = rows[0];

  // log select result
  // eslint-disable-next-line no-console
  console.log("[scores] SELECT nickname result:", row ?? null);

  if (!row) {
    // eslint-disable-next-line no-console
    console.warn("[scores] No user found for id:", userId);
    return;
  }

  const nickname = row.nickname;
  // eslint-disable-next-line no-console
  console.log("[scores] will increment for nickname:", nickname);

  await sql`
    INSERT INTO player_scores (nickname, wins)
    VALUES (${nickname}, 1)
    ON CONFLICT (nickname)
    DO UPDATE SET wins = player_scores.wins + 1,
                  updated_at = NOW()
  `;

  // eslint-disable-next-line no-console
  console.log("[scores] increment completed for nickname:", nickname);
}
