// Client-only singleton to avoid reconnect races
"use client";
import Pusher, { Options } from "pusher-js";

declare global {
  interface Window {
    __PUSHER__?: Pusher;
  }
}

export function getPusher(): Pusher {
  if (typeof window === "undefined") {
    throw new Error("getPusher must be used on client");
  }
  if (window.__PUSHER__) return window.__PUSHER__;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu";
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_PUSHER_KEY");
  }
  const opts: Options = {
    cluster,
    authEndpoint: "/api/pusher/auth",
  };
  window.__PUSHER__ = new Pusher(key, opts);
  return window.__PUSHER__;
}