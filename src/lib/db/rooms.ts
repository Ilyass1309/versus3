import { sql } from "./sql";

export async function ensureRoomsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      host_nickname TEXT NOT NULL,
      players JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function createRoom(hostNickname: string) {
  await ensureRoomsTable();
  const id = Math.random().toString(36).slice(2, 10);
  const players = JSON.stringify([hostNickname]);
  await sql`
    INSERT INTO rooms (id, host_nickname, players, status)
    VALUES (${id}, ${hostNickname}, ${players}::jsonb, 'open')
  `;
  return { id, host: hostNickname };
}

export async function joinRoom(roomId: string, nickname: string) {
  await ensureRoomsTable();
  const rows = await sql<{ id: string; players: unknown; status: string }>`
    SELECT id, players, status FROM rooms WHERE id = ${roomId} LIMIT 1
  `;
  const r = rows[0];
  if (!r) throw new Error("room_not_found");
  if ((r.status ?? "open").toString().toLowerCase() !== "open") throw new Error("room_not_open");

  const current = Array.isArray(r.players) ? (r.players as unknown[]) : [];
  const players = current.map(String);
  if (!players.includes(nickname)) players.push(nickname);

  await sql`
    UPDATE rooms SET players = ${JSON.stringify(players)}::jsonb WHERE id = ${roomId}
  `;
  return { id: roomId, players };
}
