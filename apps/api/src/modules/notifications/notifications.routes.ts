import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./notifications.controller";
import { registerPushDevice, unregisterPushDevice } from "./push-devices.controller";

const router = Router();
router.post("/devices", authenticate, registerPushDevice);
router.delete("/devices", authenticate, unregisterPushDevice);
router.get("/", authenticate, listNotifications);
router.post("/read-all", authenticate, markAllNotificationsRead);
router.post("/:id/read", authenticate, markNotificationRead);
export default router;
