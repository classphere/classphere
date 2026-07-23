import "./config/env";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import * as Sentry from "@sentry/node";
import "@sentry/profiling-node"; // Profiling
import { env } from "./config/env";
import { getRateLimitStore } from "./middleware/rate-limit-store";
import { connection as redisConnection } from "./lib/queue/redis";

const app = express();
app.set("trust proxy", 1); // Trust first proxy (Railway load balancer)
const port = env.PORT;
const appBaseDomain = env.APP_BASE_DOMAIN.toLowerCase();
const escapedBaseDomain = appBaseDomain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const allowedCustomWebOrigins = new Set(
  (env.ALLOWED_WEB_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

// ─── Sentry Initialization ─────────────────────────────────────────────────────
Sentry.init({
  dsn: env.SENTRY_DSN,
  integrations: [
    ...(Sentry as any).autoDiscoverNodePerformanceMonitoringIntegrations?.() || [],
  ],
  // 100% sampling is fine for staging but prohibitively expensive + noisy at
  // 10k users. Sample 10% of normal transactions, keep 100% for errors (Sentry
  // captures errors regardless of sample rate). Profiling at 2%.
  tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
  profilesSampleRate: env.NODE_ENV === "production" ? 0.02 : 1.0,
});

// The request handler must be the first middleware on the app
Sentry.setupExpressErrorHandler(app);

// ─── Redis-backed rate limit store ─────────────────────────────────────────────
// Lazily loaded via middleware/rate-limit-store so the app starts even if
// rate-limit-redis isn't installed yet (in-memory fallback). When REDIS_URL is
// set and the package is present, counters are shared across replicas.
const rateLimitStore = getRateLimitStore();

// ─── Global Middleware ────────────────────────────────────────────────────────
// 1. Security Headers
app.use(helmet());

// 2. Strict CORS
const allowedOrigins = [
  "http://localhost:3000",
  `https://${appBaseDomain}`,
  `https://www.${appBaseDomain}`,
];
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Non-browser clients (curl, mobile) send no Origin. Allowing them is
    // required for the API to be usable, but log in production for visibility.
    if (!origin) {
      if (env.NODE_ENV === "production") console.debug("[CORS] no-origin request allowed");
      return callback(null, true);
    }

    // In development mode, allow all localhost and 127.0.0.1 subdomains/ports
    if (env.NODE_ENV !== "production") {
      if (/^https?:\/\/([a-zA-Z0-9-_\.]+\.)?localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
    }

    // Production: direct Classphere institute subdomains.
    const isProdSubdomain = new RegExp(`^https:\\/\\/[a-z0-9-]+\\.${escapedBaseDomain}$`).test(origin);

    // Local dev: *.localhost:PORT (e.g. test.localhost:3000, allen.localhost:3000)
    const isLocalSubdomain = /^http:\/\/[a-z0-9-_\.]+\.localhost(:\d+)?$/.test(origin);

    if (allowedOrigins.includes(origin) || allowedCustomWebOrigins.has(origin) || isProdSubdomain || isLocalSubdomain) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Origin: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// 3. Rate Limiting — Redis-backed so counts are shared across replicas.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 per IP per 15 min (raised slightly to fit a real session; login has its own tighter limiter)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests from this IP, please try again after 15 minutes" },
  // @ts-ignore — store is optional in the type but accepted at runtime
  store: rateLimitStore,
});
app.use(globalLimiter as any);

// 1MB default body limit. The few routes that need more (file-upload metadata)
// can override per-route. A 10MB global limit let a single request consume
// disproportionate memory before any auth/validation ran.
app.use(express.json({ limit: "1mb" }));

// ─── Background Workers ───────────────────────────────────────────────────────
if (process.env.START_WORKERS === "true") {
  console.log("[API] Initializing background workers (analysis & lifecycle & pdf-extraction) inside this process...");
  require("./workers/analysis.worker");
  require("./workers/pdf-extraction.worker");
  const { setupLifecycleCron } = require("./workers/lifecycle.worker");
  setupLifecycleCron().catch((err: any) => console.error("[API] Lifecycle cron setup failed:", err));
} else {
  console.log("[API] Background workers disabled in this process (scaling separately).");
}

// ─── API Routes ───────────────────────────────────────────────────────────────
import apiRouter from "./routes/index";

// All routes are prefixed with /api/v1
app.use("/api/v1", apiRouter);

// ─── Health Checks ────────────────────────────────────────────────────────────
// Liveness: process is up (used by LB). Cheap, no dependencies checked.
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Classphere API is running", version: "v1" });
});

// Readiness: dependencies (Supabase + Redis) are reachable. Returns 503 if any
// dependency is down so the load balancer stops sending traffic during an outage.
app.get("/health", async (req, res) => {
  const checks: Record<string, "ok" | "down"> = {};
  try {
    // Supabase: a cheap unauthenticated HEAD against the REST root.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
      method: "HEAD",
      signal: controller.signal,
      headers: { apiKey: env.SUPABASE_SERVICE_KEY },
    }).finally(() => clearTimeout(timeout));
    checks.supabase = "ok";
  } catch {
    checks.supabase = "down";
  }
  try {
    if (env.REDIS_URL) {
      await redisConnection.ping();
      checks.redis = "ok";
    } else {
      checks.redis = "ok"; // not configured — not a readiness failure in dev
    }
  } catch {
    checks.redis = "down";
  }
  const allOk = Object.values(checks).every((v) => v === "ok");
  res.status(allOk ? 200 : 503).json({ status: allOk ? "ok" : "degraded", checks });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Avoid logging full error objects which can include sensitive headers/PII.
  console.error("[Unhandled Error]", err?.message ?? err, err?.stack ? { stack: err.stack } : "");
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ─── Start + Graceful Shutdown ────────────────────────────────────────────────
const server = app.listen(port, () => {
  console.log(`[API] Classphere API Server running on port ${port}`);
  console.log(`[API] Routes mounted at /api/v1`);
});

let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[API] ${signal} received — draining connections...`);
  // Stop accepting new connections and finish in-flight requests.
  server.close((err) => {
    if (err) {
      console.error("[API] Error closing server:", err.message);
      process.exit(1);
    }
    console.log("[API] Server closed cleanly.");
    process.exit(0);
  });
  // Force-exit if something hangs (e.g. a long-lived SSE upload stream).
  setTimeout(() => {
    console.error("[API] Forced shutdown after 20s — some connections did not drain.");
    process.exit(1);
  }, 20000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
