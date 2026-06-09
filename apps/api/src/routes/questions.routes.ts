import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import {
  listQuestions,
  getExamsMeta,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../controllers/questions.controller";

const router = Router();

// ⚠️  ORDER MATTERS: the static "/meta/exams" path must be declared BEFORE "/:id"
// so Express doesn't match "meta" as an :id parameter.
router.get("/meta/exams", authenticate, getExamsMeta);

router.get("/", authenticate, listQuestions);
router.get("/:id", authenticate, getQuestion);

// super_admin only routes
router.post("/", authenticate, requireRole("super_admin"), createQuestion);
router.patch("/:id", authenticate, requireRole("super_admin"), updateQuestion);
router.delete("/:id", authenticate, requireRole("super_admin"), deleteQuestion); // soft delete

export default router;
