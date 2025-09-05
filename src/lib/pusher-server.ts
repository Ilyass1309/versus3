import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// --- Types ---
export interface RLState {
  pHP: number;
  eHP: number;
  pCharge: number;
  eCharge: number;
  turn: number;
}

export type PlayerAction = { action: number; spend: number };

export interface Match {
  id: string;
  createdAt: number;
  players: string[];
  state: RLState;
  actions: Record<string, PlayerAction>;
  turn: number;
  phase: "collect" | "resolve" | "ended";
}

// Stockage mémoire
declare global {
  var __MATCHES__: Map<string, Match> | undefined;
}

export const matches: Map<string, Match> =
  globalThis.__MATCHES__ ?? new Map<string, Match>();

if (!globalThis.__MATCHES__) {
  globalThis.__MATCHES__ = matches;
}