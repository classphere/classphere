import { Router } from "express";
import authRouter from "./auth.routes";
import questionsRouter from "./questions.routes";
import testsRouter from "./tests.routes";
import attemptsRouter from "./attempts.routes";
import analysisRouter from "../modules/analysis-engine/analysis.routes";
import rankingsRouter from "./rankings.routes";
import institutesRouter from "./institutes.routes";
import batchesRouter from "./batches.routes";
import internalRouter from "./internal.routes";
import pyqsRouter from "./pyqs.routes";
import superadminRouter from "./superadmin.routes";

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────
router.use("/auth", authRouter);
router.use("/pyqs", pyqsRouter);

// ─── Authenticated ───────────────────────────────────────────────────────────
router.use("/questions", questionsRouter);
router.use("/tests", testsRouter);
router.use("/attempts", attemptsRouter);
router.use("/analysis", analysisRouter);
router.use("/rankings", rankingsRouter);
router.use("/institutes", institutesRouter);
router.use("/batches", batchesRouter);

// ─── SuperAdmin (super_admin role required) ───────────────────────────────────
router.use("/superadmin", superadminRouter);

// ─── Internal (cron only — INTERNAL_API_KEY protected) ───────────────────────
router.use("/internal", internalRouter);

export default router;
