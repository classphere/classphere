import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  startAttempt,
  getMyAttempts,
  getAttempt,
  saveAttempt,
  submitAttempt,
} from "./attempts.controller";

const router = Router();

// ⚠️  ORDER MATTERS: static "/my" must be declared BEFORE "/:id"
router.get("/my", getMyAttempts);

router.post("/", startAttempt);
router.get("/:id", getAttempt);
router.patch("/:id", saveAttempt);        // auto-save
router.post("/:id/submit", submitAttempt);

export default router;
