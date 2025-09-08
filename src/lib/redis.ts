import Redis from "ioredis";

declare global {
  // Evite de recréer un client en dev / hot-reload
  // eslint-disable-next-line no-var
  var __REDIS__: Redis | undefined;
}

function createClient() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("Missing REDIS_URL");
  // Si ton provider impose TLS, utilise "rediss://" dans REDIS_URL.
  // Pour redis:// simple, ioredis gère l’URL directement.
  return new Redis(url, {
    // Si tu dois forcer TLS: tls: {}
  });
}

export const redis: Redis =
  globalThis.__REDIS__ ?? (globalThis.__REDIS__ = createClient());