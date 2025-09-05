import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Ephemeral in-memory store (serverless = volatile)
type PlayerAction = { action: number; spend: number };
interface Match {
  id: string;
  createdAt: number;
  players: string[];            // user ids or anon tokens
  state: any;                   // RL state snapshot
  actions: Record<string, PlayerAction>;
  turn: number;
  phase: "collect" | "resolve" | "ended";
}
declare global {
  // eslint-disable-next-line no-var
  var __MATCHES__: Map<string, Match> | undefined;
}
export const matches = globalThis.__MATCHES__ ?? new Map<string, Match>();
if (!globalThis.__MATCHES__) globalThis.__MATCHES__ = matches;