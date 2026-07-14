import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { createTicket, listMyTickets } from "./support.controller";

const router = Router();

router.post("/tickets", authenticate, requireRole("institute_admin"), createTicket);
router.get("/tickets", authenticate, requireRole("institute_admin"), listMyTickets);

export default router;
