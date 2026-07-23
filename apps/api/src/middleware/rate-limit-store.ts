import { env } from "../config/env";
import { connection as redisConnection } from "./queue/redis";

/**
 * Optional Redis-backed store for express-rate-limit.
 *
 * `rate-limit-redis` is loaded lazily so the API starts even when the package
 * isn't installed yet (e.g. a fresh checkout before `npm install`). When it is
 * present AND REDIS_URL is configured, counters are shared across replicas.
 * Otherwise the limiter falls back to express-rate-limit's in-memory store
 * (fine for single-instance dev).
 *
 * The store is created once and shared by the global limiter (index.ts) and the
 * auth limiter (auth-rate-limit.ts) so they all hit the same Redis keyspace.
 */
let RedisStoreCtor: any | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ({ RedisStore: RedisStoreCtor } = require("rate-limit-redis"));
} catch {
  RedisStoreCtor = undefined; // package not installed — in-memory fallback
}

let cachedStore: any | undefined | null = null;

export function getRateLimitStore(): any | undefined {
  if (cachedStore !== null) return cachedStore ?? undefined;
  if (env.REDIS_URL && RedisStoreCtor) {
    cachedStore = new RedisStoreCtor({
      sendCommand: (command: string, ...args: string[]) =>
        redisConnection.call(command, ...args) as Promise<number>,
    });
  } else {
    cachedStore = undefined; // in-memory fallback
  }
  return cachedStore ?? undefined;
}
