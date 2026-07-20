import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./notifications.controller";

const router = Router();
router.get("/", authenticate, listNotifications);
router.post("/read-all", authenticate, markAllNotificationsRead);
router.post("/:id/read", authenticate, markNotificationRead);
export default router;
