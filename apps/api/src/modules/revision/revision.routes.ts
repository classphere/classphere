import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { getDailyRevision, submitDailyRevision } from "./daily-revision.controller";

const router = Router();

// Today's spaced-repetition set: topics whose interval has elapsed, with fresh
// questions the student has not seen before.
router.get("/daily", authenticate, requireRole("student"), getDailyRevision);

// Grades the answers server-side and advances the topic's schedule.
router.post("/daily/:reviewId/submit", authenticate, requireRole("student"), submitDailyRevision);

export default router;
