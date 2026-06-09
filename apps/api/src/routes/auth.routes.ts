import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { signup, login, joinBatch, getMe, updateMe } from "../controllers/auth.controller";

const router = Router();

// Public routes — no authentication required
router.post("/signup", signup);
router.post("/login", login);

// Authenticated routes
router.post("/join-batch", authenticate, joinBatch);
router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateMe);

export default router;
