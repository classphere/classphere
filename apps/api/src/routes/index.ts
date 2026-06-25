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
import sscRouter from "./ssc.routes";

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────
// /auth/signup and /auth/login are public; other /auth/* routes require auth
router.use("/auth", authRouter);
// PYQs are public — no login needed to list or fetch questions
router.use("/pyqs", pyqsRouter);
// SSC tests are public — institute admins upload, students attempt
router.use("/ssc", sscRouter);

// ─── Authenticated ───────────────────────────────────────────────────────────
// Each router is mounted at its explicit prefix so no router ever acts as a
// catch-all that could intercept unrelated requests via blanket middleware.
router.use("/questions", questionsRouter);
router.use("/tests", testsRouter);
router.use("/attempts", attemptsRouter);
router.use("/analysis", analysisRouter);
router.use("/rankings", rankingsRouter);
router.use("/institutes", institutesRouter);
router.use("/batches", batchesRouter);

// ─── Internal (cron only — INTERNAL_API_KEY protected) ───────────────────────
router.use("/internal", internalRouter);

export default router;
