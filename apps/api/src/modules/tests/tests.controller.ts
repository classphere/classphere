import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { uploadToR2 } from "../../lib/r2";
import { extractPDF } from "../../services/extractor/pdfExtractor.service";
import { getStudentTestAccess } from "./test-access.service";
import { logAdminAction } from "../../lib/admin-audit";

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/tests/:id
 * Authenticated — Get a paper's metadata + full question list.
 * Used by /test/[id] page for PYQ papers uploaded via superadmin.
 */
export const getTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Fetch paper metadata
    const { data: paper, error: pErr } = await supabaseDB
      .from("papers")
      .select("*, exams(code, full_name)")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (pErr) {
      res.status(500).json({ success: false, message: pErr.message });
      return;
    }
    if (!paper) {
      res.status(404).json({ success: false, message: `Test '${id}' not found.` });
      return;
    }

    if (req.user?.role === "student") {
      const access = await getStudentTestAccess(req.user.id, paper);
      if (!access.allowed) {
        res.status(access.status).json({ success: false, message: access.message });
        return;
      }
    } else if (!paper.is_published && req.user?.role !== "super_admin" && paper.created_by !== req.user?.id) {
      res.status(403).json({ success: false, message: "Access denied. This test is not published yet." });
      return;
    }

    // 2. Fetch ordered question IDs from join table
    const { data: pqs, error: pqErr } = await supabaseDB
      .from("paper_questions")
      .select("question_id, position")
      .eq("paper_id", id)
      .order("position", { ascending: true });

    if (pqErr) {
      res.status(500).json({ success: false, message: pqErr.message });
      return;
    }

    const questionIds: string[] = (pqs ?? []).map((r: any) => r.question_id);
    let questions: any[] = [];

    if (questionIds.length > 0) {
      // Fetch in batches of 50 to avoid connection drops on large payloads
      const BATCH_SIZE = 50;
      const rawQs: any[] = [];
      for (let i = 0; i < questionIds.length; i += BATCH_SIZE) {
        const batchIds = questionIds.slice(i, i + BATCH_SIZE);
        const { data: batchData, error: qErr } = await supabaseDB
          .from("questions")
          .select("id, question_text, image_url, options, correct_answer, explanation, question_type, subject, chapter, topic, difficulty, source, year, tags")
          .in("id", batchIds);

        if (qErr) {
          res.status(500).json({ success: false, message: qErr.message });
          return;
        }
        rawQs.push(...(batchData ?? []));
      }

      const byId: Record<string, any> = {};
      for (const q of rawQs) {
        // Normalize: ensure text fields are always plain strings (guards against JSONB type bleed)
        const normalizeText = (v: any): string =>
          v == null ? "" : typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v);

        const normalized = {
          ...q,
          question_text: normalizeText(q.question_text),
          explanation: normalizeText(q.explanation),
          options: Array.isArray(q.options)
            ? q.options.map((opt: any) => ({
                ...opt,
                text: normalizeText(opt?.text),
                image_url: opt?.image_url ?? null,
              }))
            : [],
        };

        if (req.user?.role === "student") {
          const { correct_answer, explanation, ...rest } = normalized;
          byId[q.id] = rest;
        } else {
          byId[q.id] = normalized;
        }
      }
      questions = questionIds
        .map((qid, idx) => byId[qid] ? { ...byId[qid], question_number: idx + 1 } : null)
        .filter(Boolean);
    }

    const examCode = (paper as any).exams?.code ?? "";
    const examLabel = (paper as any).exams?.full_name ?? "";
    const meta = {
      id: paper.id,
      exam: examLabel || examCode,
      year: paper.year ?? null,
      shift: paper.shift ?? paper.title,
      questions: questions.length,
      duration: paper.duration_min,
      title: paper.title,
      test_type: paper.test_type,
    };

    res.json({ success: true, data: { paper: meta, questions, total: questions.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/tests
 * [institute_admin / teacher] — Create an institute test.
 * Body: { exam_id, title, type, question_count, subjects, difficulty_mix,
 *         duration_minutes, batch_ids, scheduled_start, scheduled_end }
 */
export const createTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      exam_id, title, type = "mock-test",
      question_count = 90, subjects, chapters, difficulty_mix,
      duration_minutes = 180, batch_ids,
      scheduled_start, scheduled_end,
    } = req.body;

    if (!exam_id || !batch_ids?.length) {
      res.status(400).json({ success: false, message: "exam_id and batch_ids[] are required" });
      return;
    }
    if (scheduled_start && Number.isNaN(new Date(scheduled_start).getTime())) {
      res.status(400).json({ success: false, message: "scheduled_start must be a valid date-time." });
      return;
    }
    if (scheduled_end && Number.isNaN(new Date(scheduled_end).getTime())) {
      res.status(400).json({ success: false, message: "scheduled_end must be a valid date-time." });
      return;
    }
    if (scheduled_start && scheduled_end && new Date(scheduled_end) <= new Date(scheduled_start)) {
      res.status(400).json({ success: false, message: "scheduled_end must be after scheduled_start." });
      return;
    }

    // Verify that all batch_ids belong to the creator's institute (SEC-3)
    const { count: matchingBatchesCount, error: countErr } = await supabaseDB
      .from("batches")
      .select("id", { count: "exact", head: true })
      .in("id", batch_ids)
      .eq("institute_id", req.user!.institute_id);

    if (countErr || matchingBatchesCount !== batch_ids.length) {
      res.status(403).json({ success: false, message: "Access denied. One or more batches do not belong to your institute." });
      return;
    }
    const { data: targetBatches } = await supabaseDB.from("batches").select("exam").in("id", batch_ids);
    if (new Set((targetBatches ?? []).map((batch: any) => String(batch.exam).toLowerCase())).size !== 1) {
      res.status(400).json({ success: false, message: "All target batches must have the same exam." });
      return;
    }

    // 1. Select random questions matching config
    let questionQuery = supabaseDB
      .from("questions")
      .select("id, subject, difficulty")
      .eq("exam_id", exam_id)
      .eq("is_active", true);

    if (subjects?.length) questionQuery = questionQuery.in("subject", subjects);
    if (chapters?.length) questionQuery = questionQuery.in("chapter", chapters);

    const { data: allQs } = await questionQuery;
    if (!allQs || allQs.length === 0) {
      res.status(400).json({ success: false, message: "No questions found matching the given config" });
      return;
    }
    if (allQs.length < question_count) {
      res.status(400).json({ success: false, message: `Only ${allQs.length} eligible questions are available; ${question_count} were requested.` });
      return;
    }

    // Shuffle and pick question_count
    const shuffled = allQs.sort(() => Math.random() - 0.5).slice(0, question_count);

    // 2. Insert paper row (SEC-4: use supabaseDB instead of supabaseAdmin)
    const { data: paper, error: pErr } = await supabaseDB
      .from("papers")
      .insert({
        exam_id,
        title: title ?? `Custom Test — ${new Date().toLocaleDateString("en-IN")}`,
        test_type: type,
        total_questions: shuffled.length,
        total_marks: shuffled.length * 4,
        duration_min: duration_minutes,
        created_by: userId,
        is_active: true,
        is_published: false,
        delivery_mode: "assigned_scheduled",
        available_from: scheduled_start ?? null,
        available_until: scheduled_end ?? null,
      })
      .select("id")
      .single();

    if (pErr || !paper) {
      res.status(500).json({ success: false, message: pErr?.message ?? "Failed to create test" });
      return;
    }

    // 3. Insert paper_questions join rows (SEC-4: use supabaseDB)
    const pqRows = shuffled.map((q: any, idx: number) => ({
      paper_id: paper.id,
      question_id: q.id,
      position: idx + 1,
    }));
    await supabaseDB.from("paper_questions").insert(pqRows);

    // 4. Assign to batches (using test_batch_assignments) (SEC-4: use supabaseDB)
    if (batch_ids && batch_ids.length > 0) {
      const tbRows = batch_ids.map((b_id: string) => ({
        test_id: paper.id,
        batch_id: b_id,
        scheduled_at: scheduled_start ?? new Date().toISOString(),
      }));
      await supabaseDB.from("test_batch_assignments").insert(tbRows);
    }
    
    console.log(`[createTest] Created paper ${paper.id} with ${shuffled.length} questions, assigned to ${batch_ids.length} batches`);

    res.status(201).json({ success: true, data: { test: { id: paper.id, title, question_count: shuffled.length, batch_ids } } });
  } catch (err: any) {
    console.error("[createTest error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/tests/my
 * Authenticated — List papers created by the current user.
 */
export const getMyTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const offset = (page - 1) * limit;

    const { data: tests, count, error } = await supabaseDB
      .from("papers")
      .select("id, title, test_type, total_questions, duration_min, is_active, created_at, exams(code, full_name)", { count: "exact" })
      .eq("created_by", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(200).json({ success: true, data: { tests: tests ?? [], total: count ?? 0, page, limit } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/tests/assigned
 * Authenticated (student) — List all tests assigned to the student's batches.
 */
export const getAssignedTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Get student's batch IDs
    const { data: batchLinks } = await supabaseDB
      .from("batch_students")
      .select("batch_id")
      .eq("student_id", userId);

    const batchIds = (batchLinks ?? []).map((r: any) => r.batch_id);
    if (batchIds.length === 0) {
      res.status(200).json({ success: true, data: { tests: [] } });
      return;
    }

    // Fetch tests assigned to these batches
    const { data: assignments, error: assignErr } = await supabaseDB
      .from("test_batch_assignments")
      .select("assigned_at, scheduled_at, batch_id, papers(id, title, test_type, total_questions, total_marks, duration_min, is_active, is_published, delivery_mode, available_from, available_until, created_at)")
      .in("batch_id", batchIds)
      .order("scheduled_at", { ascending: true });

    if (assignErr) {
      res.status(500).json({ success: false, message: assignErr.message });
      return;
    }

    // Deduplicate in case multiple batches have the same test, keep earliest scheduled_at
    const testsMap = new Map();
    for (const a of (assignments ?? [])) {
      const p: any = Array.isArray(a.papers) ? a.papers[0] : a.papers;
      if (p && p.is_active && p.is_published && p.delivery_mode === "assigned_scheduled") {
        if (!testsMap.has(p.id)) {
          testsMap.set(p.id, { ...p, scheduled_at: a.scheduled_at, assigned_at: a.assigned_at });
        }
      }
    }

    const assignedTests = Array.from(testsMap.values());
    res.status(200).json({ success: true, data: { tests: assignedTests } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/tests/:id/publish
 * [teacher / institute_admin] — Publish a test so students can see it.
 */
export const publishTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user?.role === "super_admin";

    let query = supabaseDB
      .from("papers")
      .update({ is_published: true })
      .eq("id", id)
      .eq("is_active", true);

    if (!isSuperAdmin) {
      query = query.eq("created_by", req.user!.id);
    }

    const { data: paper, error } = await query
      .select("id, title, is_published")
      .maybeSingle();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    if (!paper) {
      res.status(404).json({ success: false, message: "Test not found or access denied." });
      return;
    }

    res.status(200).json({ success: true, message: "Test published", data: { test: paper } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/v1/tests/:id
 * [super_admin / institute_admin] — Soft delete a test (is_active = false).
 */
export const deleteTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user?.role === "super_admin";

    let query = supabaseDB
      .from("papers")
      .update({ is_active: false })
      .eq("id", id);

    if (!isSuperAdmin) {
      query = query.eq("created_by", req.user!.id);
    }

    const { data: paper, error } = await query
      .select("id")
      .maybeSingle();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    if (!paper) {
      res.status(404).json({ success: false, message: "Test not found or access denied." });
      return;
    }

    if (isSuperAdmin) {
      await logAdminAction(req.user?.id, "Global paper deactivated", `Deactivated global paper ${id}.`, "question_bank", "success");
    }
    res.status(200).json({ success: true, message: "Test successfully deactivated." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Super-admin metadata editor for global papers. */
export const updateGlobalTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const allowed = ["title", "subject", "chapter", "year", "shift", "difficulty", "duration_min", "total_marks"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: "No supported paper fields supplied." });
      return;
    }

    const { data, error } = await supabaseDB
      .from("papers")
      .update(updates)
      .eq("id", req.params.id)
      .eq("delivery_mode", "public_practice")
      .eq("is_active", true)
      .select("id, title, subject, chapter, year, shift, difficulty")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ success: false, message: "Global paper not found." });
      return;
    }
    await logAdminAction(req.user?.id, "Global paper updated", `Updated metadata for \"${data.title}\".`, "question_bank", "success");
    res.status(200).json({ success: true, data: { test: data } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Performs a single database update for selected global papers. */
export const bulkUpdateGlobalTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, updates } = req.body as { ids?: string[]; updates?: Record<string, unknown> };
    const allowed = ["subject", "chapter", "difficulty"];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowed) if (updates?.[key] !== undefined) safeUpdates[key] = updates[key];
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 || Object.keys(safeUpdates).length === 0) {
      res.status(400).json({ success: false, message: "Supply 1-100 paper ids and supported updates." });
      return;
    }
    const { count: eligibleCount, error: eligibilityError } = await supabaseDB
      .from("papers")
      .select("id", { count: "exact", head: true })
      .in("id", ids)
      .eq("delivery_mode", "public_practice")
      .eq("is_active", true);
    if (eligibilityError) throw eligibilityError;
    if (eligibleCount !== ids.length) {
      res.status(409).json({ success: false, message: "One or more selected papers are not active global papers; no change was made." });
      return;
    }
    const { data, error } = await supabaseDB
      .from("papers")
      .update(safeUpdates)
      .in("id", ids)
      .eq("delivery_mode", "public_practice")
      .eq("is_active", true)
      .select("id");
    if (error) throw error;
    await logAdminAction(req.user?.id, "Global papers bulk updated", `Updated ${ids.length} global papers.`, "question_bank", "success");
    res.status(200).json({ success: true, data: { count: data?.length ?? 0 } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const bulkDeleteGlobalTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      res.status(400).json({ success: false, message: "Supply 1-100 paper ids." });
      return;
    }
    const { count: eligibleCount, error: eligibilityError } = await supabaseDB
      .from("papers")
      .select("id", { count: "exact", head: true })
      .in("id", ids)
      .eq("delivery_mode", "public_practice")
      .eq("is_active", true);
    if (eligibilityError) throw eligibilityError;
    if (eligibleCount !== ids.length) {
      res.status(409).json({ success: false, message: "One or more selected papers are not active global papers; no change was made." });
      return;
    }
    const { data, error } = await supabaseDB
      .from("papers")
      .update({ is_active: false })
      .in("id", ids)
      .eq("delivery_mode", "public_practice")
      .eq("is_active", true)
      .select("id");
    if (error) throw error;
    await logAdminAction(req.user?.id, "Global papers bulk deactivated", `Deactivated ${ids.length} global papers.`, "question_bank", "success");
    res.status(200).json({ success: true, data: { count: data?.length ?? 0 } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Helpers for uploading Base64 images to R2 ────────────────────────────────

async function processBase64ImagesInText(text: string | null): Promise<string> {
  if (!text) return "";
  const base64Regex = /!\[([^\]]*)\]\(data:(image\/[a-zA-Z+.-]+);base64,([^\)]+)\)/g;
  let updatedText = text;
  let match;
  while ((match = base64Regex.exec(text)) !== null) {
    const [fullMatch, altText, mimeType, base64Data] = match;
    try {
      const buffer = Buffer.from(base64Data, "base64");
      const extension = mimeType.split("/")[1] || "png";
      const fileName = `question_image_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
      const r2Url = await uploadToR2(buffer, fileName, mimeType);
      updatedText = updatedText.replace(fullMatch, `![${altText}](${r2Url})`);
    } catch (err) {
      console.error("[processBase64ImagesInText] Failed to upload inline image:", err);
    }
  }
  return updatedText;
}

async function processBase64ImageUrl(imageUrl: string | null): Promise<string | null> {
  if (!imageUrl || !imageUrl.startsWith("data:")) return imageUrl;
  const match = imageUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) return imageUrl;
  const [, mimeType, base64Data] = match;
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const extension = mimeType.split("/")[1] || "png";
    const fileName = `question_image_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    return await uploadToR2(buffer, fileName, mimeType);
  } catch (err) {
    console.error("[processBase64ImageUrl] Failed to upload base64 image:", err);
    return imageUrl;
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/tests/upload-test
 * [institute_admin / teacher / super_admin]
 * Accepts PDF (pdf) and optional answer key CSV (csv) file fields, parses them, 
 * processes crops, creates paper, inserts questions, and assigns to target batches.
 */
export const uploadTestController = async (req: Request, res: Response): Promise<void> => {
  let tempWorkingDir = "";

  // Set headers for NDJSON stream
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendProgress = (status: string, message: string, data?: any) => {
    res.write(JSON.stringify({ success: true, status, message, data }) + "\n");
  };

  const sendError = (message: string) => {
    res.write(JSON.stringify({ success: false, status: "error", message }) + "\n");
    res.end();
  };

  try {
    const userId = req.user!.id;
    const {
      title,
      date,
      batch_ids,
      duration_min = 180,
      total_marks = 360,
      difficulty = "medium",
    } = req.body;

    const scheduledAt = new Date(date);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const pdfFile = files?.pdf?.[0];
    const answerKeyFile = files?.answer_key?.[0];

    if (!pdfFile) {
      sendError("No PDF file uploaded. 'pdf' is required.");
      return;
    }

    if (!title || !date || !batch_ids) {
      sendError("'title', 'date', and 'batch_ids' are required.");
      return;
    }
    if (Number.isNaN(scheduledAt.getTime())) {
      sendError("'date' must be a valid date-time.");
      return;
    }

    let batchIds: string[] = [];
    try {
      batchIds = typeof batch_ids === "string" ? JSON.parse(batch_ids) : batch_ids;
    } catch {
      sendError("Invalid JSON format for 'batch_ids'.");
      return;
    }

    if (!Array.isArray(batchIds) || batchIds.length === 0) {
      sendError("batch_ids must be a non-empty array.");
      return;
    }

    sendProgress("verifying", "Verifying batch institute access...");

    // 1. Verify target batches belong to user's institute (SEC-3/4)
    const { count: matchingBatchesCount, error: countErr } = await supabaseDB
      .from("batches")
      .select("id", { count: "exact", head: true })
      .in("id", batchIds)
      .eq("institute_id", req.user!.institute_id);

    if (countErr || matchingBatchesCount !== batchIds.length) {
      sendError("Access denied. One or more batches do not belong to your institute.");
      return;
    }

    sendProgress("resolving_exam", "Resolving target exam syllabus target...");

    // 2. Resolve exam_id from the first batch
    const { data: targetBatches, error: fbErr } = await supabaseDB
      .from("batches")
      .select("id, exam")
      .in("id", batchIds);

    if (fbErr || !targetBatches?.length) {
      sendError("Failed to resolve exam type from target batch.");
      return;
    }
    if (new Set(targetBatches.map((batch: any) => String(batch.exam).toLowerCase())).size !== 1) {
      sendError("All target batches must have the same exam.");
      return;
    }
    const firstBatch = targetBatches[0];

    const examCode = firstBatch.exam.toLowerCase().includes("neet") ? "neet-ug" : "jee-main";
    const { data: examObj, error: examErr } = await supabaseDB
      .from("exams")
      .select("id")
      .eq("code", examCode)
      .single();

    if (examErr || !examObj) {
      sendError(`Exam code '${examCode}' not found in database.`);
      return;
    }
    const examId = examObj.id;

    // 3. Write PDF to temporary working directory and run AI extraction
    tempWorkingDir = path.join(process.cwd(), "apps/api/temp", `extract_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    fs.mkdirSync(tempWorkingDir, { recursive: true });

    const tempPdfPath = path.join(tempWorkingDir, "temp.pdf");
    fs.writeFileSync(tempPdfPath, pdfFile.buffer);

    sendProgress("extracting_questions", "Analyzing pages & running AI question extraction (OCR)...");
    const extractionResult = await extractPDF(tempPdfPath);

    if (!extractionResult?.questions || extractionResult.questions.length === 0) {
      sendError("Failed to extract questions from the PDF.");
      return;
    }

    // 4. Parse Answer Key (could be CSV or separate PDF), or fallback to extracting from Master PDF
    sendProgress("extracting_answers", "Parsing correct answers and mapping solutions...");
    const csvAnswers: Record<number, string[]> = {};
    const isCsv = answerKeyFile?.originalname?.toLowerCase()?.endsWith(".csv") || answerKeyFile?.mimetype === "text/csv";
    const isPdf = answerKeyFile?.originalname?.toLowerCase()?.endsWith(".pdf") || answerKeyFile?.mimetype === "application/pdf";

    if (answerKeyFile && isCsv) {
      // Case 1: Separate CSV uploaded
      const csvContent = answerKeyFile.buffer.toString("utf-8");
      const lines = csvContent.split(/\r?\n/);
      for (const line of lines) {
        const parts = line.split(",");
        if (parts.length >= 2) {
          const qNum = parseInt(parts[0].trim(), 10);
          const answer = parts[1].trim().toUpperCase();
          if (!isNaN(qNum) && answer) {
            let finalAns: string[] = [];
            if (answer.includes("|") || answer.includes(";")) {
              finalAns = answer.split(/[;|]/).map(a => a.trim()).filter(Boolean);
            } else if (/^[A-H]+$/.test(answer)) {
              finalAns = Array.from(answer);
            } else {
              finalAns = [answer];
            }
            csvAnswers[qNum] = finalAns;
          }
        }
      }
    } else {
      // Case 2 or 3: Separate Answer Key PDF uploaded OR Fallback to Master PDF
      const tempAnswersJsonPath = path.join(tempWorkingDir, "answers.json");
      let targetPdfPath = tempPdfPath; // fallback: Master PDF

      if (answerKeyFile && isPdf) {
        targetPdfPath = path.join(tempWorkingDir, "answer_key_document.pdf");
        fs.writeFileSync(targetPdfPath, answerKeyFile.buffer);
      }

      const parseKeyCmd = `python "${path.join(__dirname, "../../services/extractor/parse_pdf_answer_key.py")}" "${targetPdfPath}" "${tempAnswersJsonPath}"`;
      try {
        execSync(parseKeyCmd, { stdio: "pipe", timeout: 60000 });
        if (fs.existsSync(tempAnswersJsonPath)) {
          const parsedPdfAnswers = JSON.parse(fs.readFileSync(tempAnswersJsonPath, "utf-8"));
          for (const [qNumStr, ans] of Object.entries(parsedPdfAnswers)) {
            const qNum = parseInt(qNumStr, 10);
            if (!isNaN(qNum) && Array.isArray(ans)) {
              csvAnswers[qNum] = ans;
            }
          }
        }
      } catch (err: any) {
        console.error("[uploadTestController] PDF Answer Key extraction failed:", err.message);
      }
    }

    sendProgress("cropping_images", "Processing diagrams & uploading cropped images to Cloud...");
    // 5. Map and upload questions & process inline base64 images
    const questionRows = await Promise.all(
      extractionResult.questions.map(async (q: any, idx: number) => {
        const processedText = await processBase64ImagesInText(q.question_text);
        const processedExplanation = await processBase64ImagesInText(q.explanation);
        const processedImageUrl = await processBase64ImageUrl(q.image_url);

        const processedOptions = await Promise.all(
          (q.options ?? []).map(async (opt: any) => {
            const processedOptText = await processBase64ImagesInText(opt.text);
            const processedOptImageUrl = await processBase64ImageUrl(opt.image_url);
            return {
              ...opt,
              text: processedOptText,
              image_url: processedOptImageUrl,
            };
          })
        );

        let finalOptions = processedOptions || [];
        const isMcq = q.question_type === "MCQ" || q.question_type === "mcq_single" || q.question_type === "Assertion-Reason" || q.question_type === "Matching";
        
        if (isMcq && finalOptions.length < 4) {
          const existingIds = new Set(finalOptions.map((o: any) => o.id));
          const optionLetters = ["A", "B", "C", "D"];
          for (const letter of optionLetters) {
            if (!existingIds.has(letter)) {
              finalOptions.push({
                id: letter,
                text: "",
                image_url: null,
              });
            }
          }
          const order: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
          finalOptions.sort((a: any, b: any) => (order[a.id] ?? 99) - (order[b.id] ?? 99));
        }

        const isNumerical = !isMcq && (!finalOptions || finalOptions.length < 2);
        const type = isNumerical ? "integer" : (q.question_type || "mcq_single");

        const csvAns = csvAnswers[idx + 1];
        const extractedAnswers = Array.isArray(q.correct_answer) ? q.correct_answer : q.correct_answer ? [q.correct_answer] : [];
        const correctAnswers = (csvAns && csvAns.length) ? csvAns : (extractedAnswers && extractedAnswers.length) ? extractedAnswers : ["No answer key"];

        return {
          id:             randomUUID(),
          exam_id:        examId,
          test_type:      "mock-test",
          subject:        q.subject  || "General",
          chapter:        q.chapter  || "General",
          topic:          q.topic    || null,
          difficulty:     q.difficulty || difficulty,
          year:           new Date(date).getFullYear() || null,
          source:         title,
          question_type:  type,
          question_text:  processedText,
          image_url:      processedImageUrl,
          options:        finalOptions,
          correct_answer: correctAnswers,
          explanation:    processedExplanation,
          tags:           q.tags || [],
          is_active:      true,
        };
      })
    );

    sendProgress("saving_db", "Saving generated questions & linking scheduled test...");
    // 6. Insert the Paper
    const { data: paper, error: pErr } = await supabaseDB
      .from("papers")
      .insert({
        exam_id: examId,
        title,
        test_type: "mock-test",
        total_questions: questionRows.length,
        total_marks: Number(total_marks) || (questionRows.length * 4),
        duration_min: Number(duration_min) || 180,
        created_by: userId,
        is_active: true,
        is_published: true,
        delivery_mode: "assigned_scheduled",
        available_from: scheduledAt.toISOString(),
      })
      .select("id")
      .single();

    if (pErr || !paper) {
      throw new Error(`Failed to create paper: ${pErr?.message}`);
    }

    // 7. Bulk insert questions
    const questionBatches = chunk(questionRows, 100);
    for (const qBatch of questionBatches) {
      const { error: qErr } = await supabaseDB.from("questions").insert(qBatch);
      if (qErr) {
        throw new Error(`Failed to insert questions: ${qErr.message}`);
      }
    }

    // 8. Link questions to paper
    const pqRows = questionRows.map((q: any, idx: number) => ({
      paper_id: paper.id,
      question_id: q.id,
      position: idx + 1,
    }));
    const { error: pqErr } = await supabaseDB.from("paper_questions").insert(pqRows);
    if (pqErr) {
      throw new Error(`Failed to link paper questions: ${pqErr.message}`);
    }

    // 9. Assign target batches (with scheduled_at from the submitted date)
    const tbRows = batchIds.map((b_id: string) => ({
      test_id: paper.id,
      batch_id: b_id,
      scheduled_at: scheduledAt.toISOString(),
    }));
    const { error: tbErr } = await supabaseDB.from("test_batch_assignments").insert(tbRows);
    if (tbErr) {
      throw new Error(`Failed to assign test to batches: ${tbErr.message}`);
    }

    // 10. Clean up temp folder
    try {
      fs.rmSync(tempWorkingDir, { recursive: true, force: true });
    } catch (cleanupErr: any) {
      console.warn(`[uploadTestController] Cleanup failed: ${cleanupErr.message}`);
    }

    sendProgress("success", "Test scheduled and published successfully!", {
      paper_id: paper.id,
      title,
      total_questions: questionRows.length,
    });
    res.end();

  } catch (err: any) {
    console.error("[uploadTestController error]", err);
    if (tempWorkingDir) {
      try {
        fs.rmSync(tempWorkingDir, { recursive: true, force: true });
      } catch {}
    }
    sendError(err.message || "Failed to process test PDF");
  }
};

