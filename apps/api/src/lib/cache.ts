import { Redis } from "ioredis";
import { createRedisClient } from "./queue/redis";

// Separate connection from the BullMQ queue connection (lib/queue/redis.ts) —
// queues issue blocking commands that would otherwise hold up cache reads/writes
// sharing the same client.
let client: Redis | null = null;

const getClient = (): Redis => {
  if (!client) {
    client = createRedisClient();
    client.on("error", (err) => {
      console.error("[Cache Redis Error]", err);
    });
    client.on("reconnecting", (delay: number) => {
      console.warn(`[Redis:cache] reconnecting in ${delay}ms`);
    });
  }
  return client;
};

/**
 * Read-through cache for expensive read-heavy aggregations (rankings, leaderboards,
 * analytics). Failures (Redis down, serialization errors) fail open — falls back to
 * calling `compute` directly so a cache outage never breaks the endpoint.
 */
export const getOrSetCache = async <T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> => {
  try {
    const cached = await getClient().get(key);
    if (cached != null) return JSON.parse(cached) as T;
  } catch (err) {
    console.error("[Cache read error]", key, err);
  }

  const value = await compute();

  try {
    await getClient().set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.error("[Cache write error]", key, err);
  }

  return value;
};
