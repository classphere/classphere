import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";
import { generateBatchAnalysis } from "./services/batch-analysis";

/**
 * GET /api/v1/analysis/:attempt_id
 * Authenticated — Return the AI analysis for a completed attempt.
 * Analysis is computed synchronously during submit, then stored in analysis_results.
 */
export const getAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { attempt_id } = req.params;

    // Security: verify the attempt belongs to this user (or super_admin can view any)
    const { data: attempt } = await supabaseDB
      .from("attempts")
      .select("student_id")
      .eq("id", attempt_id)
      .maybeSingle();

    if (attempt && req.user?.role !== "super_admin" && attempt.student_id !== req.user?.id) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    // Read analysis from Supabase
    const { data: analysis, error } = await supabaseDB
      .from("analysis_results")
      .select("result, processing_ms, created_at")
      .eq("attempt_id", attempt_id)
      .maybeSingle();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    if (!analysis) {
      // Analysis may still be processing or attempt doesn't exist
      res.status(202).json({ success: true, data: { status: "pending" } });
      return;
    }

    res.status(200).json({ success: true, data: { status: "ready", analysis: analysis.result } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/analysis/:attempt_id/regenerate
 * [super_admin only] — Regenerate analysis for a completed attempt.
 */
export const regenerateAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { attempt_id } = req.params;

    // Verify attempt exists
    const { data: attempt } = await supabaseDB
      .from("attempts")
      .select("id, student_id, paper_id, status, exam_code")
      .eq("id", attempt_id)
      .maybeSingle();

    if (!attempt) {
      res.status(404).json({ success: false, message: "Attempt not found" });
      return;
    }

    if (attempt.status !== "submitted") {
      res.status(400).json({ success: false, message: "Attempt is not yet submitted" });
      return;
    }

    // Re-run analysis
    const { analyzeAttempt } = await import("./services/analysis.service");
    const result = await analyzeAttempt(attempt_id);

    // Upsert new result
    const { db } = await import("./services/db.service");
    await db.upsertAnalysis(attempt_id, attempt.student_id, attempt.exam_code ?? "jee-main", result);

    res.status(200).json({ success: true, message: "Analysis regenerated successfully", attempt_id });
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
    const analysis = await generateBatchAnalysis(test_id, batch_id);
    res.status(200).json({ success: true, data: { analysis } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
