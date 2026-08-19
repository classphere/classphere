import { randomUUID } from "crypto";
import { uploadDataUrlList, uploadOptionFigures } from "../../lib/question-figures";
import { isChoiceQuestion } from "../../lib/question-taxonomy";
import { validatePaperQuestions } from "../../lib/paper-validation";
import { validateMarkingScheme } from "../../lib/marking-scheme";
import { generateGapFillWithAI, fixQuestionWithAI } from "../../lib/question-ai-fix";
import { Request, Response } from "express";
import { sendStaffInviteEmail } from "../../lib/mailer";
import { supabaseAdmin, supabaseDB } from "../../lib/supabase";
import { notifyStudents } from "../notifications/notifications.service";
import { uploadToR2 } from "../../lib/r2";

const TEST_HEAD_ROLE = "test_department_head";
/**
 * Retired by migration 54. No account is created with it any more, but a row
 * the migration could not reach — or one restored from a backup — must not lock
 * its owner out, so it is still recognised and carries a Head's permissions.
 */
const LEGACY_TEST_EDITOR_ROLE = "test_department_member";
/**
 * Peers, not a hierarchy. Three is a guard against an institute turning its
 * whole staff into publishers, not an org chart — see migration 54. The
 * database enforces the same number in `enforce_max_test_heads`; this is the
 * copy that produces a sentence instead of a Postgres exception.
 */
const MAX_TEST_HEADS = 3;
const appBaseDomain = (process.env.APP_BASE_DOMAIN ?? "classphere.com").toLowerCase();
const departmentRoles = new Set([TEST_HEAD_ROLE, LEGACY_TEST_EDITOR_ROLE]);
const allowedQuestionFields = new Set([
  "subject", "chapter", "topic", "difficulty", "year", "source", "question_type",
  "question_text", "question_images", "explanation_images", "options", "correct_answer", "explanation", "tags",
  "source_reference", "content_blocks", "extraction_metadata", "extractor_version", "source_crop_url",
]);
// Metadata-only fields: no correct_answer validation required when only these change
const metadataOnlyFields = new Set(["subject", "chapter", "topic", "difficulty", "tags", "year", "source", "source_reference"]);

function isDepartmentUser(req: Request) {
  return departmentRoles.has(req.user?.role ?? "");
}
/**
 * Everyone who may operate this institute's papers.
 *
 * There is no second tier. A Test Head does the whole job — upload, correct,
 * price, assign, publish, archive — and an Institute Admin can do all of it too,
 * because a coaching with no Test Department is the common case and its owner
 * is the only person who will ever review a paper there.
 */
