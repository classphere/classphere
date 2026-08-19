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
import superadminRouter from "../modules/superadmin/superadmin.routes";
import dashboardRouter from "../modules/dashboard/dashboard.routes";
import dppsRouter from "../modules/dpps/dpps.routes";
import revisionRouter from "../modules/revision/revision.routes";
import supportRouter from "../modules/support/support.routes";
import syllabusRouter from "../modules/syllabus/syllabus.routes";
import resourcesRouter from "../modules/resources/resources.routes";
import testDepartmentRouter from "../modules/test-department/test-department.routes";
import notificationsRouter from "../modules/notifications/notifications.routes";

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────
router.use("/auth", authRouter);
router.use("/syllabus", syllabusRouter);

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
router.use("/revision", revisionRouter);
router.use("/support", supportRouter);
router.use("/resources", resourcesRouter);
router.use("/test-department", testDepartmentRouter);
router.use("/notifications", notificationsRouter);

// ─── SuperAdmin (super_admin role required) ───────────────────────────────────
router.use("/superadmin", superadminRouter);

// The /internal cron routes are gone. All three were 501 stubs: nightly rank
// computation (for a merit list that was retired), streak maintenance (for a
// streak nothing ever incremented) and weekly institute reports (which an
// institute admin reads live from their own dashboard instead).

export default router;
