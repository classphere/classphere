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
import studentsRouter from "../modules/institutes/students/students.routes";
import internalRouter from "../modules/internal/internal.routes";
import datalabWebhookRouter from "../modules/webhooks/datalab.routes";
import pyqsRouter from "../modules/pyqs/pyqs.routes";
import superadminRouter from "../modules/superadmin/superadmin.routes";
import dashboardRouter from "../modules/dashboard/dashboard.routes";
import dppsRouter from "../modules/dpps/dpps.routes";
import supportRouter from "../modules/support/support.routes";
import syllabusRouter from "../modules/syllabus/syllabus.routes";
import resourcesRouter from "../modules/resources/resources.routes";
import testDepartmentRouter from "../modules/test-department/test-department.routes";
import notificationsRouter from "../modules/notifications/notifications.routes";

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────
router.use("/auth", authRouter);
router.use("/pyqs", pyqsRouter);
router.use("/syllabus", syllabusRouter);
router.use("/webhooks/datalab", datalabWebhookRouter);

// ─── Authenticated ───────────────────────────────────────────────────────────
router.use("/questions", questionsRouter);
router.use("/tests", testsRouter);
router.use("/attempts", attemptsRouter);
router.use("/analysis", analysisRouter);
router.use("/rankings", rankingsRouter);
router.use("/institutes", institutesRouter);
router.use("/batches", batchesRouter);
router.use("/faculty", facultyRouter);
router.use("/students", studentsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/dpps", dppsRouter);
router.use("/support", supportRouter);
router.use("/resources", resourcesRouter);
router.use("/test-department", testDepartmentRouter);
router.use("/notifications", notificationsRouter);

// ─── SuperAdmin (super_admin role required) ───────────────────────────────────
router.use("/superadmin", superadminRouter);

// ─── Internal (cron only — INTERNAL_API_KEY protected) ───────────────────────
router.use("/internal", internalRouter);

export default router;
