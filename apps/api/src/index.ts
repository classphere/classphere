import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import * as Sentry from "@sentry/node";
import "@sentry/profiling-node"; // Profiling

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ─── Sentry Initialization ─────────────────────────────────────────────────────
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    ...(Sentry as any).autoDiscoverNodePerformanceMonitoringIntegrations?.() || [],
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0, // Profiling sample rate
});

// The request handler must be the first middleware on the app
Sentry.setupExpressErrorHandler(app);

// ─── Global Middleware ────────────────────────────────────────────────────────
// 1. Security Headers
app.use(helmet());

// 2. Strict CORS
const allowedOrigins = [
  "http://localhost:3000",
  "https://classphere.com"
];
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is exactly in the allowed list or is a subdomain of classphere.com
    if (allowedOrigins.includes(origin) || /^https:\/\/[a-z0-9-]+\.classphere\.com$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// 3. Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 mins
  standardHeaders: true, 
  legacyHeaders: false,
  message: { success: false, message: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use(globalLimiter as any);

app.use(express.json({ limit: "10mb" }));

// ─── Background Workers ───────────────────────────────────────────────────────
import "./workers/analysis.worker";

// ─── API Routes ───────────────────────────────────────────────────────────────
import apiRouter from "./routes/index";

// All routes are prefixed with /api/v1
app.use("/api/v1", apiRouter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Classphere API is running", version: "v1" });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Unhandled Error]", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`[API] Classphere API Server running on port ${port}`);
  console.log(`[API] Routes mounted at /api/v1`);
});
