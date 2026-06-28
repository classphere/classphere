import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { getMyRanks, getLeaderboard, getRankCard } from "./rankings.controller";

const router = Router();

router.get("/me", authenticate, getMyRanks);
router.get("/leaderboard", authenticate, getLeaderboard);
router.get("/rank-card", authenticate, getRankCard);

export default router;
