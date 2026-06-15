import { Request, Response } from "express";

import { globalDbStore } from "./services/db.mock";

/**
 * GET /api/v1/analysis/:attempt_id
 * Authenticated — Return the AI analysis for a completed attempt.
 * Client should poll this endpoint until analysis is ready (~3–8 seconds after submit).
 */
export const getAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { attempt_id } = req.params;

    const analysis = globalDbStore.analysisResults.get(attempt_id);
    if (!analysis) {
      res.status(202).json({ success: true, data: { status: "pending" } });
      return;
    }

    res.status(200).json({ success: true, data: { status: "ready", analysis } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/analysis/:attempt_id/regenerate
 * [super_admin only] — Regenerate analysis with a different AI model.
 */
export const regenerateAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { attempt_id } = req.params;
    // TODO: implement
    // 1. Validate req.body: { model: string } — must be a key in the ai-models registry
    // 2. Verify attempt exists
    // 3. Delete existing ai_analyses row for this attempt (to allow re-insert)
    // 4. Enqueue re-generation with the specified model override
    //    ai.service.generateAnalysis(attempt_id, { model_override: req.body.model })
    // 5. Return { success: true, message: "Regeneration queued", attempt_id, model: req.body.model }
    res.status(202).json({ success: true, message: "regenerateAnalysis — TODO: implement", attempt_id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

import { generateBatchAnalysis } from "./services/batch-analysis";

/**
 * GET /api/v1/analysis/batch/:test_id/:batch_id
 * [teacher] — Get aggregate batch-level AI analysis for a specific test + batch.
 */
export const getBatchAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { test_id, batch_id } = req.params;
    
    // Call the batch analysis service
    const analysis = await generateBatchAnalysis(test_id, batch_id);

    res.status(200).json({
      success: true,
      data: { analysis },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
