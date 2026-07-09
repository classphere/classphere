import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import questionsRouter from "../modules/questions/questions.routes";
import testsRouter from "../modules/tests/tests.routes";
import attemptsRouter from "../modules/attempts/attempts.routes";
import analysisRouter from "../modules/analysis-engine/analysis.routes";
import rankingsRouter from "../modules/rankings/rankings.routes";
import institutesRouter from "../modules/institutes/institutes.routes";
import batchesRouter from "../modules/batches/batches.routes";
import facultyRouter from "../modules/institutes/faculty/faculty.routes";
import internalRouter from "../modules/internal/internal.routes";
import pyqsRouter from "../modules/pyqs/pyqs.routes";
import superadminRouter from "../modules/superadmin/superadmin.routes";

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
router.use("/faculty", facultyRouter);

// ─── SuperAdmin (super_admin role required) ───────────────────────────────────
router.use("/superadmin", superadminRouter);

// ─── Internal (cron only — INTERNAL_API_KEY protected) ───────────────────────
router.use("/internal", internalRouter);

export default router;
