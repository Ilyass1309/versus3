import Pusher from "pusher";

const {
  PUSHER_APP_ID,
  PUSHER_KEY,
  PUSHER_SECRET,
  PUSHER_CLUSTER,
} = process.env;

if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
  console.warn("[pusher] Missing env vars. Set PUSHER_* and NEXT_PUBLIC_PUSHER_* in Vercel.");
}

export const pusherServer = new Pusher({
  appId: PUSHER_APP_ID || "dummy",
  key: PUSHER_KEY || "dummy",
  secret: PUSHER_SECRET || "dummy",
  cluster: PUSHER_CLUSTER || "eu",
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