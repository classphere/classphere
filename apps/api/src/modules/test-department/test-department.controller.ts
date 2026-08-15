import { randomUUID } from "crypto";
import { uploadDataUrlList, uploadOptionFigures } from "../../lib/question-figures";
import { isChoiceQuestion } from "../../lib/question-taxonomy";
import { validatePaperQuestions } from "../../lib/paper-validation";
import { totalMarksForQuestions, validateMarkingScheme } from "../../lib/marking-scheme";
import { Request, Response } from "express";
import { sendStaffInviteEmail } from "../../lib/mailer";
import { supabaseAdmin, supabaseDB } from "../../lib/supabase";
import { notifyStudents } from "../notifications/notifications.service";
import { uploadToR2 } from "../../lib/r2";

const TEST_ADMIN_ROLE = "test_department_head";
const TEST_EDITOR_ROLE = "test_department_member";
const appBaseDomain = (process.env.APP_BASE_DOMAIN ?? "classphere.com").toLowerCase();
const departmentRoles = new Set([TEST_ADMIN_ROLE, TEST_EDITOR_ROLE]);
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
function isHead(req: Request) {
  return req.user?.role === TEST_ADMIN_ROLE;
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
    const { name, email, title, access_level, password: customPassword } = req.body ?? {};
    const requestedLevel = access_level === "head" ? "head" : "editor";
    if (req.user?.role === "institute_admin" && requestedLevel !== "head") {
      res.status(403).json({ success: false, message: "The Institute Admin appoints the Test Department Head. The Head manages Test Editors." }); return;
    }
    if (req.user?.role === TEST_ADMIN_ROLE && requestedLevel !== "editor") {
      res.status(403).json({ success: false, message: "A Test Department Head can add Test Editors only." }); return;
    }
    if (!name || !email) {
      res.status(400).json({ success: false, message: "Name and email are required." }); return;
    }
    if (!process.env.RESEND_API_KEY?.trim()) {
      res.status(503).json({ success: false, message: "Staff email delivery is not configured. Configure RESEND_API_KEY before creating the account." }); return;
    }
    const { data: currentAdmin, error: currentAdminError } = await supabaseDB
      .from("test_department_members")
      .select("user_id, users!test_department_members_user_id_fkey!inner(role)")
      .eq("institute_id", instituteId).eq("is_active", true).eq("access_level", "head").limit(1);
    if (currentAdminError) throw currentAdminError;
    if (requestedLevel === "head" && currentAdmin?.length) {
      res.status(409).json({ success: false, message: "This institute already has an active Test Department Head." }); return;
    }
    const role = requestedLevel === "head" ? TEST_ADMIN_ROLE : TEST_EDITOR_ROLE;
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
    const { error: memberError } = await supabaseDB.from("test_department_members").insert({ user_id: userId, institute_id: instituteId, title: title?.trim() || null, access_level: requestedLevel, created_by: req.user!.id });
    if (memberError) { await supabaseDB.from("users").delete().eq("id", userId); await supabaseAdmin.auth.admin.deleteUser(userId); throw memberError; }
    const { data: institute } = await supabaseDB.from("institutes").select("name, subdomain_slug").eq("id", instituteId).maybeSingle();
    try {
      const loginUrl = institute?.subdomain_slug
        ? `https://${institute.subdomain_slug}.${appBaseDomain}/login`
        : undefined;
      await sendStaffInviteEmail({ to: normalizedEmail, name: String(name).trim(), instituteName: institute?.name ?? "Your Institute", tempPassword, roleLabel: requestedLevel === "head" ? "Test Department Head" : "Test Editor", loginUrl });
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
    const level = (member as any).access_level ?? ((member as any).users?.role === TEST_ADMIN_ROLE ? "head" : "editor");
    if (req.user?.role === TEST_ADMIN_ROLE && level !== "editor") {
      res.status(403).json({ success: false, message: "The Test Department Head cannot deactivate the Head account." }); return;
    }
    if (req.user?.role !== "institute_admin" && req.user?.role !== TEST_ADMIN_ROLE) {
      res.status(403).json({ success: false, message: "Access denied." }); return;
    }
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
    const role = req.user!.role;
    const transitions: Record<string, string[]> = {
      submit: ["draft", "changes_requested"], request_changes: ["needs_review", "approved"], approve: ["needs_review"], publish: ["approved", "scheduled"],
      archive: ["draft", "changes_requested", "approved", "scheduled", "published"],
      // Always back to draft, never straight to whatever it was before: a
      // restored paper should go through a conscious re-publish rather than
      // silently going live again the instant it's un-archived.
      restore: ["archived"],
    };
    if (!transitions[action]?.includes(paper.workflow_status)) { res.status(409).json({ success: false, message: "This workflow action is not available for the current paper status." }); return; }
    // Publishing, archiving and restoring belong to the Head — and to the
    // Institute Admin above them, because a small coaching has no Test
    // Department at all and the owner does the whole job themselves.
    if (["publish", "archive", "restore"].includes(action) && !isHead(req) && role !== "institute_admin") {
      res.status(403).json({ success: false, message: "Only the Test Department Head or the Institute Admin can publish, archive or restore a paper." }); return;
    }
    if (!isDepartmentUser(req) && role !== "institute_admin") { res.status(403).json({ success: false, message: "Access denied." }); return; }
    let workflow_status: string = paper.workflow_status;
    const updates: Record<string, unknown> = { review_version: paper.review_version + 1 };
    if (action === "submit") { workflow_status = "needs_review"; updates.submitted_at = new Date().toISOString(); updates.submitted_by = req.user!.id; }
    if (action === "request_changes") workflow_status = "changes_requested";
    if (action === "approve") { workflow_status = "approved"; updates.approved_at = new Date().toISOString(); updates.approved_by = req.user!.id; }
    if (action === "archive") { workflow_status = "archived"; updates.is_active = false; updates.is_published = false; }
    if (action === "restore") { workflow_status = "draft"; updates.is_active = true; }
    if (action === "publish") {
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
    if (!isDepartmentUser(req) && req.user!.role !== "institute_admin") {
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

/**
 * PATCH /api/v1/test-department/papers/:id
 *
 * What the paper's questions are worth. A JEE Advanced paper carries no safe
 * default — its marks differ by question type and change between years — so a
 * paper whose instructions page was missing or unreadable arrives without them
 * and cannot be published until someone says.
 *
 * The Superadmin equivalent is PATCH /tests/:id/global, which only touches
 * papers in the global bank. An institute paper needs its own route, or the
 * marking-scheme editor would be a screen only a superadmin could ever use —
 * while the person actually holding the unpriced paper is usually the test
 * editor who just uploaded it.
 */
export async function updateReviewPaper(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const paper = await getOwnedPaper(req.params.id, instituteId);
    if (!paper) { res.status(404).json({ success: false, message: "Draft paper not found." }); return; }
    if (paper.is_published) {
      res.status(409).json({ success: false, message: "A published paper is immutable. Create a revision instead." }); return;
    }

    const updates: Record<string, unknown> = {};
    if (req.body?.marking_scheme !== undefined) {
      const schemeErrors = validateMarkingScheme(req.body.marking_scheme);
      if (schemeErrors.length > 0) {
        res.status(400).json({ success: false, message: "Invalid marking_scheme.", errors: schemeErrors }); return;
      }
      updates.marking_scheme = req.body.marking_scheme;

      // total_marks was summed at upload against whatever scheme existed then —
      // for a paper that had none, that means the +4 fallback. Left alone it
      // would permanently claim a total its own questions do not add up to.
      const { data: rows, error: rowsError } = await supabaseDB
        .from("paper_questions").select("questions(question_type, marks)").eq("paper_id", paper.id);
      if (rowsError) throw rowsError;
      const paperQuestions = (rows ?? [])
        .map((row: any) => (Array.isArray(row.questions) ? row.questions[0] : row.questions))
        .filter(Boolean);
      if (paperQuestions.length > 0) {
        updates.total_marks = totalMarksForQuestions(paperQuestions, req.body.marking_scheme);
      }
    }
    if (typeof req.body?.title === "string" && req.body.title.trim()) updates.title = req.body.title.trim();

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: "No supported paper fields supplied." }); return;
    }

    const { data, error } = await supabaseDB
      .from("papers").update(updates).eq("id", paper.id).eq("institute_id", instituteId)
      .select("id, title, marking_scheme, total_marks").maybeSingle();
    if (error) throw error;

    await audit({
      instituteId, paperId: paper.id, actorId: req.user!.id, action: "paper_updated",
      before: { marking_scheme: paper.marking_scheme, total_marks: paper.total_marks }, after: updates,
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
    res.json({ success: true, data: validatePaperQuestions(questions, (paper as any).exam_code?.code ?? "") });
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

