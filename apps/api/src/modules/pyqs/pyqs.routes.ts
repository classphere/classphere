import { Router } from "express";
import { getPYQList, getPYQQuestions } from "./pyqs.controller";

const router = Router();

// GET /api/v1/pyqs          — list all available PYQ papers (metadata only)
router.get("/", getPYQList);

// GET /api/v1/pyqs/:id/questions — get full question set for a specific paper
router.get("/:id/questions", getPYQQuestions);

export default router;
