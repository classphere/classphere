import { Router } from "express";
import { authenticate } from "../../../middleware/auth.middleware";
import { requireRole } from "../../../middleware/rbac.middleware";
import {
  createFaculty,
  listFaculty,
} from "./faculty.controller";

const router = Router();

// All faculty routes require authentication (applied per-route, not as blanket middleware)
router.post("/", authenticate, requireRole("institute_admin"), createFaculty);
router.get("/", authenticate, requireRole("institute_admin", "teacher", "super_admin"), listFaculty);

export default router;
