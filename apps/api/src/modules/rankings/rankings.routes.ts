import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  getMyRanks,
  getLeaderboard,
  getRankCard,
  getMyRankingBatches,
  getMyRankedPapers,
  getPaperLeaderboard,
  getWeeklyQuestionLeaderboard,
  getBatchComparisonMatrix,
} from "./rankings.controller";

const router = Router();

router.get("/me", authenticate, getMyRanks);
router.get("/batches", authenticate, getMyRankingBatches);
router.get("/papers", authenticate, getMyRankedPapers);
router.get("/paper", authenticate, getPaperLeaderboard);
router.get("/batch-comparison", authenticate, getBatchComparisonMatrix);
router.get("/weekly", authenticate, getWeeklyQuestionLeaderboard);
router.get("/leaderboard", authenticate, getLeaderboard);
router.get("/rank-card", authenticate, getRankCard);

export default router;
