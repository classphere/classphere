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
router.get("/my", authenticate, getMyAttempts);

router.post("/", authenticate, startAttempt);
router.get("/:id", authenticate, getAttempt);
router.patch("/:id", authenticate, saveAttempt);        // auto-save
router.post("/:id/submit", authenticate, submitAttempt);


export default router;
