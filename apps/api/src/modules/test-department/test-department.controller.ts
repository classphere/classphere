import { randomUUID } from "crypto";
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
  "question_text", "image_url", "options", "correct_answer", "explanation", "tags",
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
  if (["mcq_single", "mcq_multiple", "assertion_reason", "matching"].includes(type) && options.length < 2) return "This question type requires at least two options.";
  if (answers.length === 0) return "A correct answer is required.";
  if (type === "mcq_single" && answers.length !== 1) return "A single-correct question needs exactly one correct answer.";
  return null;
}
async function getOwnedPaper(paperId: string, instituteId: string) {
  const { data, error } = await supabaseDB
    .from("papers")
    .select("*")
    .eq("id", paperId)
    .eq("institute_id", instituteId)
    .eq("is_active", true)
    .maybeSingle();
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
    let query = supabaseDB.from("papers").select("id, title, test_type, total_questions, total_marks, duration_min, workflow_status, review_version, created_at, submitted_at, available_from, available_until, created_by, users!papers_created_by_fkey(name, email)")
      .eq("institute_id", instituteId).eq("is_active", true).order("created_at", { ascending: false });
    if (status) query = query.eq("workflow_status", status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: { papers: data ?? [] } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
}

export async function getReviewPaper(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    // Join the exams table to get the resolved exam code (e.g. "jee-main", "neet-ug")
    const { data: paper, error: paperErr } = await supabaseDB
      .from("papers")
      .select("*, exam_code:exams(code)")
      .eq("id", req.params.id)
      .eq("institute_id", instituteId)
      .eq("is_active", true)
      .maybeSingle();
    if (paperErr) throw paperErr;
    if (!paper) { res.status(404).json({ success: false, message: "Draft paper not found." }); return; }
    const { data: rows, error } = await supabaseDB.from("paper_questions")
      .select("position, questions(*)").eq("paper_id", paper.id).order("position", { ascending: true });
    if (error) throw error;
    const { data: events } = await supabaseDB.from("test_review_events").select("id, question_id, action, reason, actor_id, created_at, users(name)")
      .eq("paper_id", paper.id).order("created_at", { ascending: false }).limit(100);
    res.json({ success: true, data: { paper, questions: (rows ?? []).map((row: any) => ({ position: row.position, ...(Array.isArray(row.questions) ? row.questions[0] : row.questions) })), events: events ?? [] } });
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
    if ((req.body.question_text !== undefined || req.body.image_url !== undefined) && req.body.content_blocks === undefined) {
      updates.content_blocks = null;
    }
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

export async function transitionReviewPaper(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const paper = await getOwnedPaper(req.params.id, instituteId);
    if (!paper) { res.status(404).json({ success: false, message: "Draft paper not found." }); return; }
    const action = req.body?.action;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : null;
    const role = req.user!.role;
    const transitions: Record<string, string[]> = {
      submit: ["draft", "changes_requested"], request_changes: ["needs_review", "approved"], approve: ["needs_review"], publish: ["approved", "scheduled"], archive: ["draft", "changes_requested", "approved", "scheduled", "published"],
    };
    if (!transitions[action]?.includes(paper.workflow_status)) { res.status(409).json({ success: false, message: "This workflow action is not available for the current paper status." }); return; }
    if (["publish", "archive"].includes(action) && !isHead(req)) { res.status(403).json({ success: false, message: "Only the Test Department Head can publish or archive a paper." }); return; }
    if (!isDepartmentUser(req) && role !== "institute_admin") { res.status(403).json({ success: false, message: "Access denied." }); return; }
    let workflow_status: string = paper.workflow_status;
    const updates: Record<string, unknown> = { review_version: paper.review_version + 1 };
    if (action === "submit") { workflow_status = "needs_review"; updates.submitted_at = new Date().toISOString(); updates.submitted_by = req.user!.id; }
    if (action === "request_changes") workflow_status = "changes_requested";
    if (action === "approve") { workflow_status = "approved"; updates.approved_at = new Date().toISOString(); updates.approved_by = req.user!.id; }
    if (action === "archive") { workflow_status = "archived"; updates.is_active = false; updates.is_published = false; }
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

// ── Exam pattern rules — deterministic, rule-based (not AI) ───────────────────
const EXAM_PATTERNS: Record<string, { subjects: string[]; counts: Record<string, number>; total: number }> = {
  "neet-ug": {
    subjects: ["Physics", "Chemistry", "Biology"],
    counts: { Physics: 45, Chemistry: 45, Biology: 90 },
    total: 180,
  },
  "jee-main": {
    subjects: ["Physics", "Chemistry", "Mathematics"],
    counts: { Physics: 25, Chemistry: 25, Mathematics: 25 },
    total: 75,
  },
  "jee-advanced": {
    subjects: ["Physics", "Chemistry", "Mathematics"],
    // JEE Advanced has variable counts per year; validate total only
    counts: {},
    total: 0, // 0 = skip total validation
  },
};

export async function validatePaper(req: Request, res: Response): Promise<void> {
  try {
    const instituteId = hasInstitute(req, res); if (!instituteId) return;
    const { data: paper, error: paperErr } = await supabaseDB
      .from("papers").select("*, exam_code:exams(code)")
      .eq("id", req.params.id).eq("institute_id", instituteId).eq("is_active", true).maybeSingle();
    if (paperErr) throw paperErr;
    if (!paper) { res.status(404).json({ success: false, message: "Paper not found." }); return; }

    const { data: rows, error } = await supabaseDB.from("paper_questions")
      .select("position, questions(id, subject, question_text)").eq("paper_id", paper.id).order("position", { ascending: true });
    if (error) throw error;

    const questions = (rows ?? []).map((r: any) => ({ position: r.position, ...(Array.isArray(r.questions) ? r.questions[0] : r.questions) }));

    // Detect exam code from question subjects (more reliable than the DB FK).
    // If Biology is present → NEET UG. If Mathematics → JEE Main.
    // Fall back to the paper's exam_code FK only if subjects are ambiguous.
    const subjectSet = new Set(
      questions.map((q: any) => (q.subject ?? "").toLowerCase().trim()).filter(Boolean)
    );
    let examCode: string;
    if (subjectSet.has("biology") || subjectSet.has("bio")) {
      examCode = "neet-ug";
    } else if (subjectSet.has("mathematics") || subjectSet.has("maths") || subjectSet.has("math")) {
      examCode = "jee-main";
    } else {
      examCode = (paper as any).exam_code?.code ?? "";
    }

    const pattern = EXAM_PATTERNS[examCode];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Count subjects
    const counts: Record<string, number> = {};
    for (const q of questions) {
      const sub = q.subject || "Unknown";
      counts[sub] = (counts[sub] ?? 0) + 1;
    }

    if (pattern) {
      // Total count
      if (pattern.total > 0 && questions.length !== pattern.total) {
        errors.push(`Expected ${pattern.total} questions total, found ${questions.length}.`);
      }
      // Per-subject counts
      for (const [sub, expected] of Object.entries(pattern.counts)) {
        const found = counts[sub] ?? 0;
        if (found !== expected) {
          errors.push(`Expected ${sub}: ${expected}, Found: ${found}.`);
        }
      }
      // Unknown subjects
      const unknownSubs = Object.keys(counts).filter((s) => !pattern.subjects.includes(s));
      for (const sub of unknownSubs) {
        warnings.push(`${counts[sub]} question(s) have subject "${sub}" which is not expected for ${examCode}.`);
      }
      // Missing answers
      const noAnswer = questions.filter((q: any) => !q.correct_answer?.length);
      if (noAnswer.length > 0) {
        warnings.push(`${noAnswer.length} question(s) have no correct answer set.`);
      }
      // Missing question text
      const noText = questions.filter((q: any) => !String(q.question_text ?? "").trim());
      if (noText.length > 0) {
        errors.push(`${noText.length} question(s) have empty question text.`);
      }
    } else {
      warnings.push(`No validation pattern defined for exam "${examCode}" — manual review required.`);
    }

    res.json({ success: true, data: { valid: errors.length === 0, errors, warnings, counts, total: questions.length, examCode } });
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

