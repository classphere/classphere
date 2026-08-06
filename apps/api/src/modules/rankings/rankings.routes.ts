import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  getRankCard,
  getMyRankingBatches,
  getMyRankedPapers,
  getPaperLeaderboard,
  getWeeklyQuestionLeaderboard,
  getLifetimeLeaderboard,
  getBatchComparisonMatrix,
} from "./rankings.controller";

const router = Router();

// Ranking is two things, and only two: how a student did on one paper against
// their batch, and how many questions they solved correctly this week.
//
// GET /me and GET /leaderboard used to serve a third — a lifetime merit list of
// every student by cumulative score. Both had already been answering 410 Gone
// ("Legacy aggregate rankings are retired") and are now removed outright, along
// with the rank_score they ranked on. A lifetime ordering compares a student who
// has sat forty papers with one who has sat three, across papers of different
// difficulty, and reads as precise while meaning very little.
router.get("/batches", authenticate, getMyRankingBatches);
router.get("/papers", authenticate, getMyRankedPapers);
router.get("/paper", authenticate, getPaperLeaderboard);
router.get("/batch-comparison", authenticate, getBatchComparisonMatrix);
router.get("/weekly", authenticate, getWeeklyQuestionLeaderboard);
router.get("/lifetime", authenticate, getLifetimeLeaderboard);
router.get("/rank-card", authenticate, getRankCard);

export default router;
