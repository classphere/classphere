import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  listQuestions,
  getExamsMeta,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUpsertQuestions,
  listTests,
  createTopicPractice,
} from "./questions.controller";

const router = Router();

// ⚠️ ORDER MATTERS — static paths before dynamic /:id

// Tests Hub — list papers from DB (chapter-wise / mock-test / pyq)
router.get("/tests", authenticate, listTests);
router.post("/topic-practice", authenticate, requireRole("student"), createTopicPractice);

// Exam meta for dropdowns (subject/chapter lists)
router.get("/meta/exams", authenticate, getExamsMeta);

// Standard CRUD
router.get("/",    authenticate, listQuestions);
router.get("/:id", authenticate, getQuestion);

// super_admin only
router.post("/",        authenticate, requireRole("super_admin"), createQuestion);
router.post("/bulk",    authenticate, requireRole("super_admin"), bulkUpsertQuestions);
router.patch("/:id",   authenticate, requireRole("super_admin"), updateQuestion);
router.delete("/:id",  authenticate, requireRole("super_admin"), deleteQuestion);

export default router;
