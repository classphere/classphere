import { Redis, RedisOptions } from "ioredis";

// Use an environment variable for Upstash or a local fallback
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const getRedisOptions = (): RedisOptions => {
  if (REDIS_URL.startsWith("rediss://") || REDIS_URL.startsWith("redis://")) {
    try {
      const url = new URL(REDIS_URL);
      return {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : (url.protocol === "rediss:" ? 6379 : 6379),
        username: url.username ? decodeURIComponent(url.username) : undefined,
        password: url.password ? decodeURIComponent(url.password) : undefined,
        tls: url.protocol === "rediss:" ? { rejectUnauthorized: false } : undefined,
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
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

export const connection = createRedisClient();

connection.on("error", (err) => {
  console.error("[Redis Error]", err);
});

export default connection;
