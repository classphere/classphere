import { env } from "../config/env";
import { connection as redisConnection } from "../lib/queue/redis";

/**
 * Optional Redis-backed store for express-rate-limit.
 *
 * `rate-limit-redis` is loaded lazily so the API starts even when the package
 * isn't installed yet (e.g. a fresh checkout before `npm install`).
 *
 * IMPORTANT: express-rate-limit v8 forbids sharing one Store instance across
 * multiple limiters (ERR_ERL_STORE_REUSE). Each limiter MUST call this with a
 * unique `prefix` and gets its own fresh store instance. The prefix also
 * namespaces the Redis keys so the limiters don't interfere with each other.
 *
 * Returns undefined (in-memory fallback) when rate-limit-redis isn't installed,
 * REDIS_URL isn't configured, or Redis is unavailable (e.g. quota exhausted).
 */
let RedisStoreCtor: any | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ({ RedisStore: RedisStoreCtor } = require("rate-limit-redis"));
} catch {
  RedisStoreCtor = undefined; // package not installed — in-memory fallback
}

const REDIS_COMMAND_TIMEOUT_MS = 1_500;

export function getRateLimitStore(prefix: string): any | undefined {
  if (!env.REDIS_URL || !RedisStoreCtor) return undefined;
  try {
    const store = new RedisStoreCtor({
      prefix,
      sendCommand: async (command: string, ...args: string[]) => {
        // ioredis queues commands indefinitely while it reconnects by default.
        // A rate limiter must never make the API unavailable when Redis is down.
        //
        // The rejection is created eagerly by rate-limit-redis's *constructor*
        // (loadIncrementScript/loadGetScript run before init(), so the wrapper
        // below never sees them). Nothing awaits those two promises, so each
        // one surfaced as an "Unhandled Promise rejection" at boot. Rejecting a
        // pre-caught promise keeps the fail-fast behaviour without the noise.
        if (redisConnection.status !== "ready") {
          const unavailable = Promise.reject(new Error("Redis rate-limit store is unavailable"));
          unavailable.catch(() => { /* marked handled; the caller still gets the rejection */ });
          return unavailable;
        }

        try {
          return await Promise.race([
            redisConnection.call(command, ...args) as Promise<number>,
            new Promise<never>((_, reject) => {
              setTimeout(
                () => reject(new Error(`Redis rate-limit command timed out after ${REDIS_COMMAND_TIMEOUT_MS}ms`)),
                REDIS_COMMAND_TIMEOUT_MS,
              );
            }),
          ]);
        } catch (err: any) {
          console.warn("[rate-limit] Redis command failed:", err?.message ?? err);
          throw err;
        }
      },
    });

    // express-rate-limit v8 calls store.init() without await or try/catch.
    // If the SCRIPT LOAD inside init() fails (e.g. Upstash quota exhausted),
    // the rejection becomes unhandled and crashes the process. We wrap init()
    // here so any failure is swallowed and logged instead.
    const originalInit = store.init?.bind(store);
    if (typeof originalInit === "function") {
      store.init = async (...args: any[]) => {
        try {
          await originalInit(...args);
        } catch (err: any) {
          console.warn(
            "[rate-limit] Redis store init failed (SCRIPT LOAD rejected). " +
            "Rate limiting will use in-memory fallback until Redis recovers. " +
            "Reason:", err?.message ?? err,
          );
          // Don't re-throw — express-rate-limit will call increment() per
          // request, which will throw (no SHA loaded), and express-rate-limit
          // catches store errors and falls through to allow the request.
        }
      };
    }

    return store;
  } catch (err: any) {
    console.warn("[rate-limit] Redis store creation failed, using in-memory fallback:", err?.message ?? err);
    return undefined;
  }
}
