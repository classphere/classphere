import { Request, Response } from "express";
import { difficultyForStorage, isChoiceQuestion, questionTypeForStorage, subjectForStorage } from "../../lib/question-taxonomy";
import { supabaseDB, supabaseAdmin } from "../../lib/supabase";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { uploadToR2, uploadToR2Raw } from "../../lib/r2";

import { extractPDF, EXTRACTOR_SCRIPT_DIR } from "../../services/extractor/pdfExtractor.service";
import { enqueuePdfExtraction } from "../../lib/queue/pdf-extraction.queue";
import { getStudentTestAccess } from "./test-access.service";
import { requiresExplicitScheme, totalMarksForQuestions, validateMarkingScheme } from "../../lib/marking-scheme";
import { MIN_KEY_COVERAGE, convertAnswers, parseAnswerKeyFromPdf } from "../../services/extractor/answer-key.service";
import { validatePaperQuestions } from "../../lib/paper-validation";
import { derivePaperSections } from "../../lib/paper-sections";
import { findSessionBreaks, splitAtBreaks } from "../../lib/paper-sessions";
import { logAdminAction } from "../../lib/admin-audit";
import { figuresForStorage, normalizeQuestionMedia, stripInlineImages } from "../../lib/question-media";
import { deriveLegacyContentBlocks } from "../../lib/question-content";

// ─────────────────────────────────────────────────────────────────────────────

/**
 * A paper's duration or total marks as supplied at creation — or null.
 *
 * Both used to carry defaults: 180 minutes and 360 marks, applied to every
 * upload regardless of what came out of the PDF, so an 80-question paper
 * claimed 360 marks while scoring at most 320. Nothing is invented here now;
 * the Test Head sets both on the review screen once the extraction is in front
 * of them, and publish refuses a paper that still has neither.
 *
 * Absent, blank and unparseable all mean the same thing: not yet stated. Blank
 * is checked explicitly because Number("") is 0, which would record a
 * zero-minute test rather than an unset one.
 */
