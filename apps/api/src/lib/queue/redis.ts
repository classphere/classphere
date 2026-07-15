import { Redis } from "ioredis";

// Use an environment variable for Upstash or a local fallback
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

connection.on("error", (err) => {
  console.error("[Redis Error]", err);
});

export default connection;
