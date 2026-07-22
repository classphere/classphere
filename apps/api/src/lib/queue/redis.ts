import { Redis, RedisOptions } from "ioredis";
import { env } from "../../config/env";

// Resolve from validated env (falls back to a local dev redis when unset).
const REDIS_URL = env.REDIS_URL || "redis://localhost:6379";

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
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
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
