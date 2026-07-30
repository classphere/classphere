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
import { supabaseDB } from "./lib/supabase";
// NOTE: "./worker" is deliberately NOT imported statically. Each worker module
// creates its BullMQ `new Worker(...)` at module load, so a top-level import
// would make this process a queue consumer even when START_WORKERS is false —
// silently double-consuming jobs alongside a dedicated worker deployment.
// It is required lazily below, only when workers are actually enabled.

// ─── Process-level error safety net ──────────────────────────────────────────
// Prevent ancillary services (Redis, BullMQ, etc.) from crashing the API
// process via an unhandled rejection. We log prominently and keep serving.
// Sentry will still capture these via its integration.
process.on("unhandledRejection", (reason: unknown) => {
  console.error("[Server] Unhandled Promise rejection — keeping process alive:", reason);
});
process.on("uncaughtException", (err: Error) => {
  console.error("[Server] Uncaught exception — keeping process alive:", err);
});

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
// Each limiter gets its OWN store instance with a unique prefix (v8 forbids
// sharing one instance across limiters).
const rateLimitStore = getRateLimitStore("rl:global:");

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

    // Production: direct Classphere and partner institute subdomains.
    const isProdSubdomain = new RegExp(`^https:\\/\\/[a-z0-9-]+\\.${escapedBaseDomain}$`).test(origin);
    const isPartnerDomain = /^https?:\/\/([a-zA-Z0-9-_\.]+\.)?(graphiteclasses|graphitegkp)\.com(:\d+)?$/i.test(origin);

    // Local dev: *.localhost:PORT (e.g. test.localhost:3000, allen.localhost:3000)
    const isLocalSubdomain = /^http:\/\/[a-z0-9-_\.]+\.localhost(:\d+)?$/.test(origin);

    if (allowedOrigins.includes(origin) || allowedCustomWebOrigins.has(origin) || allowedCustomWebOrigins.has("*") || isProdSubdomain || isPartnerDomain || isLocalSubdomain) {
      return callback(null, true);
    }

    // Dynamic fallback: check if origin is registered in Supabase (check both institute_settings and institutes)
    try {
      const hostname = new URL(origin).hostname.toLowerCase();
      Promise.all([
        supabaseDB.from("institute_settings").select("id").or(`custom_domain.ilike.%${hostname}%,subdomain.ilike.%${hostname}%`).limit(1).maybeSingle(),
        supabaseDB.from("institutes").select("id").or(`subdomain_slug.ilike.%${hostname}%`).limit(1).maybeSingle()
      ]).then(
        ([res1, res2]) => {
          if (res1.data || res2.data) {
            allowedCustomWebOrigins.add(origin); // Cache in memory for 0ms subsequent checks
            callback(null, true);
          } else {
            console.warn(`[CORS Blocked] Origin: ${origin}`);
            callback(new Error(`Not allowed by CORS: ${origin}`));
          }
        },
        () => {
          console.warn(`[CORS Blocked] Origin: ${origin}`);
          callback(new Error(`Not allowed by CORS: ${origin}`));
        }
      );
    } catch (e) {
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
// Started once, after the server is listening (see below). Registration used to
// happen both here and again via startWorkers(), which registered the lifecycle
// cron twice.
// Accepts 1/true/yes/on, matching how PDF_EXTRACTOR_V4 is read elsewhere. A
// strict === "true" check silently disabled the queue for a deployment set to
// START_WORKERS=1: no error, API still healthy, jobs simply never processed.
const workersEnabled = /^(1|true|yes|on)$/i.test((process.env.START_WORKERS || "").trim());
let stopWorkers: (() => Promise<void>) | null = null;

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
  if (workersEnabled) {
    console.log("[API] Initializing background workers (analysis & lifecycle & pdf-extraction) inside this process...");
    const workers = require("./worker");
    workers.startWorkers();
    stopWorkers = workers.stopWorkers;
  } else {
    console.log("[API] Background workers disabled in this process (scaling separately).");
  }
});

let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[API] ${signal} received — draining connections and stopping workers...`);
  // Stop accepting new connections and finish in-flight requests. Workers are
  // only stopped if this process actually started them.
  (stopWorkers ? stopWorkers() : Promise.resolve()).finally(() => {
    server.close((err) => {
      if (err) {
        console.error("[API] Error closing server:", err.message);
        process.exit(1);
      }
      console.log("[API] Server closed cleanly.");
      process.exit(0);
    });
  });
  // Force-exit if something hangs (e.g. a long-lived SSE upload stream).
  setTimeout(() => {
    console.error("[API] Forced shutdown after 20s — some connections did not drain.");
    process.exit(1);
  }, 20000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
