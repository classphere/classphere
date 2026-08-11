import { Redis, RedisOptions } from "ioredis";
import { env } from "../../config/env";

// Resolve from validated env (falls back to a local dev redis when unset).
const REDIS_URL = env.REDIS_URL || "redis://localhost:6379";

/**
 * Connection settings that keep an unreachable Redis from taking the process
 * down with it.
 *
 * `lazyConnect` is the important one. The shared client below is constructed at
 * import time, on a module the entry point pulls in before it builds the app,
 * so any connection work happens while the process is still starting and before
 * anything has been logged. Deferring it to first use means a Redis that is
 * slow or unreachable can no longer affect whether the server reaches
 * app.listen() — it degrades the features that need Redis instead of preventing
 * the process from serving at all.
 *
 * `connectTimeout` bounds the TCP handshake so a black-holed host fails and
 * retries rather than hanging on an open socket. ioredis reconnects on its own
 * afterwards, so this costs nothing in the normal case.
 */
const SAFE_CONNECT: RedisOptions = {
  lazyConnect: true,
  connectTimeout: 10_000,
};

export const getRedisOptions = (): RedisOptions => {
  if (REDIS_URL.startsWith("rediss://") || REDIS_URL.startsWith("redis://")) {
    try {
      const url = new URL(REDIS_URL);
      return {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 6379,
        username: url.username ? decodeURIComponent(url.username) : undefined,
        password: url.password ? decodeURIComponent(url.password) : undefined,
        // For `rediss://` (TLS), validate the certificate. Upstash and other
        // hosted Redis providers use publicly-trusted CAs, so the default trust
        // store works. Do NOT set rejectUnauthorized:false — that disables
        // certificate verification and allows man-in-the-middle attacks on the
        // queue (job payloads, tokens in job data).
        tls: url.protocol === "rediss:" ? { rejectUnauthorized: true } : undefined,
        // Required by BullMQ, and the reason an unreachable Redis is dangerous:
        // a command issued while disconnected queues indefinitely rather than
        // failing. Callers that cannot wait must set their own bound — see
        // rate-limit-store, which disables the offline queue for that reason.
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        ...SAFE_CONNECT,
      };
    } catch {
      // Fallback if URL parsing fails
    }
  }
  return {
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...SAFE_CONNECT,
  };
};

export const createRedisClient = (): Redis => {
  return new Redis(getRedisOptions() as any);
};

export const connection = createRedisClient();

connection.on("error", (err) => {
  console.error("[Redis Error]", err);
});

export default connection;
