import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" }));

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