function canOperatePapers(req: Request) {
  return isDepartmentUser(req) || req.user?.role === "institute_admin";
}
function hasInstitute(req: Request, res: Response): string | null {
  const instituteId = req.user?.institute_id;
  if (!instituteId) {
    res.status(403).json({ success: false, message: "A Test Department account must belong to an active institute." });
    return null;
  }
  return instituteId;
}
function validQuestion(question: any): string | null {
  if (!String(question?.question_text ?? "").trim()) return "Question text is required.";
  const type = question.question_type ?? "mcq_single";
  const options = Array.isArray(question.options) ? question.options : [];
  const answers = Array.isArray(question.correct_answer) ? question.correct_answer : [question.correct_answer].filter(Boolean);
  // Was an inline list containing "mcq_multiple", a value the table has never
  // stored — it holds mcq_multi — so every multiple-correct question skipped
  // this check and could be saved with no options at all. The same list was
  // wrong in tests.controller; this is its twin.
  if (isChoiceQuestion(type) && options.length < 2) return "This question type requires at least two options.";
  if (answers.length === 0) return "A correct answer is required.";
  if (type === "mcq_single" && answers.length !== 1) return "A single-correct question needs exactly one correct answer.";
  return null;
}
async function getOwnedPaper(paperId: string, instituteId: string, opts: { includeInactive?: boolean } = {}) {
  let query = supabaseDB
    .from("papers")
    .select("*")
    .eq("id", paperId)
    .eq("institute_id", instituteId);
  // An archived paper is is_active: false — restoring one has to find it
  // first, so the transition endpoint always looks with includeInactive.
  // Every other caller (editing, question mutation) keeps the filter: those
  // actions have no business touching an archived paper regardless of what
  // workflow_status claims.
  if (!opts.includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}
async function audit(input: {
  instituteId: string; paperId?: string; questionId?: string; actorId: string; action: string;
  reason?: string | null; before?: unknown; after?: unknown;
}) {
  await supabaseDB.from("test_review_events").insert({
    institute_id: input.instituteId, paper_id: input.paperId ?? null, question_id: input.questionId ?? null,
    actor_id: input.actorId, action: input.action, reason: input.reason ?? null,
    before_state: input.before ?? null, after_state: input.after ?? null,
  });
}

export async function listDepartmentMembers(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const { data, error } = await supabaseDB.from("test_department_members")
      .select("user_id, title, access_level, is_active, created_at, users!test_department_members_user_id_fkey!inner(id, name, email, role)")
      .eq("institute_id", instituteId).eq("is_active", true)
      .order("access_level", { ascending: true }).order("created_at", { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: { members: data ?? [] } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

export async function createDepartmentMember(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const { name, email, title, password: customPassword } = req.body ?? {};
    // Appointing assessment staff is the Institute Admin's decision. A Test
    // Head runs the papers; they do not staff the department, which is what
    // stops the retired two-tier structure growing back from the inside.
    if (req.user?.role !== "institute_admin") {
      res.status(403).json({ success: false, message: "Only the Institute Admin can appoint a Test Head." }); return;
    }
    if (!name || !email) {
      res.status(400).json({ success: false, message: "Name and email are required." }); return;
    }
    if (!process.env.RESEND_API_KEY?.trim()) {
      res.status(503).json({ success: false, message: "Staff email delivery is not configured. Configure RESEND_API_KEY before creating the account." }); return;
    }
    // The database enforces this too (migration 54's enforce_max_test_heads).
    // Checking here as well is what turns a raised exception into a sentence
    // that says which limit was hit and what to do about it.
    const { count: activeHeads, error: headCountError } = await supabaseDB
      .from("test_department_members")
      .select("user_id", { count: "exact", head: true })
      .eq("institute_id", instituteId).eq("is_active", true).eq("access_level", "head");
    if (headCountError) throw headCountError;
    if ((activeHeads ?? 0) >= MAX_TEST_HEADS) {
      res.status(409).json({
        success: false,
        message: `This institute already has ${MAX_TEST_HEADS} Test Heads, which is the maximum. Remove one before adding another.`,
      }); return;
    }
    const role = TEST_HEAD_ROLE;
    const normalizedEmail = String(email).trim().toLowerCase();
    const { data: existing } = await supabaseDB.from("users").select("id").eq("email", normalizedEmail).maybeSingle();
    if (existing) { res.status(409).json({ success: false, message: "An account with this email already exists." }); return; }
    const tempPassword = (typeof customPassword === "string" && customPassword.trim().length >= 8)
      ? customPassword.trim()
      : `Test#${randomUUID().replace(/-/g, "").slice(0, 10)}`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail, password: tempPassword, email_confirm: true,
      user_metadata: { name: String(name).trim(), role }, app_metadata: { role },
    });
    if (authError || !authData?.user) throw new Error(authError?.message ?? "Could not create the staff account.");
    const userId = authData.user.id;
    const { error: userError } = await supabaseDB.from("users").insert({ id: userId, name: String(name).trim(), email: normalizedEmail, role, institute_id: instituteId });
    if (userError) { await supabaseAdmin.auth.admin.deleteUser(userId); throw userError; }
    const { error: memberError } = await supabaseDB.from("test_department_members").insert({ user_id: userId, institute_id: instituteId, title: title?.trim() || null, access_level: "head", created_by: req.user!.id });
    if (memberError) { await supabaseDB.from("users").delete().eq("id", userId); await supabaseAdmin.auth.admin.deleteUser(userId); throw memberError; }
    const { data: institute } = await supabaseDB.from("institutes").select("name, subdomain_slug").eq("id", instituteId).maybeSingle();
    try {
      const loginUrl = institute?.subdomain_slug
        ? `https://${institute.subdomain_slug}.${appBaseDomain}/login`
        : undefined;
      await sendStaffInviteEmail({ to: normalizedEmail, name: String(name).trim(), instituteName: institute?.name ?? "Your Institute", tempPassword, roleLabel: "Test Head", loginUrl });
    } catch (mailError: any) {
      // Never leave a sign-in account behind when the sole credential delivery
      // mechanism failed. The password is intentionally never returned or logged.
      await supabaseDB.from("test_department_members").delete().eq("user_id", userId);
      await supabaseDB.from("users").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Could not deliver the staff sign-in email: ${mailError.message}`);
    }
    await audit({ instituteId, actorId: req.user!.id, action: "member_created", after: { user_id: userId, role, title: title?.trim() || null } });
    res.status(201).json({ success: true, data: { member: { id: userId, name, email: normalizedEmail, role, title: title?.trim() || null } } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

/** Deactivate a team account without deleting its review trail or paper history. */
export async function deactivateDepartmentMember(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const memberId = req.params.userId;
    const { data: member, error } = await supabaseDB.from("test_department_members")
      .select("user_id, access_level, users!test_department_members_user_id_fkey!inner(role)")
      .eq("user_id", memberId).eq("institute_id", instituteId).maybeSingle();
    if (error) throw error;
    if (!member) { res.status(404).json({ success: false, message: "Test Department member not found." }); return; }
    // Removing assessment staff is the mirror of appointing them, so it belongs
    // to the same person. Test Heads are peers: letting one remove another would
    // be a hierarchy between them, and there isn't one.
    if (req.user?.role !== "institute_admin") {
      res.status(403).json({ success: false, message: "Only the Institute Admin can remove a Test Head." }); return;
    }
    const level = (member as any).access_level ?? "head";
    const { error: deactivateError } = await supabaseDB.from("test_department_members")
      .update({ is_active: false, updated_at: new Date().toISOString() }).eq("user_id", memberId);
    if (deactivateError) throw deactivateError;
    await supabaseDB.from("users").update({ active_session_token: null }).eq("id", memberId);
    await supabaseAdmin.auth.admin.updateUserById(memberId, { ban_duration: "876000h" });
    await audit({ instituteId, actorId: req.user!.id, action: "member_deactivated", after: { user_id: memberId, access_level: level } });
    res.json({ success: true, message: "Test Department account removed and access disabled." });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

export async function listReviewPapers(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const status = typeof req.query.status === "string" ? req.query.status : null;
    // exams(code, full_name) added so the card list can show which exam a
    // paper is for without a second round trip per card.
    let query = supabaseDB.from("papers").select("id, title, test_type, total_questions, total_marks, duration_min, workflow_status, review_version, created_at, submitted_at, available_from, available_until, created_by, users!papers_created_by_fkey(name, email), exams(code, full_name)")
      .eq("institute_id", instituteId).order("created_at", { ascending: false });
    // Archiving sets is_active: false, so the default working list (no status,
    // or any status other than archived) excludes it via is_active alone.
    // Asking for status=archived specifically has to drop that filter, or
    // every archived paper would just be an empty result forever.
    if (status === "archived") {
      query = query.eq("workflow_status", "archived");
    } else {
      query = query.eq("is_active", true);
      if (status) query = query.eq("workflow_status", status);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: { papers: data ?? [] } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

export async function getReviewPaper(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    // Join the exams table to get the resolved exam code (e.g. "jee-main", "neet-ug")
    // No is_active filter: an archived paper (is_active: false) still has to
    // be viewable here, both to confirm what's being restored and because
    // it's the only screen that carries the Restore action.
    const { data: paper, error: paperErr } = await supabaseDB
      .from("papers")
      .select("*, exam_code:exams(code)")
      .eq("id", req.params.id)
      .eq("institute_id", instituteId)
      .maybeSingle();
    if (paperErr) throw paperErr;
    if (!paper) { res.status(404).json({ success: false, message: "Draft paper not found." }); return; }
    const { data: rows, error } = await supabaseDB.from("paper_questions")
      .select("position, questions(*)").eq("paper_id", paper.id).order("position", { ascending: true });
    if (error) throw error;
    const { data: events } = await supabaseDB.from("test_review_events").select("id, question_id, action, reason, actor_id, created_at, users(name)")
      .eq("paper_id", paper.id).order("created_at", { ascending: false }).limit(100);
    // question_number falls back to the paper position. It is the number the
    // paper printed, and extraction leaves it null whenever it could not read
    // one — which showed the reviewer a grid of "?" with no way to tell which
    // question was which. Position is the order the paper holds them in, so it
    // is the right answer when the printed number is missing. The /tests path
    // has always done this; the review screen was the one that did not.
    const questions = (rows ?? []).map((row: any, index: number) => {
      const question = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      return {
        position: row.position,
        ...question,
        question_number: question?.question_number ?? row.position ?? index + 1,
      };
    });
    res.json({ success: true, data: { paper, questions, events: events ?? [] } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

/**
 * Generate a stand-in draft for a gap placeholder — a question number the
 * extractor found anchored in the PDF but returned no content for. Text-only
 * (DeepSeek): it never saw the source page, so what comes back is a plausible
 * question in the same subject/chapter/style as its neighbors on this paper,
 * not a recovery of the real one. Kept flagged unverified rather than clearing
 * review status, and refused outright on PYQ papers, where a fabricated
 * question would misrepresent what was actually asked in a real past exam.
 */
export async function aiFillGapQuestion(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const paper = await getOwnedPaper(req.params.paperId, instituteId);
    if (!paper) { res.status(404).json({ success: false, message: "Draft paper not found." }); return; }
    if (!["draft", "changes_requested", "needs_review"].includes(paper.workflow_status)) {
      res.status(409).json({ success: false, message: "Published or approved papers are immutable. Create a revision instead." }); return;
    }
    if (["pyq", "pyq-paper"].includes(String(paper.test_type ?? "").toLowerCase())) {
      res.status(400).json({
        success: false,
        message: "AI gap-fill is disabled for previous-year-question papers — a generated question would misrepresent what was actually asked in the real exam. Open the source PDF and type it in.",
      });
      return;
    }

    const { data: link } = await supabaseDB.from("paper_questions").select("position").eq("paper_id", paper.id).eq("question_id", req.params.questionId).maybeSingle();
    if (!link) { res.status(404).json({ success: false, message: "Question is not part of this paper." }); return; }
    const { data: current, error: currentError } = await supabaseDB.from("questions").select("*").eq("id", req.params.questionId).eq("institute_id", instituteId).eq("content_scope", "institute_private").maybeSingle();
    if (currentError) throw currentError;
    if (!current) { res.status(403).json({ success: false, message: "Only institute-owned draft questions can be edited here." }); return; }

    const existingFlags: string[] = Array.isArray(current.source_reference?.extraction_flags) ? current.source_reference.extraction_flags : [];
    if (!existingFlags.includes("gap_placeholder")) {
      res.status(400).json({ success: false, message: "AI gap-fill only works on detected gap placeholders, not ordinary questions." });
      return;
    }

    const { data: examRow } = await supabaseDB.from("exams").select("code").eq("id", paper.exam_id).maybeSingle();

    // A few real questions from the same paper, close to this position, so
    // the model has a subject/chapter/style/difficulty to match rather than
    // generating in a vacuum.
    const { data: nearby } = await supabaseDB
      .from("paper_questions")
      .select("position, questions(question_text, question_type, is_active)")
      .eq("paper_id", paper.id)
      .gte("position", Math.max(1, (link.position ?? 1) - 3))
      .lte("position", (link.position ?? 1) + 3)
      .order("position", { ascending: true });

    const neighbors = (nearby ?? [])
      .map((row: any) => {
        const q = Array.isArray(row.questions) ? row.questions[0] : row.questions;
        return q && q.is_active !== false && String(q.question_text ?? "").trim()
          ? { question_number: row.position as number, question_text: String(q.question_text), question_type: q.question_type ?? null }
          : null;
      })
      .filter((entry): entry is { question_number: number; question_text: string; question_type: string | null } => entry !== null)
      .slice(0, 4);

    const result = await generateGapFillWithAI({
      examCode: examRow?.code ?? "",
      subject: current.subject,
      chapter: current.chapter,
      topic: current.topic,
      difficulty: current.difficulty,
      questionNumber: link.position ?? null,
      neighbors,
    });
    if (!result) {
      res.status(502).json({ success: false, message: "AI gap-fill did not return a usable draft. Try again, or type the question in manually." });
      return;
    }

    const updates: Record<string, unknown> = {
      question_text: result.question_text,
      question_type: result.question_type,
      options: result.options,
      correct_answer: result.correct_answer,
      content_version: current.content_version + 1,
      review_status: "draft",
      updated_at: new Date().toISOString(),
      source_reference: {
        ...(current.source_reference ?? {}),
        extraction_flags: [...new Set([...existingFlags, "ai_generated_unverified"])],
      },
      extraction_metadata: {
        ...(current.extraction_metadata ?? {}),
        needs_review: true,
        review_reasons: [
          ...(Array.isArray(current.extraction_metadata?.review_reasons) ? current.extraction_metadata.review_reasons : []),
          result.note,
        ],
      },
    };
    const { data: updated, error } = await supabaseDB.from("questions").update(updates).eq("id", current.id).eq("content_version", current.content_version).select().maybeSingle();
    if (error) throw error;
    if (!updated) { res.status(409).json({ success: false, message: "Question was updated by another reviewer." }); return; }

    await supabaseDB.from("papers").update({ workflow_status: "draft", review_version: paper.review_version + 1 }).eq("id", paper.id);
    await audit({ instituteId, paperId: paper.id, questionId: current.id, actorId: req.user!.id, action: "question_ai_gap_filled", before: current, after: updated });

    res.json({ success: true, data: { question: updated, note: result.note } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

/**
 * Repairs an already-saved question against one specific validation error —
 * the "Fix with AI" action next to an issue in the validation panel, as
 * opposed to aiFillGapQuestion above (which drafts a whole question for an
 * empty slot). This is where "matching" and "assertion_reason" questions
 * actually get help: their most common failures are a mismatched answer key
 * or malformed options, both of which fixQuestionWithAI can now touch — see
 * its own doc comment for why that's safe here.
 *
 * Whatever it changes is force-flagged unverified (blocking publish per
 * paper-validation.ts) until a reviewer saves the question through the
 * normal editor, which is the human check this is standing in for.
 */
export async function aiFixQuestionError(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const paper = await getOwnedPaper(req.params.paperId, instituteId);
    if (!paper) { res.status(404).json({ success: false, message: "Draft paper not found." }); return; }
    if (!["draft", "changes_requested", "needs_review"].includes(paper.workflow_status)) {
      res.status(409).json({ success: false, message: "Published or approved papers are immutable. Create a revision instead." }); return;
    }

    const errorMessage = String(req.body?.error ?? "").trim();
    if (!errorMessage) { res.status(400).json({ success: false, message: "error is required." }); return; }

    const { data: link } = await supabaseDB.from("paper_questions").select("position").eq("paper_id", paper.id).eq("question_id", req.params.questionId).maybeSingle();
    if (!link) { res.status(404).json({ success: false, message: "Question is not part of this paper." }); return; }
    const { data: current, error: currentError } = await supabaseDB.from("questions").select("*").eq("id", req.params.questionId).eq("institute_id", instituteId).eq("content_scope", "institute_private").maybeSingle();
    if (currentError) throw currentError;
    if (!current) { res.status(403).json({ success: false, message: "Only institute-owned draft questions can be edited here." }); return; }

    // Whatever crop of the source page this question already has, if any —
    // lets the model check a table/diagram-shaped question against how it
    // actually looked in print instead of guessing from the JSON alone.
    const imageUrl = current.source_crop_url || (Array.isArray(current.question_images) ? current.question_images[0] : null) || null;
    const result = await fixQuestionWithAI(current, errorMessage, imageUrl);
    if (!result) { res.status(502).json({ success: false, message: "AI could not fix this — try again, or edit the question manually." }); return; }

    // Whitelisted here, not inside fixQuestionWithAI: this is the one caller
    // that trusts options/correct_answer from the model, because it forces
    // the unverified flag below rather than trusting the result outright.
    const updates: Record<string, unknown> = {};
    if (typeof result.fixed.question_text === "string") updates.question_text = result.fixed.question_text;
    if (result.fixed.marks !== undefined) updates.marks = result.fixed.marks;
    if (Array.isArray(result.fixed.options)) updates.options = result.fixed.options;
    if (Array.isArray(result.fixed.correct_answer)) updates.correct_answer = result.fixed.correct_answer;
    if (typeof result.fixed.question_type === "string") updates.question_type = result.fixed.question_type;
    if (Object.keys(updates).length === 0) {
      // The model followed its own instructions and declined rather than
      // invent unverifiable content — an honest outcome, not a failure, so
      // it gets its own message instead of the generic "no usable fix" one.
      const message = result.fixed.is_gap === true
        ? (imageUrl
          ? "AI checked the source image and still couldn't determine what this should say — it may need a closer manual read of the source PDF."
          : "AI couldn't determine this from the question's text alone and this question has no saved source image to check against — fix it manually, or attach the source page.")
        : "AI did not return a usable fix for this error.";
      res.status(502).json({ success: false, message });
      return;
    }
    // A fixed option or answer key invalidates any block projection derived
    // from the old ones.
    if (updates.options !== undefined || updates.correct_answer !== undefined) updates.content_blocks = null;

    const existingFlags: string[] = Array.isArray(current.source_reference?.extraction_flags) ? current.source_reference.extraction_flags : [];
    Object.assign(updates, {
      content_version: current.content_version + 1,
      review_status: "draft",
      updated_at: new Date().toISOString(),
      source_reference: {
        ...(current.source_reference ?? {}),
        extraction_flags: [...new Set([...existingFlags, "ai_generated_unverified"])],
      },
      extraction_metadata: {
        ...(current.extraction_metadata ?? {}),
        needs_review: true,
        review_reasons: [
          ...(Array.isArray(current.extraction_metadata?.review_reasons) ? current.extraction_metadata.review_reasons : []),
          result.note,
        ],
      },
    });

    const { data: updated, error } = await supabaseDB.from("questions").update(updates).eq("id", current.id).eq("content_version", current.content_version).select().maybeSingle();
    if (error) throw error;
    if (!updated) { res.status(409).json({ success: false, message: "Question was updated by another reviewer." }); return; }

    await supabaseDB.from("papers").update({ workflow_status: "draft", review_version: paper.review_version + 1 }).eq("id", paper.id);
    await audit({ instituteId, paperId: paper.id, questionId: current.id, actorId: req.user!.id, action: "question_ai_fixed", reason: errorMessage, before: current, after: updated });

    res.json({ success: true, data: { question: updated, note: result.note } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

export async function updateReviewQuestion(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const paper = await getOwnedPaper(req.params.paperId, instituteId);
    if (!paper) { res.status(404).json({ success: false, message: "Draft paper not found." }); return; }
    if (!["draft", "changes_requested", "needs_review"].includes(paper.workflow_status)) {
      res.status(409).json({ success: false, message: "Published or approved papers are immutable. Create a revision instead." }); return;
    }
    const { data: link } = await supabaseDB.from("paper_questions").select("question_id").eq("paper_id", paper.id).eq("question_id", req.params.questionId).maybeSingle();
    if (!link) { res.status(404).json({ success: false, message: "Question is not part of this paper." }); return; }
    const { data: current, error: currentError } = await supabaseDB.from("questions").select("*").eq("id", req.params.questionId).eq("institute_id", instituteId).eq("content_scope", "institute_private").maybeSingle();
    if (currentError) throw currentError;
    if (!current) { res.status(403).json({ success: false, message: "Only institute-owned draft questions can be edited here." }); return; }
    if (req.body.content_version !== undefined && Number(req.body.content_version) !== current.content_version) {
      res.status(409).json({ success: false, message: "This question changed elsewhere. Reload before saving." }); return;
    }
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(req.body ?? {})) if (allowedQuestionFields.has(key)) updates[key] = value;
    // Never leave an extracted block projection stale after a legacy-only edit.
    if ((req.body.question_text !== undefined || req.body.question_images !== undefined) && req.body.content_blocks === undefined) {
      updates.content_blocks = null;
    }
    // A replaced figure arrives as a data URL from the reviewer's browser and
    // belongs in object storage, not inside the row.
    for (const field of ["question_images", "explanation_images"] as const) {
      if (updates[field] !== undefined) updates[field] = await uploadDataUrlList(updates[field]);
    }
    if (updates.options !== undefined) updates.options = await uploadOptionFigures(updates.options);
    if (Object.keys(updates).length === 0) { res.status(400).json({ success: false, message: "No editable question fields supplied." }); return; }
    // A manual save through this endpoint is the human check an AI-touched
    // question needs — see the blocking "ai_unverified" issue in
    // paper-validation.ts. Clear it here so the question that has now
    // actually been reviewed can publish; a reviewer who wants a second look
    // still has the original values in this question's history/audit log.
    const currentFlags: string[] = Array.isArray(current.source_reference?.extraction_flags) ? current.source_reference.extraction_flags : [];
    if (currentFlags.includes("ai_generated_unverified")) {
      updates.source_reference = {
        ...(current.source_reference ?? {}),
        extraction_flags: currentFlags.filter((flag: string) => flag !== "ai_generated_unverified"),
      };
    }
    // No per-save content validation — "Validate paper" button handles structural checks.
    // validQuestion only runs at publish time (see transitionReviewPaper → publish).
    updates.content_version = current.content_version + 1;
    updates.review_status = "draft";
    updates.updated_at = new Date().toISOString();
    const { data: updated, error } = await supabaseDB.from("questions").update(updates).eq("id", current.id).eq("content_version", current.content_version).select().maybeSingle();
    if (error) throw error;
    if (!updated) { res.status(409).json({ success: false, message: "Question was updated by another reviewer." }); return; }
    await supabaseDB.from("papers").update({ workflow_status: "draft", review_version: paper.review_version + 1 }).eq("id", paper.id);
    await audit({ instituteId, paperId: paper.id, questionId: current.id, actorId: req.user!.id, action: "question_updated", reason: req.body.reason ?? null, before: current, after: updated });
    res.json({ success: true, data: { question: updated } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

/**
 * Remove a question from a draft paper.
 *
 * Extraction can invent a question. `_gap_placeholders` in the page extractor
 * creates an empty slot for every question-number anchor the PDF text advertises
 * but the model did not return — which is right when the model genuinely missed
 * one, and wrong when the anchor was never a question at all. A stray "76." in a
 * formula sheet or an instruction list produces a blank question that a reviewer
 * cannot fill in, because there is nothing on the page to fill it with.
 *
 * Until now the only editable surface was the question's fields, so a paper that
 * came back with four phantom questions had no way back to the right count.
 *
 * The question row is deactivated rather than deleted, and its paper_questions
 * link is removed. Positions of the remaining questions are deliberately left
 * alone: they carry the number printed on the paper (migration 48), so closing
 * the gap would renumber real questions to hide a removed one.
 */
export async function deleteReviewQuestion(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const paper = await getOwnedPaper(req.params.paperId, instituteId);
    if (!paper) { res.status(404).json({ success: false, message: "Draft paper not found." }); return; }
    if (!["draft", "changes_requested", "needs_review"].includes(paper.workflow_status)) {
      res.status(409).json({ success: false, message: "Published or approved papers are immutable. Create a revision instead." }); return;
    }

    const { data: link } = await supabaseDB.from("paper_questions")
      .select("question_id, position").eq("paper_id", paper.id).eq("question_id", req.params.questionId).maybeSingle();
    if (!link) { res.status(404).json({ success: false, message: "Question is not part of this paper." }); return; }

    // Only the institute's own draft questions. A question in the global bank is
    // shared by other papers and must never be removed through a paper review.
    const { data: current, error: currentError } = await supabaseDB.from("questions")
      .select("*").eq("id", req.params.questionId).eq("institute_id", instituteId)
      .eq("content_scope", "institute_private").maybeSingle();
    if (currentError) throw currentError;
    if (!current) { res.status(403).json({ success: false, message: "Only institute-owned draft questions can be removed here." }); return; }

    const { error: unlinkError } = await supabaseDB.from("paper_questions")
      .delete().eq("paper_id", paper.id).eq("question_id", current.id);
    if (unlinkError) throw unlinkError;

    const { error: deactivateError } = await supabaseDB.from("questions")
      .update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", current.id);
    if (deactivateError) throw deactivateError;

    // total_questions is shown on the review screen and on the paper list, so it
    // has to follow the removal or the paper keeps claiming a count it no longer has.
    const { count } = await supabaseDB.from("paper_questions")
      .select("question_id", { count: "exact", head: true }).eq("paper_id", paper.id);
    await supabaseDB.from("papers")
      .update({ total_questions: count ?? 0, review_version: paper.review_version + 1, workflow_status: "draft" })
      .eq("id", paper.id);

    await audit({
      instituteId, paperId: paper.id, questionId: current.id, actorId: req.user!.id,
      action: "question_removed", reason: typeof req.body?.reason === "string" ? req.body.reason : null,
      before: current, after: null,
    });

    res.json({ success: true, data: { removed: current.id, total_questions: count ?? 0 } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

export async function transitionReviewPaper(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    // includeInactive: restore's only valid source state is "archived", which
    // is always is_active: false — the default filter would never find it.
    const paper = await getOwnedPaper(req.params.id, instituteId, { includeInactive: true });
    if (!paper) { res.status(404).json({ success: false, message: "Draft paper not found." }); return; }
    const action = req.body?.action;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : null;
    /**
     * A paper's life is draft → published → archived.
     *
     * `submit`, `request_changes` and `approve` are the retired two-person
     * review: an Editor handed a paper to a Head, who approved it before it
     * could be published. With one role that sequence is the same person
     * clicking three buttons to do one thing, so no screen offers them any
     * more — but the actions stay accepted, and `publish` stays reachable from
     * the states they produced, so a paper already sitting in needs_review or
     * approved when migration 54 ran is not stranded there.
     */
    const transitions: Record<string, string[]> = {
      publish: ["draft", "needs_review", "changes_requested", "approved", "scheduled"],
      archive: ["draft", "needs_review", "changes_requested", "approved", "scheduled", "published"],
      // Always back to draft, never straight to whatever it was before: a
      // restored paper should go through a conscious re-publish rather than
      // silently going live again the instant it's un-archived.
      restore: ["archived"],
      submit: ["draft", "changes_requested"],
      request_changes: ["needs_review", "approved"],
      approve: ["needs_review"],
    };
    if (!transitions[action]?.includes(paper.workflow_status)) { res.status(409).json({ success: false, message: "This workflow action is not available for the current paper status." }); return; }
    // One capability set. A Test Head does the whole job and an Institute Admin
    // can do all of it too, because a coaching with no Test Department is the
    // common case and its owner is the only person who will ever review a paper.
    if (!canOperatePapers(req)) { res.status(403).json({ success: false, message: "Access denied." }); return; }
    let workflow_status: string = paper.workflow_status;
    const updates: Record<string, unknown> = { review_version: paper.review_version + 1 };
    if (action === "submit") { workflow_status = "needs_review"; updates.submitted_at = new Date().toISOString(); updates.submitted_by = req.user!.id; }
    if (action === "request_changes") workflow_status = "changes_requested";
    if (action === "approve") { workflow_status = "approved"; updates.approved_at = new Date().toISOString(); updates.approved_by = req.user!.id; }
    if (action === "archive") { workflow_status = "archived"; updates.is_active = false; updates.is_published = false; }
    if (action === "restore") { workflow_status = "draft"; updates.is_active = true; }
    if (action === "publish") {
      // Nothing about what a paper is worth is guessed any more, which means
      // nothing fills these in if the Test Head has not. A paper published
      // without them would run on a fallback duration and score against a
      // marking scheme nobody chose — the exact silent wrongness this whole
      // change exists to remove — so publication is where it has to be caught.
      const missingDetails: string[] = [];
      if (!Number.isFinite(Number(paper.duration_min)) || Number(paper.duration_min) <= 0) {
        missingDetails.push("how long it runs");
      }
      if (paper.total_marks === null || paper.total_marks === undefined) {
        missingDetails.push("what it is worth in total");
      }
      if (!paper.marking_scheme || Object.keys(paper.marking_scheme).length === 0) {
        missingDetails.push("the marks for a correct answer and the penalty for a wrong one");
      }
      if (missingDetails.length) {
        res.status(400).json({
          success: false,
          message: `Cannot publish: this test does not yet say ${missingDetails.join(", ")}. Open Test details on this screen and set them.`,
          missing: missingDetails,
        });
        return;
      }

      const { data: rows, error } = await supabaseDB.from("paper_questions").select("questions(id, question_text, question_type, options, correct_answer)").eq("paper_id", paper.id);
      if (error) throw error;
      const invalid = (rows ?? []).map((row: any) => Array.isArray(row.questions) ? row.questions[0] : row.questions).map(validQuestion).find(Boolean);
      if (invalid) { res.status(400).json({ success: false, message: `Cannot publish: ${invalid}` }); return; }
      workflow_status = "published"; updates.is_published = true; updates.published_at = new Date().toISOString(); updates.published_by = req.user!.id;
      await supabaseDB.from("questions").update({ review_status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: req.user!.id }).eq("institute_id", instituteId).in("id", (rows ?? []).map((row: any) => (Array.isArray(row.questions) ? row.questions[0] : row.questions)?.id).filter(Boolean));
    }
    updates.workflow_status = workflow_status;
    const { data: updated, error } = await supabaseDB.from("papers").update(updates).eq("id", paper.id).select().single();
    if (error) throw error;
    if (action === "publish") {
      const { data: assignments, error: assignmentError } = await supabaseDB.from("test_batch_assignments")
        .select("batch_id").eq("test_id", paper.id);
      if (assignmentError) throw assignmentError;
      const batchIds = [...new Set((assignments ?? []).map((assignment: any) => assignment.batch_id))];
      if (batchIds.length) {
        const { data: students, error: studentError } = await supabaseDB.from("batch_students")
          .select("student_id").in("batch_id", batchIds);
        if (studentError) throw studentError;
        const opensAt = paper.available_from ? new Date(paper.available_from).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;
        try {
          await notifyStudents({
            instituteId,
            userIds: (students ?? []).map((student: any) => student.student_id),
            type: "test_published",
            title: "New test published",
            body: `${paper.title}${opensAt ? ` · Opens ${opensAt}` : ""}`,
            href: `/student/tests`,
            eventKey: `test_published:${paper.id}`,
            metadata: { paper_id: paper.id, available_from: paper.available_from ?? null },
          });
        } catch (notificationError: any) {
          console.error("[test-department] notification delivery failed:", notificationError.message);
        }
      }
    }
    await audit({ instituteId, paperId: paper.id, actorId: req.user!.id, action: `paper_${action}`, reason, before: { workflow_status: paper.workflow_status }, after: { workflow_status } });
    res.json({ success: true, data: { paper: updated } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

/**
 * POST /api/v1/test-department/papers/:id/assign
 *
 * Batch assignment used to only ever happen once, baked into paper creation
 * (uploadTestController, createTest) -- there was no way to take an
 * existing paper and hand it to a different batch, or reuse it for the same
 * batch again next term, without re-uploading or rebuilding it from
 * scratch. This is that missing action: assign (or reschedule) any of the
 * institute's own papers to one or more batches, independent of when or how
 * the paper was originally created.
 *
 * Upserts rather than inserts: test_batch_assignments is keyed on
 * (test_id, batch_id), so assigning a paper to a batch it already reaches
 * just moves the scheduled time rather than erroring or duplicating.
 */
export async function assignPaperToBatches(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const paper = await getOwnedPaper(req.params.id, instituteId);
    if (!paper) { res.status(404).json({ success: false, message: "Draft paper not found." }); return; }
    if (!canOperatePapers(req)) {
      res.status(403).json({ success: false, message: "Access denied." }); return;
    }

    const rawBatchIds: unknown[] = Array.isArray(req.body?.batch_ids) ? req.body.batch_ids : [];
    const batchIds: string[] = [
      ...new Set(rawBatchIds.map((id) => String(id).trim()).filter((id): id is string => id.length > 0)),
    ];
    const scheduledAtRaw = req.body?.scheduled_at;

    if (!batchIds.length) { res.status(400).json({ success: false, message: "Select at least one batch." }); return; }
    if (!scheduledAtRaw || Number.isNaN(new Date(scheduledAtRaw).getTime())) {
      res.status(400).json({ success: false, message: "scheduled_at must be a valid date-time." }); return;
    }
    const scheduledAt = new Date(scheduledAtRaw).toISOString();

    const { count: matchingBatchesCount, error: countErr } = await supabaseDB
      .from("batches")
      .select("id", { count: "exact", head: true })
      .in("id", batchIds)
      .eq("institute_id", instituteId);
    if (countErr) throw countErr;
    if (matchingBatchesCount !== batchIds.length) {
      res.status(403).json({ success: false, message: "One or more batches do not belong to your institute." }); return;
    }

    const rows = batchIds.map((batch_id) => ({ test_id: paper.id, batch_id, scheduled_at: scheduledAt }));
    const { error: upsertError } = await supabaseDB
      .from("test_batch_assignments")
      .upsert(rows, { onConflict: "test_id,batch_id" });
    if (upsertError) throw upsertError;

    // A still-draft paper's newly-assigned batches get notified when it is
    // eventually published (transitionReviewPaper's publish action already
    // reads every assignment row at that point). An already-published paper
    // is live right now, so a batch added to it needs telling immediately —
    // otherwise those students would never hear the test exists.
    if (paper.is_published) {
      const { data: students, error: studentError } = await supabaseDB.from("batch_students")
        .select("student_id").in("batch_id", batchIds);
      if (studentError) throw studentError;
      const opensAt = new Date(scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
      try {
        await notifyStudents({
          instituteId,
          userIds: (students ?? []).map((student: any) => student.student_id),
          type: "test_published",
          title: "New test assigned",
          body: `${paper.title} · Opens ${opensAt}`,
          href: `/student/tests`,
          eventKey: `test_assigned:${paper.id}:${scheduledAt}`,
          metadata: { paper_id: paper.id, available_from: scheduledAt },
        });
      } catch (notificationError: any) {
        console.error("[assignPaperToBatches] notification delivery failed:", notificationError.message);
      }
    }

    await audit({
      instituteId, paperId: paper.id, actorId: req.user!.id, action: "paper_assigned",
      reason: null, before: null, after: { batch_ids: batchIds, scheduled_at: scheduledAt },
    });

    res.json({ success: true, data: { paper_id: paper.id, batch_ids: batchIds, scheduled_at: scheduledAt } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

/** Longest a sitting can reasonably be. JEE Advanced runs two 3-hour papers. */
const MAX_DURATION_MIN = 600;

/**
 * An optional timestamp field: a date-time, or null to clear it.
 *
 * Returned rather than thrown so the caller can name the field in the message —
 * "available_until must be a valid date-time" is actionable, "invalid input" is
 * not.
 */
function readTimestamp(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (value === null || value === "") return { ok: true, value: null };
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return { ok: false };
  return { ok: true, value: parsed.toISOString() };
}

/**
 * PATCH /api/v1/test-department/papers/:id
 *
 * Everything about the paper that is not a question: what it is worth, how long
 * it runs, when it opens and closes, and when its results appear.
 *
 * All of it typed by the Test Head, and none of it derived. That is the point.
 * Upload used to record 360 marks for every PDF regardless of how many questions
 * came out of it, and saving a marking scheme here used to recompute total_marks
 * from that scheme — so a paper's stated total was always some arithmetic nobody
 * had asked for. An 80-question paper is worth whatever the institute says it is
 * worth; if that disagrees with marks-per-question × question-count, the review
 * screen shows both numbers and lets the person holding the paper decide.
 *
 * Duration was not editable here at all: it could only be set at upload, before
 * anyone had seen how many questions the extractor actually found.
 *
 * The Superadmin equivalent is PATCH /tests/:id/global, which only touches
 * papers in the global bank.
 */
export async function updateReviewPaper(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const paper = await getOwnedPaper(req.params.id, instituteId);
    if (!paper) { res.status(404).json({ success: false, message: "Draft paper not found." }); return; }
    if (paper.is_published) {
      res.status(409).json({ success: false, message: "A published paper is immutable. Create a revision instead." }); return;
    }

    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) { res.status(400).json({ success: false, message: "A test needs a title." }); return; }
      updates.title = title;
    }

    // null and "" clear the field rather than being coerced. Number(null) is 0,
    // so without this branch emptying the box would silently record a zero-minute
    // test rather than an unset one.
    if (body.duration_min !== undefined) {
      if (body.duration_min === null || body.duration_min === "") {
        updates.duration_min = null;
      } else {
        const duration = Number(body.duration_min);
        if (!Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_MIN) {
          res.status(400).json({ success: false, message: `Duration must be a whole number of minutes between 1 and ${MAX_DURATION_MIN}.` }); return;
        }
        updates.duration_min = duration;
      }
    }

    // Never recomputed from the marking scheme, and never overwritten by one.
    if (body.total_marks !== undefined) {
      if (body.total_marks === null || body.total_marks === "") {
        updates.total_marks = null;
      } else {
        const totalMarks = Number(body.total_marks);
        if (!Number.isFinite(totalMarks) || totalMarks < 0) {
          res.status(400).json({ success: false, message: "Total marks must be a number of 0 or more." }); return;
        }
        updates.total_marks = totalMarks;
      }
    }

    if (body.marking_scheme !== undefined) {
      const schemeErrors = validateMarkingScheme(body.marking_scheme);
      if (schemeErrors.length > 0) {
        res.status(400).json({ success: false, message: "Invalid marking_scheme.", errors: schemeErrors }); return;
      }
      updates.marking_scheme = body.marking_scheme;
    }

    for (const field of ["available_from", "available_until", "result_release_at"] as const) {
      if (body[field] === undefined) continue;
      const parsed = readTimestamp(body[field]);
      if (!parsed.ok) {
        res.status(400).json({ success: false, message: `${field} must be a valid date-time, or empty to clear it.` }); return;
      }
      updates[field] = parsed.value;
    }

    // Checked against the merged result, not the request alone: moving only the
    // opening time still has to land before whatever closing time is already
    // stored. papers_release_window_check enforces this in the database too, but
    // reaching it would surface as a 500 rather than a sentence.
    //
    // `in` rather than ??, because a field being cleared is present in `updates`
    // with the value null — which ?? would read as "not supplied" and replace
    // with the stored value, checking the window that was just removed.
    const mergedFrom = ("available_from" in updates ? updates.available_from : paper.available_from) as string | null;
    const mergedUntil = ("available_until" in updates ? updates.available_until : paper.available_until) as string | null;
    if (mergedFrom && mergedUntil && new Date(mergedUntil) <= new Date(mergedFrom)) {
      res.status(400).json({ success: false, message: "The test must close after it opens." }); return;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: "No supported paper fields supplied." }); return;
    }
    updates.review_version = (paper.review_version ?? 1) + 1;

    const { data, error } = await supabaseDB
      .from("papers").update(updates).eq("id", paper.id).eq("institute_id", instituteId)
      .select("id, title, marking_scheme, total_marks, duration_min, available_from, available_until, result_release_at, review_version")
      .maybeSingle();
    if (error) throw error;

    await audit({
      instituteId, paperId: paper.id, actorId: req.user!.id, action: "paper_updated",
      before: {
        title: paper.title, marking_scheme: paper.marking_scheme, total_marks: paper.total_marks,
        duration_min: paper.duration_min, available_from: paper.available_from,
        available_until: paper.available_until, result_release_at: paper.result_release_at,
      },
      after: updates,
    });
    res.json({ success: true, data: { paper: data } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

export async function validatePaper(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const { data: paper, error: paperErr } = await supabaseDB
      .from("papers").select("*, exam_code:exams(code)")
      .eq("id", req.params.id).eq("institute_id", instituteId).eq("is_active", true).maybeSingle();
    if (paperErr) throw paperErr;
    if (!paper) { res.status(404).json({ success: false, message: "Paper not found." }); return; }

    // Everything a per-question check needs. This used to select only
    // id, subject and question_text while the checks below read correct_answer —
    // which was therefore always undefined, so "N questions have no correct
    // answer" counted every question on every paper.
    // question_number is not a real column on questions — it is computed below
    // from position, the same way getPaper does it. Selecting it directly threw
    // "column questions_1.question_number does not exist" on every call, which
    // made Validate paper a 500 for every paper in every institute.
    const { data: rows, error } = await supabaseDB.from("paper_questions")
      .select("position, questions(id, subject, chapter, question_text, question_type, options, correct_answer, source_reference, extraction_metadata)")
      .eq("paper_id", paper.id).order("position", { ascending: true });
    if (error) throw error;

    const questions = (rows ?? []).map((row: any, idx: number) => {
      const question = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      return {
        position: row.position,
        ...question,
        question_number: question?.question_number ?? row.position ?? idx + 1,
      };
    });

    // The same function backs the Superadmin validate endpoint and the publish
    // guard, so a paper cannot pass here and fail there.
    res.json({ success: true, data: validatePaperQuestions(questions, (paper as any).exam_code?.code ?? "", Boolean(paper.extracted_from_pdf)) });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const instituteId = hasInstitute(req, res);
    if (!instituteId) return;

    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    const url = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ success: true, data: { url } });
  } catch (err: any) {
    console.error("[test-department/uploadImage error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

