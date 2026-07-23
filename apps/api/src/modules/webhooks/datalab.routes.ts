import { Router } from "express";
import { handleMarkerWebhook } from "./datalab.controller";

const router = Router();

// Public callback authenticated by DATALAB_WEBHOOK_SECRET in the JSON body.
router.post("/marker/:jobId", handleMarkerWebhook);

export default router;
