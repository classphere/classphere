import { Router } from "express";
import { requireInternalApiKey } from "../../middleware/internalAuth.middleware";
import { computeRankings, resetStreaks, sendWeeklyReports } from "./internal.controller";

const router = Router();

// All internal routes are protected by INTERNAL_API_KEY header — NOT JWT.
// GCP Cloud Scheduler includes this header on every scheduled call.
router.use(requireInternalApiKey);

router.post("/rankings/compute", computeRankings);
router.post("/streaks/reset", resetStreaks);
router.post("/reports/weekly", sendWeeklyReports);

export default router;
