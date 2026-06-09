import { Request, Response } from "express";

/**
 * GET /api/v1/analysis/:attempt_id
 * Authenticated — Return the AI analysis for a completed attempt.
 * Client should poll this endpoint until analysis is ready (~3–8 seconds after submit).
 */
export const getAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { attempt_id } = req.params;
    // TODO: implement
    // 1. Fetch attempt by attempt_id; verify student_id === req.user!.id (or super_admin)
    // 2. SELECT * FROM ai_analyses WHERE attempt_id = $attempt_id
    // 3. If not found: return { success: true, data: { status: "pending" } } with 202
    // 4. Return { success: true, data: { status: "ready", analysis: { ...ai_analysis row } } }
    res.status(200).json({ success: true, message: "getAnalysis — TODO: implement", attempt_id });
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

/**
 * GET /api/v1/analysis/batch/:test_id/:batch_id
 * [teacher] — Get aggregate batch-level AI analysis for a specific test + batch.
 */
export const getBatchAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { test_id, batch_id } = req.params;
    // TODO: implement
    // 1. Verify requesting user is a teacher assigned to batch_id (batch_teachers table)
    // 2. SELECT * FROM batch_analyses WHERE test_id = $test_id AND batch_id = $batch_id
    // 3. If not found: return { success: true, data: { status: "pending" } } with 202
    // 4. Return { success: true, data: { analysis: { class_summary, chapter_heatmap, teaching_recs, attention_flags } } }
    res.status(200).json({
      success: true,
      message: "getBatchAnalysis — TODO: implement",
      test_id,
      batch_id,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
