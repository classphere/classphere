import { Request, Response } from "express";
import { difficultyForStorage, isChoiceQuestion, questionTypeForStorage, subjectForStorage } from "../../lib/question-taxonomy";
import { supabaseDB, supabaseAdmin } from "../../lib/supabase";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { execSync, exec } from "child_process";
import { promisify } from "util";
import { uploadToR2, uploadToR2Raw } from "../../lib/r2";

const execAsync = promisify(exec);
import { extractPDF, EXTRACTOR_SCRIPT_DIR } from "../../services/extractor/pdfExtractor.service";
import { enqueuePdfExtraction } from "../../lib/queue/pdf-extraction.queue";
import { getStudentTestAccess } from "./test-access.service";
import { requiresExplicitScheme, totalMarksForQuestions, validateMarkingScheme } from "../../lib/marking-scheme";
import { logAdminAction } from "../../lib/admin-audit";
import { figuresForStorage, normalizeQuestionMedia, stripInlineImages } from "../../lib/question-media";
import { deriveLegacyContentBlocks } from "../../lib/question-content";

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/tests/:id
 * Authenticated — Get a paper's metadata + full question list.
 * Used by /test/[id] page for PYQ papers uploaded via superadmin.
 */
export const getTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

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

    if (paper.institute_id && req.user?.role !== "super_admin" && paper.institute_id !== req.user?.institute_id) {
      res.status(403).json({ success: false, message: "Access denied. This test belongs to another institute." });
      return;
    }

    const canReviewInstitutePaper = req.user?.role === "super_admin" || req.user?.role === "test_department_head";
    if (paper.institute_id && req.user?.role !== "student" && !canReviewInstitutePaper) {
      res.status(403).json({ success: false, message: "Institute test papers are managed by the Test Admin." });
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
      const BATCH_SIZE = 50;
      const rawQs: any[] = [];
      for (let i = 0; i < questionIds.length; i += BATCH_SIZE) {
        const batchIds = questionIds.slice(i, i + BATCH_SIZE);
        const legacyFields = "id, question_text, image_url, options, correct_answer, explanation, question_type, subject, chapter, topic, difficulty, source, year, tags, content_version";
        let { data: batchData, error: qErr } = await supabaseDB
          .from("questions")
          .select(`${legacyFields}, content_blocks, extraction_metadata, extractor_version, source_crop_url`)
          .in("id", batchIds) as { data: any[] | null; error: any };

        // Migration 31 is intentionally deployable separately. During a rolling
        // deploy, an old database must keep serving the exact legacy payload.
        if (qErr && /content_blocks|extraction_metadata|extractor_version|source_crop_url/i.test(qErr.message ?? "")) {
          ({ data: batchData, error: qErr } = await supabaseDB
            .from("questions")
            .select(legacyFields)
            .in("id", batchIds) as { data: any[] | null; error: any });
        }
        if (qErr) {
          res.status(500).json({ success: false, message: qErr.message });
          return;
        }
        rawQs.push(...(batchData ?? []));
      }

      const byId: Record<string, any> = {};
      for (const q of rawQs) {
        const normalizeText = (v: any): string =>
          v == null ? "" : typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v);

        const extractionMetadata = q.extraction_metadata && typeof q.extraction_metadata === "object"
          ? q.extraction_metadata
          : {};
        const normalized = normalizeQuestionMedia({
          ...q,
          extraction_confidence: extractionMetadata.confidence ?? null,
          needs_review: extractionMetadata.needs_review ?? false,
          review_reasons: Array.isArray(extractionMetadata.review_reasons) ? extractionMetadata.review_reasons : [],
          source_crop: q.source_crop_url ? { url: q.source_crop_url, confidence: extractionMetadata.confidence ?? "low", needs_review: true } : null,
          question_text: normalizeText(q.question_text),
          explanation: normalizeText(q.explanation),
          options: Array.isArray(q.options)
            ? q.options.map((opt: any) => ({
                ...opt,
                text: normalizeText(opt?.text),
                image_url: opt?.image_url ?? null,
              }))
            : [],
        });

        if (req.user?.role === "student") {
          const { correct_answer, explanation, ...rest } = normalized;
          byId[q.id] = rest;
        } else {
          byId[q.id] = normalized;
        }
      }
      // The paper's own numbering, not the array index. Migration 48 stores
      // position from the number printed on the paper precisely so a missing
      // question leaves a hole — renumbering here would close that hole again
      // and file every later question under the wrong number.
      const positionById = new Map<string, number>(
        (pqs ?? []).map((r: any) => [r.question_id, r.position])
      );
      questions = questionIds
        .map((qid, idx) => byId[qid]
          ? { ...byId[qid], question_number: positionById.get(qid) ?? idx + 1 }
          : null)
        .filter(Boolean);
    }

    const examCode = (paper as any).exams?.code ?? "";
    const examLabel = (paper as any).exams?.full_name ?? "";
    const meta = {
      id: paper.id,
      exam: examLabel || examCode,
      exam_code: examCode,
      year: paper.year ?? null,
      shift: paper.shift ?? paper.title,
      questions: questions.length,
      duration: paper.duration_min,
      title: paper.title,
      test_type: paper.test_type,
      // What each question type is worth on this paper. Without it the review
      // screen cannot show what the paper actually adds up to, which is the
      // one thing worth checking before publishing a JEE Advanced paper.
      marking_scheme: (paper as any).marking_scheme ?? null,
      total_marks: paper.total_marks ?? null,
    };

    res.json({ success: true, data: { paper: meta, questions, total: questions.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

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

    const shuffled = allQs.sort(() => Math.random() - 0.5).slice(0, question_count);

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
        institute_id: req.user!.institute_id,
        is_active: true,
        is_published: false,
        workflow_status: "draft",
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

    const pqRows = shuffled.map((q: any, idx: number) => ({
      paper_id: paper.id,
      question_id: q.id,
      position: idx + 1,
    }));
    await supabaseDB.from("paper_questions").insert(pqRows);

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

export const getAssignedTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data: batchLinks } = await supabaseDB
      .from("batch_students")
      .select("batch_id")
      .eq("student_id", userId);

    const batchIds = (batchLinks ?? []).map((r: any) => r.batch_id);
    if (batchIds.length === 0) {
      res.status(200).json({ success: true, data: { tests: [] } });
      return;
    }

    const { data: assignments, error: assignErr } = await supabaseDB
      .from("test_batch_assignments")
      .select("assigned_at, scheduled_at, batch_id, papers(id, title, test_type, total_questions, total_marks, duration_min, is_active, is_published, delivery_mode, available_from, available_until, created_at)")
      .in("batch_id", batchIds)
      .order("scheduled_at", { ascending: true });

    if (assignErr) {
      res.status(500).json({ success: false, message: assignErr.message });
      return;
    }

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

export const publishTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user?.role === "super_admin";

    if (!isSuperAdmin) {
      res.status(403).json({ success: false, message: "Institute tests must be approved and published by the Test Admin." });
      return;
    }

    // Publishing is the moment a paper can be sat, so it is the moment its
    // marks have to be right. An Advanced paper carries no default — its marks
    // differ by question type and change between years — and scoring one on the
    // fallback +4/-1 would quietly mis-score every attempt.
    //
    // Upload deliberately does not check this. A paper whose instructions page
    // was missing or unreadable is still worth keeping as a draft; it just
    // cannot go out until someone says what it is worth.
    const { data: paperRow, error: paperRowError } = await supabaseDB
      .from("papers")
      .select("marking_scheme, exams(code)")
      .eq("id", id)
      .maybeSingle();
    if (paperRowError) throw paperRowError;
    const paperExamCode = (paperRow as any)?.exams?.code ?? "";
    const hasScheme = paperRow?.marking_scheme && Object.keys(paperRow.marking_scheme).length > 0;
    if (!hasScheme && requiresExplicitScheme(paperExamCode)) {
      res.status(400).json({
        success: false,
        message: `Cannot publish: ${paperExamCode} has no standard marking scheme, so this paper must state its own. ` +
          `Set the marks per question type on the review screen, then publish.`,
      });
      return;
    }

    const { data: publishRows, error: publishRowsError } = await supabaseDB
      .from("paper_questions")
      .select("questions(question_text, question_type, options, correct_answer)")
      .eq("paper_id", id);
    if (publishRowsError) throw publishRowsError;
    const invalidQuestion = (publishRows ?? []).map((row: any) => Array.isArray(row.questions) ? row.questions[0] : row.questions).find((question: any) => {
      const answers = Array.isArray(question?.correct_answer) ? question.correct_answer : [];
      const options = Array.isArray(question?.options) ? question.options : [];
      // Was an inline list containing "mcq_multiple", which the table has never
      // stored — it holds mcq_multi — and comparing raw values also missed the
      // "Assertion-Reason" and "Matching" spellings. All three types therefore
      // skipped the options check entirely, so a multi-correct question with no
      // options passed validation.
      const choiceQuestion = isChoiceQuestion(question?.question_type);
      return !String(question?.question_text ?? "").trim() || answers.length === 0 || (choiceQuestion && options.length < 2);
    });
    if (invalidQuestion) {
      res.status(400).json({ success: false, message: "Cannot publish: one or more questions are incomplete. Review the paper first." });
      return;
    }

    let query = supabaseDB
      .from("papers")
      .update({ is_published: true, workflow_status: "published", published_at: new Date().toISOString(), published_by: req.user!.id })
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

export const updateGlobalTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const allowed = ["title", "subject", "chapter", "year", "shift", "difficulty", "duration_min", "total_marks"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];

    // The marks per question type, set on the review screen for a paper whose
    // instructions page did not state them. Validated the same way as at
    // upload — this is the number every attempt is scored against, and it is
    // the only field here that can silently produce wrong results.
    if (req.body.marking_scheme !== undefined) {
      const schemeErrors = validateMarkingScheme(req.body.marking_scheme);
      if (schemeErrors.length > 0) {
        res.status(400).json({ success: false, message: "Invalid marking_scheme.", errors: schemeErrors });
        return;
      }
      updates.marking_scheme = req.body.marking_scheme;

      // total_marks was summed when the paper was uploaded, against whatever
      // scheme existed then — for a paper that had none, that means the +4
      // fallback. Leaving it would make the paper permanently claim a total its
      // own questions do not add up to, so it is resummed here unless this
      // request is also setting it explicitly.
      if (updates.total_marks === undefined) {
        const { data: rows, error: rowsError } = await supabaseDB
          .from("paper_questions")
          .select("questions(question_type, marks)")
          .eq("paper_id", req.params.id);
        if (rowsError) throw rowsError;
        const paperQuestions = (rows ?? [])
          .map((row: any) => (Array.isArray(row.questions) ? row.questions[0] : row.questions))
          .filter(Boolean);
        if (paperQuestions.length > 0) {
          updates.total_marks = totalMarksForQuestions(paperQuestions, req.body.marking_scheme);
        }
      }
    }

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
    await logAdminAction(req.user?.id, "Global paper updated", `Updated metadata for "${data.title}".`, "question_bank", "success");
    res.status(200).json({ success: true, data: { test: data } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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

/** Same trip to R2 for figure arrays, which now carry base64 from the extractor. */
async function processBase64ImageList(images: unknown): Promise<string[]> {
  if (!Array.isArray(images)) return [];
  const uploaded = await Promise.all(
    images.map((entry) => processBase64ImageUrl(String(entry ?? "").trim() || null)),
  );
  return uploaded.filter((url): url is string => Boolean(url));
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
 * Accepts PDF (pdf) and optional answer key CSV/PDF (answer_key) file fields,
 * parses them, processes crops, creates paper, inserts questions, and assigns
 * to target batches. Now also extracts worked solutions from the answer-key PDF
 * into the explanation field.
 */
export const uploadTestController = async (req: Request, res: Response): Promise<void> => {
  let tempWorkingDir = "";
  const requestId = res.locals.pdfUpload?.requestId ?? `pdf-upload-${Date.now().toString(36)}`;
  const startedAt = res.locals.pdfUpload?.startedAt ?? Date.now();
  const elapsed = () => Date.now() - startedAt;
  const logStage = (stage: string, message: string) => {
    console.info(`[pdfUpload][${requestId}][+${elapsed()}ms][${stage}] ${message}`);
  };

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendProgress = (status: string, message: string, data?: any) => {
    logStage(status, message);
    res.write(JSON.stringify({ success: true, status, message, data, request_id: requestId, elapsed_ms: elapsed() }) + "\n");
    (res as any).flush?.();
  };

  const sendError = (message: string) => {
    console.error(`[pdfUpload][${requestId}][+${elapsed()}ms][error] ${message}`);
    if (!res.writableEnded) {
      res.write(JSON.stringify({ success: false, status: "error", message, request_id: requestId, elapsed_ms: elapsed() }) + "\n");
      res.end();
    }
  };

  try {
    sendProgress("received", "Upload received. Validating test details...");
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

    tempWorkingDir = path.join(__dirname, "../../temp", `extract_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    fs.mkdirSync(tempWorkingDir, { recursive: true });

    const tempPdfPath = path.join(tempWorkingDir, "temp.pdf");
    fs.writeFileSync(tempPdfPath, pdfFile.buffer);

    const jobId = randomUUID();
    const r2Key = `temp-pdf-jobs/${jobId}.pdf`;

    sendProgress("extracting_questions", "Uploading PDF to secure processing queue...");
    const r2StartedAt = Date.now();
    await uploadToR2Raw(pdfFile.buffer, r2Key, "application/pdf");
    logStage("extracting_questions", `PDF stored in processing queue in ${Date.now() - r2StartedAt}ms (job ${jobId}).`);

    await supabaseDB.from("pdf_extraction_jobs").insert({
      id: jobId,
      status: "pending",
      requested_by: userId,
      created_at: new Date().toISOString(),
    });

    await enqueuePdfExtraction({ jobId, r2Key, requestedBy: userId });
    sendProgress("queued", "PDF queued. Waiting for the extraction worker to start...", { job_id: jobId });

    let extractionResult: any = null;
    let pollCount = 0;
    const extractionWaitStartedAt = Date.now();
    const maxWaitMs = Number(process.env.PDF_EXTRACTION_WAIT_TIMEOUT_MS ?? 15 * 60 * 1000);

    while (true) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      pollCount++;

      if (Date.now() - extractionWaitStartedAt > maxWaitMs) {
        sendError(`PDF extraction timed out after ${Math.round(maxWaitMs / 60000)} minutes. Check the API console using request ${requestId}.`);
        return;
      }

      const { data: jobData, error: jobErr } = await supabaseDB
        .from("pdf_extraction_jobs")
        .select("status, result, error")
        .eq("id", jobId)
        .single();

      if (jobErr) {
        sendError(`Failed to check extraction status: ${jobErr.message}`);
        return;
      }

      if (jobData.status === "done") {
        extractionResult = jobData.result;
        logStage("extracting_questions", `Worker completed extraction after ${Date.now() - extractionWaitStartedAt}ms.`);
        // The worker may run in a separate process, so echo its completeness
        // verdict here — this is the log the uploader actually watches, and a
        // partial extraction must not look identical to a complete one.
        const completeness = extractionResult?.completeness;
        if (completeness) {
          logStage("extracting_questions",
            `Completeness: ${completeness.anchors_matched}/${completeness.expected_total} anchored questions ` +
            `(${(completeness.completeness * 100).toFixed(1)}%)` +
            (completeness.missing_total
              ? ` — MISSING ${completeness.missing_total}: ${JSON.stringify(completeness.missing_by_page)}`
              : "") +
            (completeness.failed_pages?.length ? ` — FAILED PAGES: ${completeness.failed_pages.join(", ")}` : ""));
        } else {
          logStage("extracting_questions",
            "Completeness: not reported by the extractor (reconciliation did not run — extractor may be stale).");
        }
        break;
      } else if (jobData.status === "failed") {
        sendError(`AI extraction failed: ${jobData.error}`);
        return;
      } else {
        const queueMessage = jobData.status === "pending" || jobData.status === "retrying"
          ? "Queued for extraction worker"
          : "Analyzing pages & running AI question extraction";
        sendProgress("extracting_questions", `${queueMessage}... ${pollCount * 5}s elapsed`, { job_id: jobId, worker_status: jobData.status });
      }
    }

    if (!extractionResult?.questions || extractionResult.questions.length === 0) {
      sendError("Failed to extract questions from the PDF.");
      return;
    }

    const malformedMatching = extractionResult.questions
      .map((question: any, index: number) => ({ question, index }))
      .filter(({ question }: any) => String(question.question_type ?? "").toLowerCase().includes("matching"))
      .filter(({ question }: any) => !Array.isArray(question.options) || question.options.filter((option: any) => String(option?.text ?? "").trim() || String(option?.image_url ?? "").trim()).length < 2);

    // ── Parse Answer Key (CSV or PDF) + Solutions ───────────────────────────
    // The answer-key parser (parse_pdf_answer_key.py v2) now:
    //   - reads ALL pages (not just last 3 — Aakash keys have the table on p1)
    //   - converts (1)->A, (2)->B, (3)->C, (4)->D to match platform option ids
    //   - extracts worked solutions into a separate solutions map
    // Output format: { "answers": {"1": ["A"], ...}, "solutions": {"1": "...", ...} }
    sendProgress("extracting_answers", "Parsing correct answers and mapping solutions...");
    const csvAnswers: Record<number, string[]> = {};
    const pdfSolutions: Record<number, string> = {};
    const isCsv = answerKeyFile?.originalname?.toLowerCase()?.endsWith(".csv") || answerKeyFile?.mimetype === "text/csv";
    const isPdf = answerKeyFile?.originalname?.toLowerCase()?.endsWith(".pdf") || answerKeyFile?.mimetype === "application/pdf";

    if (answerKeyFile && isCsv) {
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
      // Separate Answer Key PDF OR fallback to Master PDF
      const tempAnswersJsonPath = path.join(tempWorkingDir, "answers.json");
      let targetPdfPath = tempPdfPath; // fallback: Master PDF

      if (answerKeyFile && isPdf) {
        targetPdfPath = path.join(tempWorkingDir, "answer_key_document.pdf");
        fs.writeFileSync(targetPdfPath, answerKeyFile.buffer);
      }

      // Pass the extracted question count as an upper bound. The answer/solution
      // PDF may contain equations such as "T' = 300 (4)^{1/2}"; without this
      // bound the regex can misread that as a fictitious Q300→4 entry.
      const maxQuestionNumber = extractionResult.questions.length;
      const parseKeyCmd = `python "${path.join(EXTRACTOR_SCRIPT_DIR, "parse_pdf_answer_key.py")}" "${targetPdfPath}" "${tempAnswersJsonPath}" "${maxQuestionNumber}"`;
      try {
        const keyKeepAlive = setInterval(() => {
          sendProgress("extracting_answers", "AI is reading correct answers and extracting worked solutions...");
        }, 4000);
        try {
          await execAsync(parseKeyCmd, { timeout: 120000 });
        } finally {
          clearInterval(keyKeepAlive);
        }
        if (fs.existsSync(tempAnswersJsonPath)) {
          const parsed = JSON.parse(fs.readFileSync(tempAnswersJsonPath, "utf-8"));
          // v2 parser returns { answers, solutions }; v1 returned a flat dict.
          // Handle both for backward compatibility.
          const answersMap = parsed.answers ?? parsed;
          const solutionsMap = parsed.solutions ?? {};
          for (const [qNumStr, ans] of Object.entries(answersMap)) {
            const qNum = parseInt(qNumStr, 10);
            if (!isNaN(qNum) && qNum >= 1 && qNum <= maxQuestionNumber && Array.isArray(ans)) {
              csvAnswers[qNum] = ans;
            }
          }
          for (const [qNumStr, sol] of Object.entries(solutionsMap)) {
            const qNum = parseInt(qNumStr, 10);
            if (!isNaN(qNum) && qNum >= 1 && qNum <= maxQuestionNumber && typeof sol === "string" && sol.trim()) {
              pdfSolutions[qNum] = sol;
            }
          }
          console.log(`[uploadTestController] Answer key: ${Object.keys(csvAnswers).length} answers, ${Object.keys(pdfSolutions).length} solutions`);
        }
      } catch (err: any) {
        console.error("[uploadTestController] PDF Answer Key extraction failed:", err.message);
      }
    }

    sendProgress("cropping_images", "Processing diagrams & uploading cropped images to Cloud...");
    const imgKeepAlive = setInterval(() => {
      sendProgress("cropping_images", "Processing diagrams & uploading cropped images to Cloud... please wait");
    }, 4000);
    const questionRows = await (async () => {
      try {
        return await Promise.all(
          extractionResult.questions.map(async (q: any, idx: number) => {
        const processedText = await processBase64ImagesInText(q.question_text);
        const processedExplanation = await processBase64ImagesInText(q.explanation);
        const processedImageUrl = await processBase64ImageUrl(q.image_url);
        const processedQuestionImages = await processBase64ImageList(q.question_images);
        const processedExplanationImages = await processBase64ImageList(q.explanation_images);

        const processedOptions = await Promise.all(
          (q.options ?? []).map(async (opt: any) => {
            const processedOptText = await processBase64ImagesInText(opt.text);
            const processedOptImageUrl = await processBase64ImageUrl(opt.image_url);
            return {
              ...opt,
              text: processedOptText,
              image_url: processedOptImageUrl,
              ...(q.extractor_version === "v4" ? {
                content_blocks: deriveLegacyContentBlocks({
                  question_text: processedOptText,
                  image_url: processedOptImageUrl,
                  extraction_confidence: opt.extraction_confidence ?? q.extraction_confidence,
                  needs_review: opt.needs_review ?? q.needs_review ?? q._needs_review,
                  review_reasons: opt.review_reasons ?? q.review_reasons ?? q._defects,
                  source_crop: opt.source_crop,
                  source: Array.isArray(q._pages) && q._pages.length ? { page: q._pages[0], role: "option" } : undefined,
                }),
              } : {}),
            };
          })
        );

        const finalOptions = processedOptions || [];
        const isMcq = q.question_type === "MCQ" || q.question_type === "mcq_single" || q.question_type === "Assertion-Reason" || q.question_type === "Matching";

        const isNumerical = !isMcq && (!finalOptions || finalOptions.length < 2);
        const type = isNumerical ? "integer" : (q.question_type || "mcq_single");

        const csvAns = csvAnswers[idx + 1];
        const extractedAnswers = Array.isArray(q.correct_answer) ? q.correct_answer : q.correct_answer ? [q.correct_answer] : [];
        const rawAnswers = (csvAns && csvAns.length) ? csvAns : extractedAnswers;

        // Convert raw answer-key tokens to the platform format, using the
        // QUESTION TYPE and EXAM TYPE to decide what a token means.
        //
        // CRITICAL: a numerical answer of "4" must stay "4", not become "D".
        //   NEET:         180 questions, ALL MCQ, zero numericals. Every 1-4
        //                 answer ALWAYS converts to A-D. No exceptions.
        //   JEE Main:     MCQ + numerical. Numericals at fixed positions
        //                 (Q21-25, Q46-50, Q71-75 per subject section of 25).
        //   JEE Advanced: numericals scattered randomly — unpredictable.
        //   JEE Main+Adv: mix of both — the dangerous case.
        //
        // Decision tree:
        //   1. NEET exam → ALL answers are MCQ → always convert 1-4 to A-D.
        //   2. Non-NEET + question has >= 2 options (MCQ) → convert 1-4 to A-D,
        //      UNLESS any token is clearly numerical (>4, decimal, negative).
        //   3. Non-NEET + question has NO options (numerical/ambiguous) → keep raw.
        //      Never risk converting "4" to "D" on a numerical question.
        //   4. Any token > 4 or < 1 or decimal or negative → definitely
        //      numerical, keep raw regardless of exam or type.
        const NUM_TO_LETTER: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D" };
        const isNeetExam = examCode === "neet-ug";

        function isDefinitelyNumerical(val: string): boolean {
          const n = Number(val);
          return !isNaN(n) && (n > 4 || n < 1 || !Number.isInteger(n));
        }

        let correctAnswers: string[];
        const hasRealOptions = finalOptions && finalOptions.length >= 2;
        const anyDefinitelyNumerical = rawAnswers.some(isDefinitelyNumerical);

        if (anyDefinitelyNumerical) {
          // Any answer > 4 / decimal / negative → definitely numerical, keep raw
          // regardless of exam type or question type.
          correctAnswers = rawAnswers;
        } else if (isNeetExam) {
          // NEET: no numericals, ever. All answers 1-4 are option indices.
          // Convert even if the extractor dropped options (safe for NEET).
          correctAnswers = rawAnswers.map((a: string) => {
            const upper = a.toUpperCase().trim();
            return NUM_TO_LETTER[upper] ?? upper;
          });
        } else if (hasRealOptions) {
          // JEE (Main/Adv/Main+Adv) MCQ with real options: convert 1-4 to A-D.
          correctAnswers = rawAnswers.map((a: string) => {
            const upper = a.toUpperCase().trim();
            return NUM_TO_LETTER[upper] ?? upper;
          });
        } else {
          // JEE with NO options extracted: could be numerical (answer "4" is
          // the value, not option D). Keep raw and let review catch it.
          correctAnswers = rawAnswers;
        }

        // Use the solution from the answer-key PDF if available; otherwise keep
        // the LLM-extracted explanation. The answer-key PDF's solution is
        // authoritative (it's the institute's own worked solution).
        const solutionFromKey = pdfSolutions[idx + 1];
        const finalExplanation = solutionFromKey || processedExplanation || "";

        const normalizedMedia = normalizeQuestionMedia({
          question_text: processedText,
          image_url: processedImageUrl,
          options: finalOptions,
        });

        return {
          id:             randomUUID(),
          exam_id:        examId,
          test_type:      "mock-test",
          subject:        subjectForStorage(q.subject),
          chapter:        q.chapter  || "General",
          topic:          q.topic    || null,
          difficulty:     difficultyForStorage(q.difficulty, difficulty),
          year:           new Date(date).getFullYear() || null,
          source:         title,
          question_type:  questionTypeForStorage(q.question_type ?? type, normalizedMedia.options?.length ?? 0),
          question_text:  stripInlineImages(normalizedMedia.question_text),
          question_images: figuresForStorage(
            normalizedMedia.question_text,
            [...processedQuestionImages, ...(processedImageUrl ? [processedImageUrl] : [])],
          ),
          options:        normalizedMedia.options,
          correct_answer: correctAnswers,
          explanation:    stripInlineImages(finalExplanation),
          explanation_images: figuresForStorage(finalExplanation, processedExplanationImages),
          tags:           q.tags || [],
          ...(q.extractor_version === "v4" ? {
            content_blocks: deriveLegacyContentBlocks({
              question_text: normalizedMedia.question_text,
              image_url: normalizedMedia.image_url,
              extraction_confidence: q.extraction_confidence,
              needs_review: q.needs_review ?? q._needs_review,
              review_reasons: q.review_reasons ?? q._defects,
              source_crop: q.source_crop,
              source: Array.isArray(q._pages) && q._pages.length ? { page: q._pages[0], role: "stem" } : undefined,
            }),
            extraction_metadata: q.extraction_metadata ?? null,
            extractor_version: "v4",
            source_crop_url: q.source_crop?.url ?? q.source_crop_url ?? null,
          } : {}),
          institute_id:   req.user!.institute_id,
          content_scope:  "institute_private",
          review_status:  malformedMatching.some(({ index }: any) => index === idx) || correctAnswers.length === 0 ? "changes_requested" : "draft",
          created_by:     userId,
          source_reference: { ...(q.source_reference ?? {}), extracted_question_number: idx + 1, extraction_flags: [
            ...(Array.isArray(q.source_reference?.extraction_flags) ? q.source_reference.extraction_flags : []),
            ...(malformedMatching.some(({ index }: any) => index === idx) ? ["matching_options_missing"] : []),
            ...(correctAnswers.length === 0 ? ["answer_key_missing"] : []),
          ] },
          is_active:      true,
        };
      })
    );
      } finally {
        clearInterval(imgKeepAlive);
      }
    })();

    sendProgress("saving_db", "Saving extracted draft for Test Department review...");
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
        institute_id: req.user!.institute_id,
        workflow_status: "draft",
        is_published: false,
        delivery_mode: "assigned_scheduled",
        available_from: scheduledAt.toISOString(),
      })
      .select("id, workflow_status")
      .single();

    if (pErr || !paper) {
      throw new Error(`Failed to create paper: ${pErr?.message}`);
    }

    const questionBatches = chunk(questionRows, 100);
    for (const qBatch of questionBatches) {
      const { error: qErr } = await supabaseDB.from("questions").insert(qBatch);
      if (qErr) {
        throw new Error(`Failed to insert questions: ${qErr.message}`);
      }
    }

    const pqRows = questionRows.map((q: any, idx: number) => ({
      paper_id: paper.id,
      question_id: q.id,
      position: idx + 1,
    }));
    const { error: pqErr } = await supabaseDB.from("paper_questions").insert(pqRows);
    if (pqErr) {
      throw new Error(`Failed to link paper questions: ${pqErr.message}`);
    }

    const tbRows = batchIds.map((b_id: string) => ({
      test_id: paper.id,
      batch_id: b_id,
      scheduled_at: scheduledAt.toISOString(),
    }));
    const { error: tbErr } = await supabaseDB.from("test_batch_assignments").insert(tbRows);
    if (tbErr) {
      throw new Error(`Failed to assign test to batches: ${tbErr.message}`);
    }

    try {
      fs.rmSync(tempWorkingDir, { recursive: true, force: true });
    } catch (cleanupErr: any) {
      console.warn(`[uploadTestController] Cleanup failed: ${cleanupErr.message}`);
    }

    sendProgress("success", `Draft created. ${malformedMatching.length ? `${malformedMatching.length} matching question(s) require attention. ` : ""}Review and publish it from the Test Department workspace.`, {
      paper_id: paper.id,
      title,
      total_questions: questionRows.length,
      workflow_status: paper.workflow_status,
    });
    logStage("success", `Completed PDF-to-test workflow with ${questionRows.length} questions.`);
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
