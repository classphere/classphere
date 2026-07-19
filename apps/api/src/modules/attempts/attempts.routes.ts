import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  startAttempt,
  getMyAttempts,
  getAttempt,
  saveAttempt,
  submitAttempt,
} from "./attempts.controller";

const router = Router();

// ⚠️  ORDER MATTERS: static "/my" must be declared BEFORE "/:id"
router.get("/my", authenticate, requireRole("student"), getMyAttempts);

router.post("/", authenticate, requireRole("student"), startAttempt);
router.get("/:id", authenticate, getAttempt);
router.patch("/:id", authenticate, requireRole("student"), saveAttempt);        // auto-save
router.post("/:id/submit", authenticate, requireRole("student"), submitAttempt);


export default router;
