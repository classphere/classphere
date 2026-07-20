import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { createResource, getInstituteResources, getStudentResources } from "./resources.controller";

const router = Router();
router.get("/student", authenticate, requireRole("student"), getStudentResources);
router.get("/mine", authenticate, requireRole("test_department_head"), getInstituteResources);
router.post("/", authenticate, requireRole("test_department_head"), createResource);
export default router;