function statedNumberOrNull(raw: unknown, { integer = false }: { integer?: boolean } = {}): number | null {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  if (integer && !Number.isInteger(parsed)) return null;
  return parsed;
}

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
        const legacyFields = "id, question_text, question_images, explanation_images, options, correct_answer, explanation, question_type, subject, chapter, topic, difficulty, source, year, tags, content_version";
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
      // How the paper divides, and how confident we are about it — read off the
      // page, assumed from the exam's pattern, or inferred from subject changes.
      // A reviewer must be able to tell those apart before approving.
      sections: derivePaperSections(questions, examCode),
      total_marks: paper.total_marks ?? null,
    };

    res.json({ success: true, data: { paper: meta, questions, total: questions.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/tests/bank-availability?exam_id=…
 * [institute_admin, test department] — What the question bank actually holds.
 *
 * Building a test from the bank was a form you filled in blind: pick a count,
 * pick subjects, submit, and find out from an error whether anything matched.
 * There was no way to see that an exam had four approved questions, or that
 * every extracted paper was still sitting unreviewed.
 *
 * Same scope and status rules as createTest, so the number shown here is the
 * number that endpoint will draw from.
 */
export const getBankAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const examId = String(req.query.exam_id ?? "").trim();
    if (!examId) { res.status(400).json({ success: false, message: "exam_id is required" }); return; }

    const instituteId = req.user!.institute_id;
    const bySubject = new Map<string, number>();
    const byChapter = new Map<string, number>();
    const byTopic = new Map<string, number>();
    let total = 0;

    // Paged: a mature bank passes PostgREST's 1,000-row ceiling, and a silently
    // truncated count here would understate the bank and send an admin looking
    // for questions they already have.
    const PAGE_SIZE = 1000;
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabaseDB
        .from("questions")
        .select("subject, chapter, topic")
        .eq("exam_id", examId)
        .eq("is_active", true)
        .eq("review_status", "approved")
        .or(`content_scope.eq.global,institute_id.eq.${instituteId}`)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) { res.status(500).json({ success: false, message: error.message }); return; }

      const page = data ?? [];
      for (const row of page) {
        const subject = String((row as any).subject ?? "").trim() || "Unspecified";
        const chapter = String((row as any).chapter ?? "").trim();
        const topic = String((row as any).topic ?? "").trim();
        bySubject.set(subject, (bySubject.get(subject) ?? 0) + 1);
        if (chapter) byChapter.set(`${subject}||${chapter}`, (byChapter.get(`${subject}||${chapter}`) ?? 0) + 1);
        // Topics are keyed by their chapter as well: two chapters can each have
        // a "Basics", and merging them would offer a filter that means nothing.
        if (chapter && topic) byTopic.set(`${subject}||${chapter}||${topic}`, (byTopic.get(`${subject}||${chapter}||${topic}`) ?? 0) + 1);
        total += 1;
      }
      if (page.length < PAGE_SIZE) break;
    }

    // How many are held back, so "your bank is empty" can distinguish nothing
    // extracted from everything extracted but not yet reviewed.
    const { count: pending } = await supabaseDB
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", examId)
      .eq("is_active", true)
      .neq("review_status", "approved")
      .or(`content_scope.eq.global,institute_id.eq.${instituteId}`);

    res.status(200).json({
      success: true,
      data: {
        total,
        awaiting_review: pending ?? 0,
        subjects: [...bySubject.entries()]
          .map(([subject, count]) => ({ subject, count }))
          .sort((a, b) => b.count - a.count),
        chapters: [...byChapter.entries()]
          .map(([key, count]) => {
            const [subject, chapter] = key.split("||");
            return { subject, chapter, count };
          })
          .sort((a, b) => b.count - a.count),
        topics: [...byTopic.entries()]
          .map(([key, count]) => {
            const [subject, chapter, topic] = key.split("||");
            return { subject, chapter, topic, count };
          })
          .sort((a, b) => b.count - a.count),
      },
    });
  } catch (err: any) {
    console.error("[getBankAvailability error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/tests/bank-questions?exam_id=…&subject=&chapter=&search=&page=
 * [institute_admin, test department] — Browse the bank to pick from it.
 *
 * Assembling from the bank could only ever be done blind: choose filters and a
 * count, and the server drew at random. There was no way to see a question
 * before it went into a paper, let alone choose it — so a teacher who knew
 * exactly which twenty questions they wanted had to build the paper as a PDF.
 *
 * Same scope and status rules as createTest and bank-availability: an approved
 * question that is either global or this institute's own.
 */
export const getBankQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const examId = String(req.query.exam_id ?? "").trim();
    if (!examId) { res.status(400).json({ success: false, message: "exam_id is required" }); return; }

    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const PAGE_SIZE = 25;
    const from = (page - 1) * PAGE_SIZE;
    const instituteId = req.user!.institute_id;

    let query = supabaseDB
      .from("questions")
      .select("id, question_text, subject, chapter, topic, difficulty, question_type, options, correct_answer", { count: "exact" })
      .eq("exam_id", examId)
      .eq("is_active", true)
      .eq("review_status", "approved")
      .or(`content_scope.eq.global,institute_id.eq.${instituteId}`);

    const subjects = String(req.query.subject ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const chapters = String(req.query.chapter ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const topics = String(req.query.topic ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (subjects.length) query = query.in("subject", subjects);
    if (chapters.length) query = query.in("chapter", chapters);
    if (topics.length) query = query.in("topic", topics);

    const search = String(req.query.search ?? "").trim();
    // Commas and parentheses are PostgREST filter syntax, and a question about
    // f(x) would otherwise produce a malformed request rather than a search.
    if (search) query = query.ilike("question_text", `%${search.replace(/[,()]/g, " ")}%`);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) { res.status(500).json({ success: false, message: error.message }); return; }

    res.status(200).json({
      success: true,
      data: {
        questions: (data ?? []).map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          subject: q.subject,
          chapter: q.chapter,
          topic: q.topic,
          difficulty: q.difficulty,
          question_type: q.question_type,
          option_count: Array.isArray(q.options) ? q.options.length : 0,
          has_answer: Array.isArray(q.correct_answer) && q.correct_answer.length > 0,
        })),
        total: count ?? 0,
        page,
        page_size: PAGE_SIZE,
      },
    });
  } catch (err: any) {
    console.error("[getBankQuestions error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      exam_id, title, type = "mock-test",
      question_count = 90, subjects, chapters, difficulty_mix, question_ids,
      subject_counts,
      duration_minutes, total_marks, batch_ids,
      scheduled_start, scheduled_end,
    } = req.body;

    // Same rule as the PDF path: nothing about what this paper is worth or how
    // long it runs is invented here. total_marks used to be questions × 4, which
    // is right for JEE Main and NEET and wrong the moment an institute prices a
    // paper its own way — and it was never a number anyone had agreed to.
    const paperDurationMin = statedNumberOrNull(duration_minutes, { integer: true });
    const paperTotalMarks = statedNumberOrNull(total_marks);

    // A NEET paper is 20 Physics + 20 Chemistry + 40 Biology, not "80
    // questions, ideally from those subjects" — the flat question_count path
    // below has no way to express that a coaching center's actual request is
    // per-subject, not a single pool it then hopes gets a reasonable split.
    // Each entry's own chapters (optional) scope that subject alone — the
    // top-level `chapters` list is never safe to reuse here, since a chapter
    // name only means something within the one subject it belongs to.
    const subjectCounts: { subject: string; count: number; chapters: string[] }[] = Array.isArray(subject_counts)
      ? subject_counts
          .map((row: any) => ({
            subject: String(row?.subject ?? "").trim(),
            count: Number(row?.count),
            chapters: Array.isArray(row?.chapters)
              ? row.chapters.map((c: unknown) => String(c).trim()).filter(Boolean)
              : [],
          }))
          .filter((row: { subject: string; count: number }) => row.subject && Number.isInteger(row.count) && row.count > 0)
      : [];
    if (subject_counts !== undefined && subjectCounts.length === 0) {
      res.status(400).json({ success: false, message: "subject_counts must be a non-empty list of { subject, count } with positive integer counts." });
      return;
    }

    // Deduplicated: the picker can select a question twice across pages, and a
    // paper containing the same question twice is a bug the admin cannot see.
    const picked: string[] = Array.isArray(question_ids)
      ? [...new Set(question_ids.map((id: unknown) => String(id).trim()).filter(Boolean))]
      : [];

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

    // Scope and review status, neither of which this query used to apply.
    //
    // questions holds two populations: `global` canonical content with a null
    // institute_id, and `institute_private` content owned by whoever extracted
    // or wrote it. Filtering on exam alone drew from both, so a test assembled
    // here could contain another institute's private questions — their bank is
    // the thing they are paying us to build.
    //
    // review_status matters just as much: PDF extraction lands questions as
    // drafts for a reason, and an unreviewed question is exactly the one that
    // still has a half-read formula or no correct answer. Only approved
    // questions belong in a paper students will sit.
    const instituteId = req.user!.institute_id;
    const scopedQuery = () => supabaseDB
      .from("questions")
      .select("id, subject, difficulty, question_type, marks")
      .eq("exam_id", exam_id)
      .eq("is_active", true)
      .eq("review_status", "approved")
      .or(`content_scope.eq.global,institute_id.eq.${instituteId}`);

    let shuffled: any[];

    if (subjectCounts.length) {
      // One scoped query per section, sampled independently, then laid out in
      // the order given — Physics block, then Chemistry, then Biology, the
      // way the paper is actually meant to read rather than one shuffled pool
      // that happens to contain the right totals.
      //
      // Sections are not unique per subject: "20 from Kinematics" and "20 from
      // Laws of Motion" are two Physics rows, which is the whole point of a
      // part test. Two rows can therefore overlap (same subject, chapter lists
      // that intersect, or either left unrestricted), so ids already taken by
      // an earlier section are excluded from later ones — otherwise the same
      // question could appear twice in one paper, which a reviewer reading a
      // 60-question draft would have little chance of noticing.
      const shortfalls: string[] = [];
      const perSection: any[][] = [];
      const usedIds = new Set<string>();
      for (const { subject, count, chapters: sectionChapters } of subjectCounts) {
        let sectionQuery = scopedQuery().eq("subject", subject);
        if (sectionChapters.length) sectionQuery = sectionQuery.in("chapter", sectionChapters);
        const { data: sectionQs } = await sectionQuery;
        const pool = (sectionQs ?? []).filter((q: any) => !usedIds.has(String(q.id)));
        const label = sectionChapters.length ? `${subject} (${sectionChapters.join(", ")})` : subject;
        if (pool.length < count) shortfalls.push(`${label}: ${pool.length} available, ${count} requested`);
        const drawn = pool.sort(() => Math.random() - 0.5).slice(0, count);
        for (const q of drawn) usedIds.add(String(q.id));
        perSection.push(drawn);
      }
      if (shortfalls.length) {
        res.status(400).json({
          success: false,
          message: `Not enough approved questions to fill this paper — ${shortfalls.join("; ")}. Widen the chapters, lower the counts, or review and approve more questions first.`,
        });
        return;
      }
      shuffled = perSection.flat();
    } else {
      let questionQuery = scopedQuery();
      if (picked.length) questionQuery = questionQuery.in("id", picked);
      else {
        if (subjects?.length) questionQuery = questionQuery.in("subject", subjects);
        if (chapters?.length) questionQuery = questionQuery.in("chapter", chapters);
      }

      const { data: allQs } = await questionQuery;
      if (!allQs || allQs.length === 0) {
        // "No questions found" told an admin nothing about which of the four
        // filters emptied the set, and the bank screen offers no way to look.
        res.status(400).json({
          success: false,
          message: subjects?.length || chapters?.length
            ? "No approved questions match those subjects and chapters. Widen the filters, or review and approve extracted papers first."
            : "Your question bank has no approved questions for this exam yet. Extracted papers have to be reviewed and approved before they can be drawn from.",
        });
        return;
      }
      if (!picked.length && allQs.length < question_count) {
        res.status(400).json({ success: false, message: `Only ${allQs.length} eligible questions are available; ${question_count} were requested.` });
        return;
      }

      // An explicit selection is used exactly as given — same order, no sampling.
      // Filters draw at random because nobody has said which questions they want;
      // once someone has, choosing for them is just losing their work. The ids are
      // intersected with the scoped set above rather than trusted, so a client
      // cannot name another institute's question or an unapproved one.
      shuffled = picked.length
        ? (() => {
            const eligible = new Map(allQs.map((q: any) => [String(q.id), q]));
            return picked.map((id: string) => eligible.get(id)).filter(Boolean) as typeof allQs;
          })()
        : allQs.sort(() => Math.random() - 0.5).slice(0, question_count);

      // Some ids survived neither the scope filter nor the status filter. Saying
      // so beats quietly building a shorter paper than the one that was chosen.
      if (picked.length && shuffled.length !== picked.length) {
        res.status(400).json({
          success: false,
          message: `${picked.length - shuffled.length} of the ${picked.length} chosen questions are no longer available — they may have been edited, unapproved, or removed. Reload the picker and try again.`,
        });
        return;
      }
    }

    // The bank-built paper has no review screen of its own — this call both
    // builds and assigns it in one step — so unlike the PDF/global upload
    // paths there is nowhere later to type a total. When the caller hasn't
    // stated one, it is summed from what the chosen questions actually carry
    // (falling back to the +4/-1 NEET/JEE Main convention per question, same
    // as totalMarksForQuestions does everywhere else) rather than left null,
    // which the papers table's NOT NULL constraint rejects outright.
    const computedTotalMarks = paperTotalMarks ?? totalMarksForQuestions(shuffled, null);

    const { data: paper, error: pErr } = await supabaseDB
      .from("papers")
      .insert({
        exam_id,
        title: title ?? `Custom Test — ${new Date().toLocaleDateString("en-IN")}`,
        test_type: type,
        total_questions: shuffled.length,
        total_marks: computedTotalMarks,
        duration_min: paperDurationMin,
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

/**
 * GET /api/v1/tests/:id/batches
 * [teacher, institute_admin, test department] — Which of the institute's
 * batches this test was assigned to, and how many of each have submitted.
 *
 * Batch analysis is per (test, batch), and nothing until now could answer
 * "which batches does this test even have results for" — so there was no way
 * to build a picker for it without listing every batch in the institute and
 * letting most of them 403.
 */
export const listTestBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const instituteId = req.user!.institute_id;
    const isSuperAdmin = req.user?.role === "super_admin";

    const { data: paper } = await supabaseDB
      .from("papers")
      .select("id, title, institute_id")
      .eq("id", req.params.id)
      .maybeSingle();
    if (!paper) { res.status(404).json({ success: false, message: "Test not found." }); return; }
    if (!isSuperAdmin && paper.institute_id && paper.institute_id !== instituteId) {
      res.status(403).json({ success: false, message: "This test belongs to another institute." });
      return;
    }

    const { data: assignments, error } = await supabaseDB
      .from("test_batch_assignments")
      .select("batch_id, scheduled_at, batches(id, name, exam, institute_id)")
      .eq("test_id", paper.id);
    if (error) throw error;

    const owned = (assignments ?? []).filter((row: any) => {
      const batch = Array.isArray(row.batches) ? row.batches[0] : row.batches;
      return batch && (isSuperAdmin || batch.institute_id === instituteId);
    });

    // Submission counts per batch, so the picker can say which batches have
    // anything to analyse yet rather than opening an empty report.
    const batchIds = owned.map((row: any) => row.batch_id);
    const submittedByBatch = new Map<string, number>();
    if (batchIds.length) {
      const { data: attempts } = await supabaseDB
        .from("attempts")
        .select("batch_id")
        .eq("paper_id", paper.id)
        .eq("status", "submitted")
        .in("batch_id", batchIds);
      for (const row of attempts ?? []) {
        submittedByBatch.set(row.batch_id, (submittedByBatch.get(row.batch_id) ?? 0) + 1);
      }
    }

    const batches = owned.map((row: any) => {
      const batch = Array.isArray(row.batches) ? row.batches[0] : row.batches;
      return {
        batch_id: batch.id,
        name: batch.name,
        exam: batch.exam,
        scheduled_at: row.scheduled_at ?? null,
        submitted_count: submittedByBatch.get(batch.id) ?? 0,
      };
    });

    res.status(200).json({ success: true, data: { paper: { id: paper.id, title: paper.title }, batches } });
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

    // What this student has already done with each of these papers. Without it
    // the list offers "Start Test" on a test they have already sat, and the
    // one-attempt rule in startAttempt turns that into a dead-end error at the
    // moment they click it rather than something the card could have shown.
    if (assignedTests.length > 0) {
      const { data: attempts } = await supabaseDB
        .from("attempts")
        .select("id, paper_id, status")
        .eq("student_id", userId)
        .in("paper_id", assignedTests.map((test: any) => test.id))
        .in("status", ["in_progress", "submitting", "submitted"]);

      const byPaper = new Map<string, { attempt_id: string; status: string }>();
      for (const row of attempts ?? []) {
        // in_progress wins: a resumable attempt is the more useful thing to
        // surface than an older finished one, and only one can exist at a time.
        const existing = byPaper.get(row.paper_id);
        if (!existing || row.status === "in_progress") {
          byPaper.set(row.paper_id, { attempt_id: row.id, status: row.status });
        }
      }
      for (const test of assignedTests) {
        const mine = byPaper.get(test.id);
        test.my_attempt_id = mine?.attempt_id ?? null;
        test.my_attempt_status = mine?.status ?? null;
      }
    }

    res.status(200).json({ success: true, data: { tests: assignedTests } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Publish one global paper: the marking-scheme guard, the per-question
 * validation, the paper row, and the approval of its questions.
 *
 * Extracted from publishTest so bulkPublishGlobalTests runs exactly the same
 * checks. A bulk path with its own looser rules is how a paper that the single
 * publish button refuses gets published anyway.
 */
async function publishGlobalPaper(
  paperId: string,
  userId: string,
): Promise<
  | { ok: true; paper: { id: string; title: string; is_published: boolean } }
  | { ok: false; status: number; message: string; errors?: string[]; questions?: any[] }
> {
  // Publishing is the moment a paper can be sat, so it is the moment its marks
  // have to be right. An Advanced paper carries no default — its marks differ by
  // question type and change between years — and scoring one on the fallback
  // +4/-1 would quietly mis-score every attempt.
  //
  // Upload deliberately does not check this. A paper whose instructions page was
  // missing or unreadable is still worth keeping as a draft; it just cannot go
  // out until someone says what it is worth.
  const { data: paperRow, error: paperRowError } = await supabaseDB
    .from("papers")
    .select("marking_scheme, extracted_from_pdf, total_marks, duration_min, exams(code)")
    .eq("id", paperId)
    .maybeSingle();
  if (paperRowError) throw paperRowError;

  // Same rule the institute Test Department's publish action enforces
  // (test-department.controller.ts): nothing about what a paper is worth or
  // how long it runs is guessed any more, so a global paper published without
  // either would run on a fallback duration and an unstated total — exactly
  // the silent wrongness the null-by-default upload was meant to defer, not skip.
  const missingDetails: string[] = [];
  if (!Number.isFinite(Number((paperRow as any)?.duration_min)) || Number((paperRow as any)?.duration_min) <= 0) {
    missingDetails.push("how long it runs");
  }
  if ((paperRow as any)?.total_marks === null || (paperRow as any)?.total_marks === undefined) {
    missingDetails.push("what it is worth in total");
  }
  if (missingDetails.length) {
    return {
      ok: false,
      status: 400,
      message: `Cannot publish: this paper does not yet say ${missingDetails.join(" or ")}. Set them on the review screen, then publish.`,
    };
  }

  const paperExamCode = (paperRow as any)?.exams?.code ?? "";
  const hasScheme = paperRow?.marking_scheme && Object.keys(paperRow.marking_scheme).length > 0;
  if (!hasScheme && requiresExplicitScheme(paperExamCode)) {
    return {
      ok: false,
      status: 400,
      message: `Cannot publish: ${paperExamCode} has no standard marking scheme, so this paper must state its own. ` +
        `Set the marks per question type on the review screen, then publish.`,
    };
  }

  // The same function the validate endpoint uses, so a paper can never pass
  // validation and then be refused at publish, or the reverse. Publication once
  // ran its own narrower checks and reported at most five deduplicated messages
  // with no question numbers, which told a reviewer that something was wrong but
  // not where.
  //
  // question_number is not a real column on questions — computed below from
  // position, as getPaper and getTest already do. Selecting it directly threw
  // "column questions_1.question_number does not exist" on every call, which was
  // once the actual reason no paper could be published through here.
  const { data: publishRows, error: publishRowsError } = await supabaseDB
    .from("paper_questions")
    .select("position, questions(id, subject, chapter, question_text, question_type, options, correct_answer, source_reference, extraction_metadata)")
    .eq("paper_id", paperId);
  if (publishRowsError) throw publishRowsError;

  const publishQuestions = (publishRows ?? []).map((row: any, idx: number) => {
    const question = Array.isArray(row.questions) ? row.questions[0] : row.questions;
    return {
      position: row.position,
      ...question,
      question_number: question?.question_number ?? row.position ?? idx + 1,
    };
  });
  const report = validatePaperQuestions(publishQuestions, paperExamCode, Boolean((paperRow as any)?.extracted_from_pdf));

  if (report.summary.withErrors > 0) {
    return {
      ok: false,
      status: 400,
      message: `Cannot publish: ${report.summary.withErrors} question(s) must be fixed first. Validate the paper to see each one.`,
      // Named, so the reviewer knows which questions to open rather than being
      // told a count.
      errors: report.questions
        .filter((entry) => entry.severity === "error")
        .slice(0, 8)
        .map((entry) => `Q${entry.question_number}: ${entry.issues.find((i) => i.severity === "error")?.message ?? "invalid"}`),
      questions: report.questions.filter((entry) => entry.severity === "error"),
    };
  }

  const { data: paper, error } = await supabaseDB
    .from("papers")
    .update({ is_published: true, workflow_status: "published", published_at: new Date().toISOString(), published_by: userId })
    .eq("id", paperId)
    .eq("is_active", true)
    .select("id, title, is_published")
    .maybeSingle();
  if (error) throw error;
  if (!paper) return { ok: false, status: 404, message: "Test not found or access denied." };

  // Publishing is the review being signed off, so it is also the moment the
  // paper's questions become bank content. Nothing else in the product could do
  // this for a global paper: the only other writer of approved is the Test
  // Department's, scoped to an institute_id, and a global question's is NULL.
  // Publishing therefore marked the paper sittable and left every question in it
  // invisible to the picker, auto-fill, DPP browse and topic practice.
  //
  // Not an error if it fails — the paper is already published by this point, and
  // reporting a failure for work that succeeded would send a superadmin
  // publishing it again.
  const publishedQuestionIds = publishQuestions.map((q: any) => q.id).filter(Boolean);
  // PostgREST puts .in() filters in the URL, not the body, even for an update.
  // A paper north of ~250 questions turned that into a query string long enough
  // to be rejected outright — "questions not approved: Bad Request" on every
  // paper big enough to trip it, silently, since this step was never surfaced
  // as a publish failure. Chunked so no single request's filter can grow
  // unbounded with the paper.
  const QUESTION_UPDATE_CHUNK = 150;
  for (let i = 0; i < publishedQuestionIds.length; i += QUESTION_UPDATE_CHUNK) {
    const chunk = publishedQuestionIds.slice(i, i + QUESTION_UPDATE_CHUNK);
    const { error: approveError } = await supabaseDB
      .from("questions")
      .update({ review_status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: userId })
      .in("id", chunk)
      .neq("review_status", "approved");
    if (approveError) console.error("[publishGlobalPaper] questions not approved:", approveError.message);
  }

  return { ok: true, paper: paper as any };
}

export const publishTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user?.role === "super_admin";

    if (!isSuperAdmin) {
      res.status(403).json({ success: false, message: "Institute tests must be approved and published by the Test Admin." });
      return;
    }

    const result = await publishGlobalPaper(id, req.user!.id);
    if (!result.ok) {
      res.status(result.status).json({
        success: false,
        message: result.message,
        ...(result.errors ? { errors: result.errors } : {}),
        ...(result.questions ? { questions: result.questions } : {}),
      });
      return;
    }

    res.status(200).json({ success: true, message: "Test published", data: { test: result.paper } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/tests/bulk/global/publish
 * [super_admin] — Publish the selected global papers in one go.
 *
 * The bank screen already selects papers in bulk to edit and to delete them;
 * publishing was the one action left that had to be done by opening each paper
 * in turn, which for a backlog of uploads means hundreds of round trips.
 *
 * Every paper goes through publishGlobalPaper, so a paper that the single
 * publish button refuses is refused here too, and is reported by name rather
 * than silently skipped: a partial success that reads as a total one is how a
 * paper nobody can sit sits in a batch waiting to be noticed.
 */
export const bulkPublishGlobalTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      res.status(400).json({ success: false, message: "Supply 1-100 paper ids." });
      return;
    }

    // Same eligibility gate as bulkDeleteGlobalTests: global papers only, so a
    // selection that has picked up an institute's paper is refused outright
    // rather than half-applied.
    const { data: eligible, error: eligibilityError } = await supabaseDB
      .from("papers")
      .select("id, title")
      .in("id", ids)
      .is("institute_id", null)
      .eq("is_active", true);
    if (eligibilityError) throw eligibilityError;
    if ((eligible?.length ?? 0) !== ids.length) {
      res.status(409).json({ success: false, message: "One or more selected papers are not active global papers; no change was made." });
      return;
    }

    const titles = new Map((eligible ?? []).map((row: any) => [row.id, row.title]));
    const published: string[] = [];
    const failed: { id: string; title: string; message: string }[] = [];

    // Sequential on purpose. Each paper reads its questions and writes them
    // back, and a hundred of those at once against one Postgres connection pool
    // is how a bulk action takes the API down with it.
    for (const id of ids) {
      try {
        const result = await publishGlobalPaper(id, req.user!.id);
        if (result.ok) published.push(id);
        else failed.push({ id, title: titles.get(id) ?? id, message: result.message });
      } catch (err: any) {
        failed.push({ id, title: titles.get(id) ?? id, message: err.message ?? "Publish failed." });
      }
    }

    await logAdminAction(
      req.user?.id,
      "Global papers bulk published",
      `Published ${published.length} of ${ids.length} global papers.` +
        (failed.length ? ` ${failed.length} refused: ${failed.map((f) => f.title).join(", ")}.` : ""),
      "question_bank",
      // "info" rather than "error" for a partial run: the papers that did
      // publish are a real success, and the refusals are named in the detail.
      failed.length ? "info" : "success",
    );

    res.status(200).json({ success: true, data: { published: published.length, failed } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/tests/:id/validate
 *
 * The same report the Test Department gets, for the Superadmin question bank.
 * That screen previously had no validation at all: the only checks ran at
 * publish time and reported at most five deduplicated messages with no question
 * numbers, so a superadmin reviewing a 75-question paper had nothing to work
 * from but reading all of it.
 */
export const validateTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: paper, error: paperError } = await supabaseDB
      .from("papers")
      .select("id, institute_id, extracted_from_pdf, exam_code:exams(code)")
      .eq("id", req.params.id)
      .eq("is_active", true)
      .maybeSingle();
    if (paperError) throw paperError;
    if (!paper) { res.status(404).json({ success: false, message: "Paper not found." }); return; }
    if (paper.institute_id && req.user?.role !== "super_admin" && paper.institute_id !== req.user?.institute_id) {
      res.status(403).json({ success: false, message: "This paper belongs to another institute." });
      return;
    }

    // question_number is not a real column on questions — computed below from
    // position, as getPaper and getTest already do. Selecting it directly threw
    // "column questions_1.question_number does not exist" on every call, which
    // made Validate paper a 500 for every paper.
    const { data: rows, error } = await supabaseDB
      .from("paper_questions")
      .select("position, questions(id, subject, chapter, question_text, question_type, options, correct_answer, source_reference, extraction_metadata)")
      .eq("paper_id", paper.id)
      .order("position", { ascending: true });
    if (error) throw error;

    const questions = (rows ?? []).map((row: any, idx: number) => {
      const question = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      return {
        position: row.position,
        ...question,
        question_number: question?.question_number ?? row.position ?? idx + 1,
      };
    });

    res.json({ success: true, data: validatePaperQuestions(questions, (paper as any).exam_code?.code ?? "", Boolean((paper as any).extracted_from_pdf)) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/v1/tests/:id/questions/:questionId
 *
 * Remove a question from a global paper. The case this exists for is the empty
 * slot the extractor creates when it detects a question-number anchor the model
 * never returned — a stray "76." in a formula sheet produces a blank question
 * that cannot be filled in, because there is nothing on the page to fill it with.
 *
 * Positions of the remaining questions are left alone: they carry the number
 * printed on the paper, so closing the gap would renumber real questions in
 * order to hide a removed one.
 */
export const deleteTestQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, questionId } = req.params;
    const { data: paper, error: paperError } = await supabaseDB
      .from("papers").select("id, is_published").eq("id", id).eq("is_active", true).maybeSingle();
    if (paperError) throw paperError;
    if (!paper) { res.status(404).json({ success: false, message: "Paper not found." }); return; }
    if (paper.is_published) {
      res.status(409).json({ success: false, message: "A published paper is immutable. Unpublish it first." });
      return;
    }

    const { data: link } = await supabaseDB
      .from("paper_questions").select("question_id").eq("paper_id", id).eq("question_id", questionId).maybeSingle();
    if (!link) { res.status(404).json({ success: false, message: "Question is not part of this paper." }); return; }

    const { error: unlinkError } = await supabaseDB
      .from("paper_questions").delete().eq("paper_id", id).eq("question_id", questionId);
    if (unlinkError) throw unlinkError;

    const { error: deactivateError } = await supabaseAdmin
      .from("questions").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", questionId);
    if (deactivateError) throw deactivateError;

    const { count } = await supabaseDB
      .from("paper_questions").select("question_id", { count: "exact", head: true }).eq("paper_id", id);
    await supabaseDB.from("papers").update({ total_questions: count ?? 0 }).eq("id", id);

    await logAdminAction(req.user?.id, "Question removed from paper", `Removed question ${questionId} from paper ${id}.`, "question_bank", "success");
    res.status(200).json({ success: true, data: { removed: questionId, total_questions: count ?? 0 } });
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

    // Deactivating the paper alone left its questions exactly as eligible as
    // before for every other consumer of the bank (createTest's auto-fill,
    // getBankAvailability, topic-wise practice) — none of them care which
    // paper a question came from, only that it's is_active and approved. A
    // question still reachable through some other active paper is left alone.
    const { error: cascadeError } = await supabaseDB.rpc("deactivate_orphaned_paper_questions", { p_paper_ids: [id] });
    if (cascadeError) console.error("[deleteTest] Failed to deactivate orphaned questions:", cascadeError.message);

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

    // Same cascade as the single-paper delete: a question only reachable
    // through these papers stops being eligible for the bank too, instead of
    // silently surviving every paper that ever held it.
    const { error: cascadeError } = await supabaseDB.rpc("deactivate_orphaned_paper_questions", { p_paper_ids: ids });
    if (cascadeError) console.error("[bulkDeleteGlobalTests] Failed to deactivate orphaned questions:", cascadeError.message);

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
      duration_min,
      total_marks,
      difficulty = "medium",
    } = req.body;

    // Neither is defaulted any more — see statedNumberOrNull. Both are the Test
    // Head's to type on the review screen once the extraction is in front of
    // them, and publish refuses a paper while either is still unset.
    const paperDurationMin = statedNumberOrNull(duration_min, { integer: true });
    const paperTotalMarks = statedNumberOrNull(total_marks);

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
    // Set once the worker finishes, from extractionResult.completeness — the
    // one sentence that actually says whether every question in the PDF made
    // it in, surfaced to both the live progress stream and the final success
    // message. Before this it was only ever console.logged on the server,
    // so a partial extraction read identically to a complete one to whoever
    // was actually watching the upload.
    let completenessNote = "";
    // Same idea, for the separately-uploaded answer key: set below once it's
    // been parsed, so the person who attached it finds out here if it was
    // discarded (unreadable, wrong document, or too sparse to trust) instead
    // of only in a server-side console.warn they never see, and every
    // question quietly landing with an empty correct_answer.
    let answerKeyNote = "";
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
          const pageList = (numbers: number[], page: string) => `p${page}: Q${numbers.join(", Q")}`;
          const missingDetail = Object.entries(completeness.missing_by_page ?? {})
            .map(([page, numbers]) => pageList(numbers as number[], page))
            .join("; ");
          if (completeness.missing_total) {
            completenessNote = ` ${completeness.missing_total} question(s) could not be read from the PDF and were ` +
              `left as blank placeholders for you to fill in — ${missingDetail}.`;
          } else if (completeness.failed_pages?.length) {
            completenessNote = ` Page(s) ${completeness.failed_pages.join(", ")} failed after every retry; ` +
              `their questions are missing — re-upload the PDF to try again, or fill them in by hand.`;
          }
          logStage("extracting_questions",
            `Completeness: ${completeness.anchors_matched}/${completeness.expected_total} anchored questions ` +
            `(${(completeness.completeness * 100).toFixed(1)}%)` +
            (completeness.missing_total
              ? ` — MISSING ${completeness.missing_total}: ${JSON.stringify(completeness.missing_by_page)}`
              : "") +
            (completeness.failed_pages?.length ? ` — FAILED PAGES: ${completeness.failed_pages.join(", ")}` : ""));
          sendProgress("extracting_questions",
            completenessNote
              ? `Extracted ${completeness.extracted_total} question(s).${completenessNote}`
              : `Extracted ${completeness.extracted_total} question(s) — all ${completeness.expected_total} detected in the PDF were found.`,
            { completeness });
        } else {
          logStage("extracting_questions",
            "Completeness: not reported by the extractor (reconciliation did not run — extractor may be stale).");
          completenessNote = " This extractor build did not report a completeness check — verify the question count against the PDF yourself before publishing.";
          sendProgress("extracting_questions", "Extraction finished, but no completeness check was reported.");
        }
        // A key printed inside the question PDF itself, distinct from the
        // answer_key file handled below — same discard-and-say-nothing bug,
        // fixed the same way. Appended rather than assigned, since both this
        // and a separately-uploaded key can each have their own outcome.
        const ownKey = extractionResult?.ownAnswerKeyResult;
        if (ownKey?.rejected) {
          answerKeyNote += ` The answer key printed in the question PDF itself was found but discarded (${ownKey.rejected}) — too sparse to trust.`;
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
      if (Object.keys(csvAnswers).length === 0) {
        answerKeyNote += ` The attached answer key CSV (${answerKeyFile.originalname}) had no readable ` +
          `"question number, answer" rows — check it's comma-separated with the question number first.`;
        sendProgress("extracting_answers", `Answer key not applied.${answerKeyNote}`);
      }
    } else if (answerKeyFile && isPdf) {
      // Only a separate key file is read here. The question PDF has already
      // been searched for its own key by the extractor, which runs before this
      // and applies whatever it finds. Repeating that meant spawning the parser
      // twice over the same document and reporting two coverage figures for one
      // paper -- 41% and 47% on the same 51 questions -- which reads like two
      // findings rather than one measurement made twice.
      const targetPdfPath = path.join(tempWorkingDir, "answer_key_document.pdf");
      fs.writeFileSync(targetPdfPath, answerKeyFile.buffer);

      // The highest question number from the extraction, not the array length.
      // When the extractor misses questions, the array is shorter than the
      // paper's real numbering, and using .length wrongly inflates the coverage
      // denominator — a valid key covering 75/75 real questions would show as
      // 75/73 = 103% if 2 were missed, or worse, the filter comparison against
      // maxQuestionNumber would discard answers for question numbers above the
      // array length.
      const maxQuestionNumber = Math.max(
        extractionResult.questions.length,
        ...extractionResult.questions.map((q: any) => Number(q.question_number) || 0),
      );
      try {
        const keyKeepAlive = setInterval(() => {
          sendProgress("extracting_answers", "AI is reading correct answers and extracting worked solutions...");
        }, 4000);
        let parsed;
        try {
          parsed = await parseAnswerKeyFromPdf(targetPdfPath, maxQuestionNumber);
        } finally {
          clearInterval(keyKeepAlive);
        }

        // A supplied key file can still be the wrong document, or a scan the
        // regexes cannot read. They are broad enough to find "answers" in
        // ordinary prose — over a 51-question paper carrying no key they
        // returned 14 — so a sparse reading is discarded whole rather than used
        // to mark part of the paper wrong.
        const numbers = Object.keys(parsed.answers).filter((n) => {
          const qNum = parseInt(n, 10);
          return !isNaN(qNum) && qNum >= 1 && qNum <= maxQuestionNumber;
        });
        const coverage = maxQuestionNumber > 0 ? numbers.length / maxQuestionNumber : 0;

        if (numbers.length === 0) {
          // Not even the "scattered false matches below threshold" case —
          // the parser found nothing in this document shaped like an answer
          // key at all. Previously this fell through to the else branch
          // silently: the loop over an empty `numbers` array applied zero
          // answers with no warning anywhere, server-side included.
          answerKeyNote += ` The attached answer key PDF (${answerKeyFile.originalname}) had no readable answers — ` +
            `it may be the wrong document, a scanned image with no text layer, or a layout the parser doesn't recognize.`;
          sendProgress("extracting_answers", `Answer key not applied.${answerKeyNote}`);
        } else if (coverage < MIN_KEY_COVERAGE) {
          const percent = Math.round(coverage * 100);
          answerKeyNote += ` The attached answer key PDF (${answerKeyFile.originalname}) only matched ${numbers.length}/${maxQuestionNumber} ` +
            `questions (${percent}%) — discarded as too sparse to trust rather than applied to part of the paper.`;
          console.warn(
            `[uploadTestController] Answer key discarded: covered ${numbers.length}/${maxQuestionNumber} ` +
            `(${percent}%), below the ${Math.round(MIN_KEY_COVERAGE * 100)}% a real key reaches.`,
          );
          sendProgress("extracting_answers", `Answer key not applied.${answerKeyNote}`);
        } else {
          for (const qNumStr of numbers) {
            const ans = parsed.answers[qNumStr];
            if (Array.isArray(ans)) csvAnswers[parseInt(qNumStr, 10)] = ans;
          }
          for (const [qNumStr, sol] of Object.entries(parsed.solutions)) {
            const qNum = parseInt(qNumStr, 10);
            if (!isNaN(qNum) && qNum >= 1 && qNum <= maxQuestionNumber && typeof sol === "string" && sol.trim()) {
              pdfSolutions[qNum] = sol;
            }
          }
          console.log(`[uploadTestController] Answer key: ${Object.keys(csvAnswers).length} answers, ${Object.keys(pdfSolutions).length} solutions`);
          sendProgress("extracting_answers", `Answer key applied: ${Object.keys(csvAnswers).length} answer(s), ${Object.keys(pdfSolutions).length} solution(s).`);
        }
      } catch (err: any) {
        answerKeyNote += ` The attached answer key PDF (${answerKeyFile.originalname}) could not be read: ${err.message}.`;
        console.error("[uploadTestController] PDF Answer Key extraction failed:", err.message);
        sendProgress("extracting_answers", `Answer key not applied.${answerKeyNote}`);
      }
    } else if (answerKeyFile) {
      answerKeyNote += ` The attached file (${answerKeyFile.originalname}) wasn't recognized as a CSV or PDF answer key, so it was ignored.`;
      sendProgress("extracting_answers", `Answer key not applied.${answerKeyNote}`);
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

        // Look up by the real question number from the paper, not the array
        // index. The answer key PDF is keyed by printed question number ("Q1",
        // "Q2", ...), so when the extractor misses questions and the array is
        // shorter than the paper, idx+1 and question_number diverge and answers
        // silently apply to the wrong questions.
        const realQNum: number = q.question_number ?? (idx + 1);
        const csvAns = csvAnswers[realQNum];
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
        // The queued upload reads a paper's own key with these same rules, so
        // they live in one place — a paper is keyed identically whichever door
        // it came through.
        const correctAnswers = convertAnswers(rawAnswers, type, finalOptions?.length ?? 0, examCode);

        // Use the solution from the answer-key PDF if available; otherwise keep
        // the LLM-extracted explanation. The answer-key PDF's solution is
        // authoritative (it's the institute's own worked solution).
        const solutionFromKey = pdfSolutions[realQNum];
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
          source_reference: { ...(q.source_reference ?? {}), extracted_question_number: q.question_number ?? (idx + 1), extraction_flags: [
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

    // A "PYQ compilation" — several exam sessions bound into one PDF, common
    // from platforms that publish multi-shift previous-year papers — extracts
    // perfectly well: every question is real and correctly read. Nothing about
    // any single question looks wrong. What gives it away is question_number
    // resetting back near 1 after already reaching a real exam's size — a real
    // JEE Main paper numbers 1..75 straight through and never restarts.
    // Without this check that reset was invisible: position is assigned by
    // array order below regardless, so a two-session PDF silently became one
    // paper carrying both sessions under one timer.
    const sessionBreaks = findSessionBreaks(extractionResult.questions);
    const sessionGroups = splitAtBreaks(questionRows, sessionBreaks);
    const isSplit = sessionGroups.length > 1;

    sendProgress("saving_db", isSplit
      ? `This document contains ${sessionGroups.length} separate exam sessions (question numbering restarts partway through) — creating ${sessionGroups.length} separate papers instead of one.`
      : "Saving extracted draft for Test Department review...");

    const questionBatches = chunk(questionRows, 100);
    for (const qBatch of questionBatches) {
      const { error: qErr } = await supabaseDB.from("questions").insert(qBatch);
      if (qErr) {
        throw new Error(`Failed to insert questions: ${qErr.message}`);
      }
    }

    const createdPapers: { id: string; title: string; total_questions: number; workflow_status: string }[] = [];

    for (const [sessionIdx, group] of sessionGroups.entries()) {
      const sessionTitle = isSplit ? `${title} — Session ${sessionIdx + 1}` : title;

      const { data: paper, error: pErr } = await supabaseDB
        .from("papers")
        .insert({
          exam_id: examId,
          title: sessionTitle,
          test_type: "mock-test",
          total_questions: group.length,
          // Every split paper is its own standalone exam of the same kind, so
          // each gets whatever the upload specified rather than a share of it.
          // Usually that is null on both counts, and the Test Head prices and
          // times each session separately on its own review screen — which is
          // the honest answer, since a split PDF's two sessions need not be
          // worth the same or run for the same length.
          total_marks: paperTotalMarks,
          duration_min: paperDurationMin,
          created_by: userId,
          is_active: true,
          institute_id: req.user!.institute_id,
          workflow_status: "draft",
          is_published: false,
          delivery_mode: "assigned_scheduled",
          available_from: scheduledAt.toISOString(),
          // The one signal validatePaperQuestions has for treating a question-
          // count mismatch as a real problem rather than a deliberate choice —
          // this paper's questions came from automated PDF extraction, so a
          // mismatch against the exam's official pattern is almost always
          // extraction missing some, not intentional.
          extracted_from_pdf: true,
        })
        .select("id, workflow_status")
        .single();

      if (pErr || !paper) {
        throw new Error(`Failed to create paper: ${pErr?.message}`);
      }

      // Use the paper's own numbering (extracted_question_number) for position
      // so a genuinely-missed question stays a hole in the numbering instead of
      // silently shifting every later question forward into its slot.
      // Falls back to a running counter when question_number is absent, same as
      // the superadmin RPC (create_global_review_draft_with_questions).
      let runningPos = 0;
      const pqRows = group.map((q: any, idx: number) => {
        const stated = q.source_reference?.extracted_question_number;
        if (typeof stated === "number" && stated > 0) {
          runningPos = stated;
        } else {
          runningPos = runningPos + 1;
        }
        return {
          paper_id: paper.id,
          question_id: q.id,
          position: runningPos,
        };
      });

      // Detect holes in the position sequence and fill them with is_gap
      // placeholder rows so an editor can type the missed questions in from the
      // review workspace. Publication already refuses papers with empty
      // question_text, so a gap cannot reach a student by accident.
      const occupiedPositions = new Set(pqRows.map((r) => r.position));
      const maxPos = Math.max(...occupiedPositions);
      const gapQuestionRows: any[] = [];
      const gapPqRows: any[] = [];

      // Build a position → subject map from the real questions so gap
      // placeholders inherit the subject of their nearest neighbor. A gap at
      // position 35 in a NEET paper where Q34 is Physics should be Physics,
      // not "Unclassified".
      const posToSubject = new Map<number, string>();
      for (const row of pqRows) {
        const q = group.find((g: any) => g.id === row.question_id);
        if (q?.subject) posToSubject.set(row.position, q.subject);
      }
      const inferSubjectForGap = (gapPos: number): string => {
        // Walk outward from the gap position to find the nearest real question's subject.
        for (let offset = 1; offset <= maxPos; offset++) {
          if (posToSubject.has(gapPos - offset)) return posToSubject.get(gapPos - offset)!;
          if (posToSubject.has(gapPos + offset)) return posToSubject.get(gapPos + offset)!;
        }
        return "Unclassified";
      };

      for (let pos = 1; pos <= maxPos; pos++) {
        if (occupiedPositions.has(pos)) continue;
        const gapId = randomUUID();
        gapQuestionRows.push({
          id:             gapId,
          exam_id:        examId,
          test_type:      "mock-test",
          subject:        inferSubjectForGap(pos),
          chapter:        "General",
          topic:          null,
          difficulty:     "medium",
          year:           null,
          source:         isSplit ? `${title} — Session ${sessionIdx + 1}` : title,
          question_type:  "mcq_single",
          question_text:  "",
          question_images: [],
          options:        [],
          correct_answer: [],
          explanation:    "",
          explanation_images: [],
          tags:           [],
          institute_id:   req.user!.institute_id,
          content_scope:  "institute_private",
          review_status:  "changes_requested",
          created_by:     userId,
          is_active:      true,
          source_reference: {
            extracted_question_number: pos,
            extraction_flags: ["gap_placeholder"],
          },
        });
        gapPqRows.push({
          paper_id: paper.id,
          question_id: gapId,
          position: pos,
        });
      }

      // Insert gap question rows first (they must exist before paper_questions references them)
      if (gapQuestionRows.length > 0) {
        const { error: gapQErr } = await supabaseDB.from("questions").insert(gapQuestionRows);
        if (gapQErr) {
          throw new Error(`Failed to insert gap placeholders: ${gapQErr.message}`);
        }
      }

      const allPqRows = [...pqRows, ...gapPqRows].sort((a, b) => a.position - b.position);
      const { error: pqErr } = await supabaseDB.from("paper_questions").insert(allPqRows);
      if (pqErr) {
        throw new Error(`Failed to link paper questions: ${pqErr.message}`);
      }

      // If gaps were added, update the paper's total_questions to include them.
      const totalWithGaps = group.length + gapQuestionRows.length;
      if (gapQuestionRows.length > 0) {
        await supabaseDB.from("papers").update({ total_questions: totalWithGaps }).eq("id", paper.id);
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

      createdPapers.push({ id: paper.id, title: sessionTitle, total_questions: totalWithGaps, workflow_status: paper.workflow_status });
    }

    try {
      fs.rmSync(tempWorkingDir, { recursive: true, force: true });
    } catch (cleanupErr: any) {
      console.warn(`[uploadTestController] Cleanup failed: ${cleanupErr.message}`);
    }

    const matchingNote = malformedMatching.length ? `${malformedMatching.length} matching question(s) require attention. ` : "";
    const successMessage = (isSplit
      ? `Split into ${createdPapers.length} papers (${createdPapers.map((p) => p.total_questions).join(", ")} questions). ${matchingNote}Review and publish each from the Test Department workspace.`
      : `Draft created. ${matchingNote}Review and publish it from the Test Department workspace.`
    ) + completenessNote + answerKeyNote;

    sendProgress("success", successMessage, {
      paper_id: createdPapers[0].id,
      papers: createdPapers,
      title,
      total_questions: questionRows.length,
      workflow_status: createdPapers[0].workflow_status,
      completeness: extractionResult?.completeness ?? null,
    });
    logStage("success", `Completed PDF-to-test workflow with ${questionRows.length} questions` + (isSplit ? ` split into ${createdPapers.length} papers.` : "."));
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
