import { Request, Response } from "express";
import { annualValuePaise, getStudentCountsByInstitute, provisionInstitute } from "./institutes.service";
import { supabaseAdmin, supabaseDB } from "../../lib/supabase";
import { logAdminAction } from "../../lib/admin-audit";
import { getOrSetCache } from "../../lib/cache";
import { rankLifetimePerformance } from "../rankings/lifetime-ranking.service";
import { enrolExclusively, findConflictingEnrolment } from "../../lib/batch-enrolment";

/** Lifecycle values institute_subscriptions.status accepts (see migration 10). */
const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "cancelled"];

/** Cohort stage. Not derivable from target_year — 2027 is class 12 for one institute and droppers for another. */
const CLASS_LEVELS = ["class_11", "class_12", "dropper"];

/**
 * The date a batch should expire: the exam's month and day, in the target year.
 *
 * Falls back to rolling the calendar entry forward to the next future date when
 * no target year was given, which is what the old inline logic did for every
 * batch regardless of how far out its cohort sat.
 */
function deriveExpiry(suggestedEndsAt: string | null, targetYear: number | null): string | null {
  if (!suggestedEndsAt) return null;
  const suggested = new Date(suggestedEndsAt);
  if (Number.isNaN(suggested.getTime())) return null;

  if (targetYear) {
    suggested.setUTCFullYear(targetYear);
  } else if (suggested < new Date()) {
    suggested.setUTCFullYear(suggested.getUTCFullYear() + 1);
  }
  return suggested.toISOString().split("T")[0];
}

/**
 * Keep users.exam_target in step with the batch a student sits in.
 *
 * Entitlement is derived from batches on every request, so this column no
 * longer gates access — but analytics, syllabus coverage and daily revision
 * still read it, and it defaulted to "JEE" at registration and was never
 * updated. A student moved into a NEET batch would otherwise keep seeing JEE
 * analytics indefinitely.
 */
async function syncExamTargetToBatch(studentIds: string[], batchId: string): Promise<void> {
  if (studentIds.length === 0) return;
  const { data: batch } = await supabaseDB.from("batches").select("exam").eq("id", batchId).maybeSingle();
  if (!batch?.exam) return;
  const { error } = await supabaseDB
    .from("users")
    .update({ exam_target: batch.exam })
    .in("id", studentIds)
    .eq("role", "student");
  if (error) console.error("[syncExamTargetToBatch] failed:", error.message);
}

/**
 * How many students and teachers each batch actually has.
 *
 * The batch row carries max_students and max_teachers, which are capacity
 * limits — what the batch is allowed to hold, not what is in it. Every screen
 * showing a student count was reading those: the batches list rendered
 * `max_students ?? "—"` under a heading that said "Students", so a batch with
 * two students and no capacity set displayed a dash, and one with a limit of 60
 * and nobody in it would have displayed 60.
 *
 * Counted from batch_students with left_at null, which is the same definition of
 * "in this batch" the roster and the billing rollup already use — a departed
 * student keeps their row for history and must not be counted as present.
 */
async function withMemberCounts(batches: any[]): Promise<any[]> {
  if (!batches.length) return batches;
  const batchIds = batches.map((batch) => batch.id).filter(Boolean);
  if (!batchIds.length) return batches;

  const tally = async (table: string, excludeDeparted: boolean) => {
    const counts = new Map<string, number>();
    // Paged: an institute with a few thousand enrolments would otherwise be
    // silently truncated at PostgREST's 1,000-row ceiling, and the batches at
    // the far end would report zero members rather than an error.
    const PAGE_SIZE = 1000;
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabaseDB
        .from(table)
        .select("batch_id")
        .in("batch_id", batchIds)
        .order("batch_id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (excludeDeparted) query = query.is("left_at", null);

      const { data, error } = await query;
      if (error) {
        console.error(`[listBatches] ${table} count failed:`, error.message);
        break;
      }
      const page = data ?? [];
      for (const row of page) {
        const id = String((row as any).batch_id);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      if (page.length < PAGE_SIZE) break;
    }
    return counts;
  };

  const [studentCounts, teacherCounts] = await Promise.all([
    tally("batch_students", true),
    // batch_teachers has no left_at — unassigning a teacher deletes the row.
    tally("batch_teachers", false),
  ]);

  return batches.map((batch) => ({
    ...batch,
    student_count: studentCounts.get(String(batch.id)) ?? 0,
    faculty_count: teacherCounts.get(String(batch.id)) ?? 0,
  }));
}

const checkBatchTenant = async (batchId: string, reqUser: any): Promise<boolean> => {
  if (reqUser.role === "super_admin") return true;
  const { data } = await supabaseDB
    .from("batches")
    .select("institute_id")
    .eq("id", batchId)
    .maybeSingle();
  return !!data && data.institute_id === reqUser.institute_id;
};

// ─── Institute Handlers ─────────────────────────────────────────────────────

/**
 * POST /api/v1/institutes
 * [super_admin only] — Create a new institute and assign an admin user.
 * Delegates all DB work to institutes.service.ts per ARCHITECTURE_V2 §4.1.
 */
export const createInstitute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, adminEmail, adminUsername, preferredSubdomain, trialMonths, logoUrl, enabledExamCodes } = req.body;

    if (!name || !adminEmail || !adminUsername) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: name, adminEmail, adminUsername",
      });
      return;
    }

    const result = await provisionInstitute({ name, adminEmail, adminUsername, preferredSubdomain, trialMonths, logoUrl, enabledExamCodes });
    const { tempPassword, ...institute } = result;

    await logAdminAction(req.user?.id, "Institute provisioned", `Provisioned ${institute.name} with a trial entitlement.`, "institutes", "success");

    res.status(201).json({
      success: true,
      message: `Institute provisioned successfully.`,
      data: { institute, tempPassword },
    });
  } catch (err: any) {
    console.error("[createInstitute error]", err);
    const status = err.statusCode ?? 500;
    res.status(status).json({ success: false, message: err.message });
  }
};


/**
 * GET /api/v1/institutes/me
 * [institute_admin] — Get the institute owned by the current admin.
 */
export const getMyInstitute = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    let instituteQuery = supabaseDB
      .from("institutes")
      .select("id, name, plan, logo_url, primary_color, subdomain_slug, enabled_exam_codes, is_active, created_at")
      .eq("is_active", true);
    instituteQuery = req.user!.institute_id
      ? instituteQuery.eq("id", req.user!.institute_id)
      : instituteQuery.eq("owner_id", userId);
    const { data: institute, error } = await instituteQuery.maybeSingle();

    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    if (!institute) { res.status(404).json({ success: false, message: "No institute found" }); return; }

    // A performer must have enough evidence to be compared fairly. We use
    // submitted batch attempts only and require at least three tests.
    const { data: instituteStudents } = await supabaseDB
      .from("users")
      .select("id, name, email, phone, role, created_at")
      .eq("institute_id", institute.id)
      .eq("role", "student");

    const { data: instituteBatches } = await supabaseDB
      .from("batches")
      .select("id")
      .eq("institute_id", institute.id)
      .eq("is_active", true);

    const batchIds = (instituteBatches ?? []).map((batch: any) => batch.id);
    const studentById = new Map((instituteStudents ?? []).map((student: any) => [student.id, student]));
    const studentIds = [...studentById.keys()];
    const { data: submittedAttempts } = batchIds.length > 0 && studentIds.length > 0
      ? await supabaseDB
        .from("attempts")
        .select("student_id, paper_id, score, max_score, submitted_at")
        .eq("status", "submitted")
        .in("batch_id", batchIds)
        .in("student_id", studentIds)
        .not("max_score", "is", null)
      : { data: [] };

    // Same weighting as the batch lifetime leaderboard, from the same function.
    // This algorithm used to live inline here, which meant an institute admin's
    // "top performers" and a student's own leaderboard position could have been
    // computed two different ways and disagreed about who was doing well.
    //
    // Peers are institute-wide here rather than per batch, because that is the
    // population this dashboard compares: the whole institute's students.
    const rankedPerformers = rankLifetimePerformance(
      (submittedAttempts ?? []).flatMap((attempt: any) => {
        const maxScore = Number(attempt.max_score);
        const paperId = String(attempt.paper_id ?? "");
        if (!Number.isFinite(maxScore) || maxScore <= 0 || !paperId) return [];
        return [{
          studentId: String(attempt.student_id),
          paperId,
          percentage: (Number(attempt.score ?? 0) / maxScore) * 100,
          submittedAt: attempt.submitted_at ?? null,
        }];
      }),
    );

    const topPerformers = rankedPerformers.slice(0, 5).map((entry) => {
      const student = studentById.get(entry.student_id);
      return {
        id: entry.student_id,
        name: student?.name ?? "Student",
        email: student?.email ?? null,
        tests_taken: entry.tests_taken,
        average_percentage: entry.average_percentage,
        consistency: entry.consistency,
        trend: entry.trend,
        performance_score: entry.performance_score,
      };
    });

    // Map DB schema to UI expectations
    const mappedInstitute = {
      ...institute,
      subscription_plan: institute.plan,
      type: "hybrid",
      max_students: 1000 // default dummy since no column exists
    };

    res.status(200).json({ success: true, data: { institute: mappedInstitute, topPerformers } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/v1/institutes/:id
 * [institute_admin] — Update institute settings.
 */
export const updateInstitute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const isSuperAdmin = req.user!.role === "super_admin";

    if (isSuperAdmin && req.body.enabled_exam_codes !== undefined) {
      const codes = req.body.enabled_exam_codes;
      const validCodes = ["jee-main", "jee-advanced", "jee-main-advanced", "neet-ug"];
      if (!Array.isArray(codes) || codes.length === 0 || codes.some((code) => !validCodes.includes(code))) {
        res.status(400).json({ success: false, message: "enabled_exam_codes must contain one or more supported exam codes." });
        return;
      }
    }

    const allowed = isSuperAdmin
      ? ["name", "logo_url", "primary_color", "plan", "is_active", "enabled_exam_codes"]
      : ["name", "logo_url", "primary_color"];

    const updates: Record<string, any> = {};
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    if (Object.keys(updates).length === 0) { res.status(400).json({ success: false, message: "No valid fields to update" }); return; }

    let query = supabaseDB.from("institutes").update(updates).eq("id", id);
    if (!isSuperAdmin) {
      query = query.eq("owner_id", userId);
    }

    const { data: institute, error } = await query.select().single();

    if (error || !institute) { res.status(error ? 500 : 404).json({ success: false, message: error?.message ?? "Institute not found" }); return; }
    if (isSuperAdmin) {
      await logAdminAction(req.user?.id, "Institute updated", `Updated ${institute.name}.`, "institutes", "success");
    }
    res.status(200).json({ success: true, data: { institute } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/v1/institutes/:id
 * [super_admin only] — Suspend/Delete an institute.
 */
export const deleteInstitute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: institute, error } = await supabaseDB
      .from("institutes")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error || !institute) {
      res.status(error ? 500 : 404).json({ success: false, message: error?.message ?? "Institute not found" });
      return;
    }

    await logAdminAction(req.user?.id, "Institute suspended", `Suspended ${institute.name}.`, "institutes", "success");
    res.status(200).json({ success: true, message: "Institute suspended successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/institutes/:id/stats
 * [institute_admin] — Aggregate stats for the institute dashboard.
 */
export const getInstituteStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user!.role !== "super_admin" && id !== req.user!.institute_id) {
      res.status(403).json({ success: false, message: "Access denied. You can only view statistics for your own institute." });
      return;
    }

    // Fetch all active batches for this institute
    const { data: batches, error: bErr } = await supabaseDB
      .from("batches").select("id").eq("institute_id", id).eq("is_active", true);
    if (bErr) { res.status(500).json({ success: false, message: bErr.message }); return; }

    const batchIds = (batches ?? []).map((b: any) => b.id);
    const totalBatches = batchIds.length;

    // Count total distinct students across all batches
    let totalStudents = 0;
    if (batchIds.length > 0) {
      const { count } = await supabaseDB
        .from("batch_students").select("student_id", { count: "exact", head: true })
        .in("batch_id", batchIds)
        .is("left_at", null);
      totalStudents = count ?? 0;
    }

    // Count faculty
    const { count: totalFaculty } = await supabaseDB
      .from("faculty").select("id", { count: "exact", head: true })
      .eq("institute_id", id).eq("is_active", true);

    res.status(200).json({
      success: true,
      data: { stats: { total_students: totalStudents, total_batches: totalBatches, total_faculty: totalFaculty ?? 0 } },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/institutes/:id/reports
 * [institute_admin] — Deep Analytics Dashboard for Institute.
 */
export const getInstituteReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user!.role !== "super_admin" && id !== req.user!.institute_id) {
      res.status(403).json({ success: false, message: "Access denied. You can only view reports for your own institute." });
      return;
    }

    // This report recomputes trend/mastery/leaderboard aggregates from every
    // submitted attempt the institute has ever had — expensive, and identical
    // for every admin/staff viewer, so cache it for a couple of minutes.
    const data = await getOrSetCache(`institutes:reports:${id}`, 120, () => computeInstituteReports(id));
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

async function computeInstituteReports(id: string) {
    // Batches and institute students don't depend on each other — fetch concurrently.
    const [{ data: batches }, { data: instituteUsers }] = await Promise.all([
      supabaseDB.from("batches").select("id, name, exam").eq("institute_id", id).eq("is_active", true),
      supabaseDB.from("users").select("id").eq("institute_id", id).eq("role", "student"),
    ]);

    const batchIds = (batches ?? []).map((b: any) => b.id);
    
    // We need all attempts across these batches for trend and mastery
    let attempts: any[] = [];
    if (batchIds.length > 0) {
      const { data: att } = await supabaseDB
        .from("attempts")
        .select("id, student_id, batch_id, score, max_score, submitted_at, exam_code")
        .in("batch_id", batchIds)
        .eq("status", "submitted")
        .not("score", "is", null);
      attempts = att ?? [];
    }

    // 1. Calculate Trend Data (Month over month accuracy by exam/subject)
    // For simplicity in MVP, we aggregate accuracy across all tests per month
    const trendMap: Record<string, { totalScore: number, totalMax: number }> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (const a of attempts) {
      if (a.max_score > 0) {
        const date = new Date(a.submitted_at);
        const m = months[date.getMonth()];
        if (!trendMap[m]) trendMap[m] = { totalScore: 0, totalMax: 0 };
        trendMap[m].totalScore += a.score;
        trendMap[m].totalMax += a.max_score;
      }
    }

    const trendData = months.filter(m => trendMap[m]).map(m => ({
      month: m,
      Score: Math.round((trendMap[m].totalScore / trendMap[m].totalMax) * 100),
    }));

    // If trendData is empty, add some mock months for the UI to render the chart
    if (trendData.length === 0) {
      const currentMonth = months[new Date().getMonth()];
      trendData.push({ month: currentMonth, Score: 0 });
    }

    // 2. Mastery Data (Subject wise)
    // To do this properly, we need to query attempt_answers. For MVP, we can simulate it from question breakdown if we fetch 100 recent answers
    let masteryData: any[] = [];
    if (attempts.length > 0) {
      const recentIds = attempts.sort((a,b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()).slice(0, 100).map(a => a.id);
      
      const { data: answers } = await supabaseDB
        .from("attempt_answers")
        .select("is_correct, questions(subject)")
        .in("attempt_id", recentIds);
        
      const subjectStats: Record<string, { correct: number, total: number }> = {};
      for (const ans of answers ?? []) {
        const sub = (ans.questions as any)?.subject || "General";
        if (!subjectStats[sub]) subjectStats[sub] = { correct: 0, total: 0 };
        subjectStats[sub].total++;
        if (ans.is_correct) subjectStats[sub].correct++;
      }
      
      masteryData = Object.entries(subjectStats).map(([subject, stats]) => ({
        subject,
        Score: Math.round((stats.correct / stats.total) * 100)
      }));
    }

    if (masteryData.length === 0) {
      masteryData = [{ subject: "No Data", Score: 0 }];
    }

    // 3. Top and Bottom Students
    // Query student_stats for users in this institute
    const studentIds = (instituteUsers ?? []).map(u => u.id);

    // Only the top/bottom 5 are ever shown — ask the DB for exactly those
    // instead of pulling every student's stats and sorting in JS.
    let topStudents: any[] = [];
    let bottomStudents: any[] = [];
    if (studentIds.length > 0) {
      const toRow = (s: any) => ({ name: s.users?.name, accuracy: s.accuracy_pct, tests: s.total_tests });
      const [{ data: topStats }, { data: bottomStats }] = await Promise.all([
        supabaseDB
          .from("student_stats")
          .select("student_id, accuracy_pct, total_tests, users!inner(name)")
          .in("student_id", studentIds)
          .order("accuracy_pct", { ascending: false })
          .limit(5),
        supabaseDB
          .from("student_stats")
          .select("student_id, accuracy_pct, total_tests, users!inner(name)")
          .in("student_id", studentIds)
          .order("accuracy_pct", { ascending: true })
          .limit(5),
      ]);
      topStudents = (topStats ?? []).map(toRow);
      bottomStudents = (bottomStats ?? []).map(toRow);
    }

    // 4. Batch Leaderboard
    const batchStatsMap: Record<string, { totalScore: number, totalMax: number, count: number }> = {};
    for (const a of attempts) {
      if (!batchStatsMap[a.batch_id]) {
        batchStatsMap[a.batch_id] = { totalScore: 0, totalMax: 0, count: 0 };
      }
      batchStatsMap[a.batch_id].totalScore += a.score;
      batchStatsMap[a.batch_id].totalMax += a.max_score;
      batchStatsMap[a.batch_id].count++;
    }

    const batchLeaderboard = (batches ?? []).map((b: any) => {
      const stats = batchStatsMap[b.id] || { totalScore: 0, totalMax: 0, count: 0 };
      return {
        id: b.id,
        name: b.name,
        exam: b.exam,
        testsCount: stats.count,
        avgScore: stats.totalMax > 0 ? Math.round((stats.totalScore / stats.totalMax) * 100) : 0
      };
    }).sort((a, b) => b.avgScore - a.avgScore);

    return {
      trendData,
      masteryData,
      topStudents,
      bottomStudents,
      batchLeaderboard,
    };
}

// ─── Batch Handlers ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/batches
 * [institute_admin] — Create a new batch within the admin's institute.
 */
export const createBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, exam, starts_at, ends_at, target_year, class_level, entry_class_level } = req.body;

    if (!name || !exam) {
      res.status(400).json({ success: false, message: "name and exam are required" });
      return;
    }

    if (target_year !== undefined && target_year !== null) {
      if (!Number.isInteger(target_year) || target_year < 2020 || target_year > 2100) {
        res.status(400).json({ success: false, message: "target_year must be a four-digit exam year" });
        return;
      }
    }
    // `class_level` is accepted as an alias so an older client keeps working;
    // the column is entry_class_level because it records the class the cohort
    // joined in, not the class it is in today.
    const entryClass = entry_class_level ?? class_level;
    if (entryClass !== undefined && entryClass !== null && !CLASS_LEVELS.includes(entryClass)) {
      res.status(400).json({ success: false, message: `entry_class_level must be one of: ${CLASS_LEVELS.join(", ")}` });
      return;
    }

    // ── 1. Find the institute owned by this admin ────────────────────────────
    let instituteQuery = supabaseDB
      .from("institutes")
      .select("id, enabled_exam_codes")
      .eq("is_active", true);
    instituteQuery = req.user?.institute_id
      ? instituteQuery.eq("id", req.user.institute_id)
      : instituteQuery.eq("owner_id", userId);
    const { data: institute, error: instErr } = await instituteQuery.maybeSingle();

    if (instErr) {
      console.error("[createBatch] Institute lookup failed:", instErr);
      res.status(500).json({ success: false, message: "Unable to load your institute configuration. Please contact support." });
      return;
    }
    if (!institute) {
      res.status(404).json({ success: false, message: "No active institute found for this admin" });
      return;
    }

    const enabledExamCodes = institute.enabled_exam_codes ?? ["jee-main", "jee-advanced", "neet-ug"];
    if (!enabledExamCodes.includes(exam.trim())) {
      res.status(403).json({ success: false, message: "This examination is not enabled for your institute." });
      return;
    }

    if (starts_at && ends_at && new Date(ends_at).getTime() <= new Date(starts_at).getTime()) {
      res.status(400).json({ success: false, message: "Batch expiry must be after its start date." });
      return;
    }

    // ── 2. Insert the batch ──────────────────────────────────────────────────
    const { data: batch, error: batchErr } = await supabaseDB
      .from("batches")
      .insert({
        institute_id: institute.id,
        name: name.trim(),
        exam: exam.trim(),
        starts_at: starts_at || null,
        // Filled in below once the exam calendar has been consulted.
        ends_at: ends_at || null,
        target_year: target_year ?? null,
        entry_class_level: entryClass || null,
        is_active: true,
      })
      .select()
      .single();

    if (batchErr || !batch) {
      console.error("[createBatch] DB error:", batchErr);
      res.status(500).json({ success: false, message: batchErr?.message ?? "Failed to create batch" });
      return;
    }

    // Derive the expiry from the exam calendar when the caller did not set one.
    //
    // The target year decides which cycle this is, so the calendar supplies
    // only the month and day. Previously the stored date was used whole and
    // bumped a year whenever it had already passed, which produced the right
    // answer for next year's batch and the wrong one for anything further out
    // — a class 11 cohort sitting in 2028 got a 2027 expiry.
    if (!ends_at && batch) {
      const { data: calRow, error: calErr } = await supabaseDB
        .from("exam_calendar")
        .select("suggested_ends_at")
        .eq("exam_code", exam.trim())
        .maybeSingle();

      // This error used to be discarded. A batch that fails to get an expiry
      // never expires, which silently costs a renewal, so the failure is loud
      // even though the batch itself was created successfully.
      if (calErr) {
        console.error(
          `[createBatch] exam_calendar lookup failed for "${exam.trim()}" — batch ${batch.id} has NO expiry date:`,
          calErr.message,
        );
      }

      const derived = deriveExpiry(calRow?.suggested_ends_at ?? null, target_year ?? null);
      if (derived) {
        const patch: Record<string, any> = { ends_at: derived };
        // A batch created without a stated target year still belongs to a
        // cycle; take it from the date we just settled on so the grouped list
        // has somewhere to put it.
        if (target_year == null) patch.target_year = new Date(derived).getUTCFullYear();
        await supabaseDB.from("batches").update(patch).eq("id", batch.id);
        Object.assign(batch as any, patch);
      }
    }

    console.log(`[createBatch] Created batch "${batch.name}" (id=${batch.id}) for institute ${institute.id}`);
    res.status(201).json({ success: true, data: { batch } });
  } catch (err: any) {
    console.error("[createBatch error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/batches
 * [institute_admin / teacher] — List all batches in the institute.
 */
export const listBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (role === "institute_admin" || role === "test_department_head" || role === "test_department_member") {
      // ── Find institute owned by this admin ─────────────────────────────────
      let instituteQuery = supabaseDB
        .from("institutes")
        .select("id")
        .eq("is_active", true);
      instituteQuery = req.user?.institute_id
        ? instituteQuery.eq("id", req.user.institute_id)
        : instituteQuery.eq("owner_id", userId);
      const { data: institute, error: instErr } = await instituteQuery.maybeSingle();

      if (instErr || !institute) {
        res.status(404).json({ success: false, message: "No active institute found for this admin" });
        return;
      }

      const { data: batches, error: batchErr } = await supabaseDB
        .from("batches")
        .select("*")
        .eq("institute_id", institute.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (batchErr) {
        res.status(500).json({ success: false, message: batchErr.message });
        return;
      }

      res.status(200).json({ success: true, data: { batches: await withMemberCounts(batches ?? []) } });
      return;
    }

    // teacher: batches they are assigned to
    if (role === "teacher") {
      const { data: rows, error } = await supabaseDB
        .from("batch_teachers")
        .select("batch_id, batches(*)")
        .eq("teacher_id", userId);

      if (error) {
        res.status(500).json({ success: false, message: error.message });
        return;
      }

      const batches = (rows ?? []).map((r: any) => r.batches).filter(Boolean);
      res.status(200).json({ success: true, data: { batches: await withMemberCounts(batches) } });
      return;
    }

    res.status(403).json({ success: false, message: "Access denied" });
  } catch (err: any) {
    console.error("[listBatches error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/batches/:id
 * Authenticated — Get batch details including student and teacher lists.
 */
export const getBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!(await checkBatchTenant(id, req.user))) {
      res.status(403).json({ success: false, message: "Access denied. Batch does not belong to your institute." });
      return;
    }

    // Enforce student batch membership check (SEC-1 / Privacy)
    if (req.user?.role === "student") {
      const { data: enrollment } = await supabaseDB
        .from("batch_students")
        .select("student_id")
        .eq("batch_id", id)
        .eq("student_id", req.user.id)
        // Leaving the batch ends access to it, so a departed student cannot
        // keep reading the roster they were once part of.
        .is("left_at", null)
        .maybeSingle();

      if (!enrollment) {
        res.status(403).json({ success: false, message: "Access denied. You are not enrolled in this batch." });
        return;
      }
    }

    const { data: batch, error } = await supabaseDB
      .from("batches").select("*, institutes(name)").eq("id", id).eq("is_active", true).maybeSingle();
    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    if (!batch) { res.status(404).json({ success: false, message: "Batch not found" }); return; }

    // Students in batch
    // Current roster. Departed students keep their row for history and for
    // reconstructing past billing, but they are not who is in the batch now.
    const { data: studentLinks } = await supabaseDB
      .from("batch_students")
      .select("student_id, users(id, name, phone, date_of_birth)")
      .eq("batch_id", id)
      .is("left_at", null);
    const students = (studentLinks ?? []).map((r: any) => r.users).filter(Boolean);

    res.status(200).json({ success: true, data: { batch, students, teachers: [] } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/v1/batches/:id
 * [institute_admin] — Update batch settings.
 */
export const updateBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!(await checkBatchTenant(id, req.user))) {
      res.status(403).json({ success: false, message: "Access denied. Batch does not belong to your institute." });
      return;
    }

    const allowed = ["name", "exam", "description", "max_students", "max_teachers", "starts_at", "ends_at", "target_year", "entry_class_level"];
    const updates: Record<string, any> = {};
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    if (Object.keys(updates).length === 0) { res.status(400).json({ success: false, message: "No valid fields" }); return; }

    if (updates.starts_at && updates.ends_at && new Date(updates.ends_at).getTime() <= new Date(updates.starts_at).getTime()) {
      res.status(400).json({ success: false, message: "Batch expiry must be after its start date." }); return;
    }

    const { data: batch, error } = await supabaseDB
      .from("batches").update(updates).eq("id", id).select().single();
    if (error || !batch) { res.status(error ? 500 : 404).json({ success: false, message: error?.message ?? "Batch not found" }); return; }
    res.status(200).json({ success: true, data: { batch } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/v1/batches/:id
 * [institute_admin] — Soft-deactivate a batch (sets is_active = false).
 */
export const deactivateBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!(await checkBatchTenant(id, req.user))) {
      res.status(403).json({ success: false, message: "Access denied. Batch does not belong to your institute." });
      return;
    }

    const { error } = await supabaseDB.from("batches").update({ is_active: false }).eq("id", id);
    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    res.status(200).json({ success: true, message: "Batch deactivated" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/batches/:id/students
 * [institute_admin] — Manually add a student to a batch.
 */
export const addStudentToBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!(await checkBatchTenant(id, req.user))) {
      res.status(403).json({ success: false, message: "Access denied. Batch does not belong to your institute." });
      return;
    }

    const { student_id } = req.body;
    if (!student_id) { res.status(400).json({ success: false, message: "student_id is required" }); return; }

    // Verify student belongs to caller's institute (SEC-1)
    const { data: studentUser, error: studentError } = await supabaseDB
      .from("users")
      .select("institute_id")
      .eq("id", student_id)
      .maybeSingle();

    if (studentError || !studentUser || studentUser.institute_id !== req.user!.institute_id) {
      res.status(403).json({ success: false, message: "Access denied. Student does not belong to your institute." });
      return;
    }

    // A student belongs to one batch at a time. Enrolling them here while they
    // are live in another batch is refused rather than resolved, because the
    // two things the admin could have meant — a move, or a misclick — are not
    // distinguishable from the request. The caller confirms and retries with
    // move=true. See lib/batch-enrolment.ts.
    const conflict = await findConflictingEnrolment(student_id, id);
    if (conflict && req.body.move !== true) {
      res.status(409).json({
        success: false,
        code: "ALREADY_ENROLLED",
        message: `This student is already in ${conflict.batch_name}. Move them instead?`,
        data: { current_batch: conflict },
      });
      return;
    }

    // ignoreDuplicates would silently no-op for a student who previously left,
    // leaving them marked as departed after being re-added. Clearing left_at is
    // what "add to batch" has to mean for a returning student.
    const { movedFrom, error } = await enrolExclusively(student_id, id);
    if (error) { res.status(500).json({ success: false, message: error }); return; }
    await syncExamTargetToBatch([student_id], id);
    res.status(201).json({
      success: true,
      message: movedFrom ? `Student moved from ${movedFrom.batch_name}.` : "Student added to batch",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/v1/batches/:id/students/:student_id
 * [institute_admin] — Remove a student from a batch.
 */
export const removeStudentFromBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, student_id } = req.params;

    if (!(await checkBatchTenant(id, req.user))) {
      res.status(403).json({ success: false, message: "Access denied. Batch does not belong to your institute." });
      return;
    }

    // Recorded, not deleted. A cohort batch runs for two years and a few
    // students leave partway; deleting the row stopped the billing but also
    // destroyed the evidence they were ever enrolled, so no past period could
    // be reconstructed. left_at both stops the billing and keeps the history.
    const { error } = await supabaseDB
      .from("batch_students")
      .update({ left_at: new Date().toISOString() })
      .eq("batch_id", id)
      .eq("student_id", student_id)
      .is("left_at", null);
    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    res.status(200).json({ success: true, message: "Student marked as left. Their records remain in the batch." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/batches/:id/teachers
 * [institute_admin] — Assign a teacher to a batch.
 */
export const addTeacherToBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!(await checkBatchTenant(id, req.user))) {
      res.status(403).json({ success: false, message: "Access denied. Batch does not belong to your institute." });
      return;
    }

    const { teacher_id } = req.body;
    if (!teacher_id) { res.status(400).json({ success: false, message: "teacher_id is required" }); return; }

    // Verify teacher belongs to caller's institute (SEC-1)
    const { data: teacherUser, error: teacherError } = await supabaseDB
      .from("users")
      .select("institute_id")
      .eq("id", teacher_id)
      .maybeSingle();

    if (teacherError || !teacherUser || teacherUser.institute_id !== req.user!.institute_id) {
      res.status(403).json({ success: false, message: "Access denied. Teacher does not belong to your institute." });
      return;
    }

    const { error } = await supabaseDB
      .from("batch_teachers").upsert({ batch_id: id, teacher_id }, { onConflict: "batch_id,teacher_id", ignoreDuplicates: true });
    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    res.status(201).json({ success: true, message: "Teacher added to batch" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Remove an assignment without deleting the teacher account or past data. */
export const removeTeacherFromBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, teacher_id } = req.params;
    if (!(await checkBatchTenant(id, req.user))) {
      res.status(403).json({ success: false, message: "Access denied. Batch does not belong to your institute." }); return;
    }
    const { error } = await supabaseDB.from("batch_teachers").delete().eq("batch_id", id).eq("teacher_id", teacher_id);
    if (error) throw error;
    res.status(200).json({ success: true, message: "Teacher removed from batch" });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
};

// invite-based joins are fully decommissioned
// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/institutes/by-slug/:slug
 * PUBLIC — no authentication required.
 * Returns only public branding data for the given subdomain slug.
 * Used by the frontend TenantContext on initial load.
 */
export const getInstituteBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    if (!slug) {
      res.status(400).json({ success: false, message: "slug is required" });
      return;
    }

    const { data, error } = await supabaseDB
      .from("institutes")
      .select("id, name, logo_url, primary_color, subdomain_slug")
      .eq("subdomain_slug", slug.toLowerCase().trim())
      .eq("is_active", true)
      .single();

    if (error || !data) {
      res.status(404).json({ success: false, message: "Institute not found" });
      return;
    }

    res.status(200).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/institutes/public/:domain
 * PUBLIC — no authentication required.
 * Resolves a subdomain or custom domain to an institute's branding config.
 */
export const getPublicConfigByDomain = async (req: Request, res: Response): Promise<void> => {
  try {
    const { domain } = req.params;
    if (!domain) {
      res.status(400).json({ success: false, message: "Domain is required" });
      return;
    }

    const normalizedDomain = String(domain).trim().toLowerCase();
    if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalizedDomain)) {
      res.status(400).json({ success: false, message: "Invalid domain" });
      return;
    }

    let { data: settings, error } = await supabaseDB
      .from("institute_settings")
      .select("*, institutes(name, is_active)")
      .eq("subdomain", normalizedDomain)
      .maybeSingle();

    if (!settings && !error) {
      ({ data: settings, error } = await supabaseDB
        .from("institute_settings")
        .select("*, institutes(name, is_active)")
        .eq("custom_domain", normalizedDomain)
        .maybeSingle());
    }

    if (error || !settings) {
      res.status(404).json({ success: false, message: "Institute not found for this domain" });
      return;
    }

    if (!settings.institutes?.is_active) {
      res.status(403).json({ success: false, message: "Institute account is inactive" });
      return;
    }

    res.status(200).json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Phase 3: Settings & Subscription ────────────────────────────────────────

/**
 * GET /api/v1/institutes/me/settings
 * [institute_admin] — Get white-labeling settings
 */
export const getInstituteSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    // Get institute id first
    const { data: user, error: userErr } = await supabaseDB.from("users").select("institute_id").eq("id", userId).single();
    if (userErr || !user) { res.status(404).json({ success: false, message: "User not found" }); return; }

    let { data: settings, error } = await supabaseDB.from("institute_settings").select("*").eq("institute_id", user.institute_id).single();
    
    // Auto-create if not exists
    if (!settings && error?.code === 'PGRST116') {
      const { data: newSettings, error: insertErr } = await supabaseDB
        .from("institute_settings")
        .insert({ institute_id: user.institute_id })
        .select()
        .single();
      if (insertErr) { res.status(500).json({ success: false, message: insertErr.message }); return; }
      settings = newSettings;
    } else if (error) {
      res.status(500).json({ success: false, message: error.message }); return;
    }

    res.status(200).json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/v1/institutes/me/settings
 * [institute_admin] — Update white-labeling settings
 */
export const updateInstituteSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { data: user } = await supabaseDB.from("users").select("institute_id").eq("id", userId).single();
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }

    const allowed = ["subdomain", "custom_domain", "theme_primary_color", "theme_logo_url", "theme_favicon_url", "support_email"];
    const updates: Record<string, any> = {};
    for (const k of allowed) {
      if (req.body[k] === undefined) continue;
      // The settings form submits every field it holds, so untouched inputs
      // arrive as "". Storing that instead of NULL is what made logos vanish:
      // the clients fall back with ?? , which treats "" as a real value and
      // renders a zero-width broken image. Creation already did this (see
      // institutes.service.ts `logoUrl || null`); the update path did not.
      const value = typeof req.body[k] === "string" ? req.body[k].trim() : req.body[k];
      updates[k] = value === "" ? null : value;
    }

    if (Object.keys(updates).length === 0) { res.status(400).json({ success: false, message: "No valid fields to update" }); return; }
    updates.updated_at = new Date().toISOString();

    const { data: settings, error } = await supabaseDB
      .from("institute_settings")
      .update(updates)
      .eq("institute_id", user.institute_id)
      .select()
      .single();

    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    res.status(200).json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/institutes/me/subscription
 * [institute_admin] — Get trial/subscription status
 */
export const getInstituteSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { data: user } = await supabaseDB.from("users").select("institute_id").eq("id", userId).single();
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }

    let { data: sub, error } = await supabaseDB.from("institute_subscriptions").select("*").eq("institute_id", user.institute_id).single();

    // Auto-create trial if not exists
    if (!sub && error?.code === 'PGRST116') {
      res.status(404).json({ success: false, message: "No subscription entitlement exists for this institute." });
      return;
    } else if (error) {
      res.status(500).json({ success: false, message: error.message }); return;
    }

    // The stored row holds the rate; what the institute owes depends on how
    // many students they are currently teaching, so it is computed rather than
    // stored — a cached total would drift the moment anyone enrolled.
    //
    // Deliberately the same rollup the CRM reads, not a separate query here:
    // an institute checking its own bill must see the number it will be
    // invoiced for, including the batch-expiry rule that decides it.
    const studentCounts = await getStudentCountsByInstitute();
    const students = studentCounts[user.institute_id] ?? 0;
    res.status(200).json({
      success: true,
      data: {
        ...sub,
        student_count: students,
        annual_value_paise: annualValuePaise(sub, students),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/batches/:id/students/move
 * Body: { student_ids: string[], target_batch_id: string }
 *
 * [institute_admin] — Move students from one batch to another.
 *
 * Sections change, and a class 12 student who does not clear the exam joins
 * the droppers. Without this the only route was to remove and re-import, which
 * used to destroy the enrolment record and always loses the join date.
 *
 * The move is a departure from one batch and an enrolment in the other, so the
 * student's history reads as a continuous line rather than starting afresh.
 */
export const moveStudentsBetweenBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { student_ids, target_batch_id } = req.body ?? {};

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      res.status(400).json({ success: false, message: "student_ids must be a non-empty array" });
      return;
    }
    if (!target_batch_id) {
      res.status(400).json({ success: false, message: "target_batch_id is required" });
      return;
    }
    if (target_batch_id === id) {
      res.status(400).json({ success: false, message: "Source and destination batch are the same" });
      return;
    }

    // Both batches must belong to the caller's institute. Checking only the
    // source would let an admin push their students into another tenant's
    // batch, which is a cross-tenant write dressed up as a move.
    if (!(await checkBatchTenant(id, req.user)) || !(await checkBatchTenant(target_batch_id, req.user))) {
      res.status(403).json({ success: false, message: "Access denied. Both batches must belong to your institute." });
      return;
    }

    const { data: destination } = await supabaseDB
      .from("batches")
      .select("id, is_active, ends_at")
      .eq("id", target_batch_id)
      .maybeSingle();
    if (!destination) {
      res.status(404).json({ success: false, message: "Destination batch not found" });
      return;
    }
    // Moving students into a batch that has already expired would leave them
    // with no access at all, which is never what the admin meant.
    if (!destination.is_active || (destination.ends_at && Date.parse(destination.ends_at) <= Date.now())) {
      res.status(400).json({ success: false, message: "Destination batch has expired. Choose an active batch." });
      return;
    }

    const now = new Date().toISOString();

    // Every active enrolment except the destination ends, not just the source.
    // Restricting this to the source batch was correct only while a student
    // could hold one enrolment anyway; for anyone left holding two by the old
    // write paths, moving them would otherwise leave the second one live and
    // collide with the one-active-batch index.
    const { error: leaveErr } = await supabaseDB
      .from("batch_students")
      .update({ left_at: now })
      .neq("batch_id", target_batch_id)
      .in("student_id", student_ids)
      .is("left_at", null);
    if (leaveErr) { res.status(500).json({ success: false, message: leaveErr.message }); return; }

    // left_at is cleared explicitly so a student returning to a batch they
    // once left is enrolled again rather than staying marked as departed.
    const { error: joinErr } = await supabaseDB
      .from("batch_students")
      .upsert(
        student_ids.map((student_id: string) => ({ batch_id: target_batch_id, student_id, left_at: null })),
        { onConflict: "batch_id,student_id" },
      );
    if (joinErr) { res.status(500).json({ success: false, message: joinErr.message }); return; }

    await syncExamTargetToBatch(student_ids, target_batch_id);

    res.status(200).json({
      success: true,
      message: `Moved ${student_ids.length} student${student_ids.length === 1 ? "" : "s"}.`,
      data: { moved: student_ids.length },
    });
  } catch (err: any) {
    console.error("[moveStudentsBetweenBatches error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/v1/institutes/:id/branding
 * [super_admin] — Set an institute's logo and brand colour.
 *
 * Branding is applied on the institute's behalf rather than self-served: they
 * send us a logo, we place it. The institute's own settings page can still
 * edit these, but this is the path that matters, and it is the only one that
 * can reach an institute other than the caller's own.
 */
export const updateInstituteBranding = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { theme_primary_color, theme_logo_url } = req.body ?? {};
    const updates: Record<string, any> = {};

    if (theme_primary_color !== undefined) {
      const color = String(theme_primary_color ?? "").trim();
      // Anything not a hex colour would land in a stylesheet verbatim, so it is
      // rejected here rather than quietly breaking every page for that tenant.
      if (color && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
        res.status(400).json({ success: false, message: "theme_primary_color must be a hex colour such as #4F46E5" });
        return;
      }
      updates.theme_primary_color = color || null;
    }

    if (theme_logo_url !== undefined) {
      const url = String(theme_logo_url ?? "").trim();
      // "" is not a logo — storing it makes every consumer render a broken
      // image, since they fall back with ?? rather than ||.
      updates.theme_logo_url = url || null;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: "No valid fields to update" });
      return;
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseDB
      .from("institute_settings")
      .update(updates)
      .eq("institute_id", id)
      .select("theme_primary_color, theme_logo_url")
      .maybeSingle();

    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    if (!data) { res.status(404).json({ success: false, message: "No settings row exists for this institute." }); return; }

    // institutes.logo_url is a second copy read by parts of the CRM; keep the
    // two from disagreeing about what this institute's logo is.
    if (updates.theme_logo_url !== undefined) {
      await supabaseDB.from("institutes").update({ logo_url: updates.theme_logo_url }).eq("id", id);
    }

    await logAdminAction(req.user?.id, "Institute branding updated", `Updated branding for institute ${id}.`, "institutes", "success");
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error("[updateInstituteBranding error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/v1/institutes/:id/subscription
 * [super_admin] — Set an institute's commercial terms.
 *
 * Separate from PATCH /:id because this is the only place money is decided,
 * and institute admins can reach that route. Pricing must never be editable by
 * the party being billed.
 */
export const updateInstituteSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, billing_mode, price_per_student_paise, flat_annual_paise, trial_ends_at } = req.body ?? {};

    const updates: Record<string, any> = {};

    if (status !== undefined) {
      if (!SUBSCRIPTION_STATUSES.includes(status)) {
        res.status(400).json({ success: false, message: `status must be one of: ${SUBSCRIPTION_STATUSES.join(", ")}` });
        return;
      }
      updates.status = status;
    }

    if (billing_mode !== undefined) {
      if (billing_mode !== "per_student" && billing_mode !== "flat") {
        res.status(400).json({ success: false, message: "billing_mode must be 'per_student' or 'flat'" });
        return;
      }
      updates.billing_mode = billing_mode;
    }

    // Rates arrive in paise as integers. Rejecting anything else here keeps
    // rupee-denominated floats from silently becoming a ₹590 charge of ₹5.90.
    for (const [key, value] of [
      ["price_per_student_paise", price_per_student_paise],
      ["flat_annual_paise", flat_annual_paise],
    ] as const) {
      if (value === undefined) continue;
      if (value === null) { updates[key] = null; continue; }
      if (!Number.isInteger(value) || value < 0) {
        res.status(400).json({ success: false, message: `${key} must be a non-negative integer in paise` });
        return;
      }
      updates[key] = value;
    }

    if (trial_ends_at !== undefined) updates.trial_ends_at = trial_ends_at || null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: "No valid fields to update" });
      return;
    }

    // A flat deal with no number is the one combination the DB constraint
    // rejects; catching it here returns something the UI can show.
    const { data: existing } = await supabaseDB
      .from("institute_subscriptions")
      .select("billing_mode, flat_annual_paise")
      .eq("institute_id", id)
      .maybeSingle();
    const nextMode = updates.billing_mode ?? existing?.billing_mode;
    const nextFlat = updates.flat_annual_paise !== undefined ? updates.flat_annual_paise : existing?.flat_annual_paise;
    if (nextMode === "flat" && (nextFlat === null || nextFlat === undefined)) {
      res.status(400).json({ success: false, message: "A flat-billed institute needs flat_annual_paise" });
      return;
    }

    updates.updated_at = new Date().toISOString();

    const { data: sub, error } = await supabaseDB
      .from("institute_subscriptions")
      .update(updates)
      .eq("institute_id", id)
      .select()
      .single();

    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    if (!sub) { res.status(404).json({ success: false, message: "No subscription exists for this institute." }); return; }

    // is_active gates sign-in, so a cancelled subscription has to switch it off
    // or a non-paying institute keeps full access.
    if (updates.status) {
      await supabaseDB
        .from("institutes")
        .update({ is_active: updates.status !== "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    res.status(200).json({ success: true, data: sub });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Exam Calendar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/batches/exam-calendar
 * Public — returns all exam calendar rows ordered by suggested_ends_at.
 * Used by the batch create form to pre-fill suggested expiry date.
 */
export const getExamCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseDB
      .from("exam_calendar")
      .select("exam_code, exam_label, suggested_ends_at, notes")
      .order("suggested_ends_at", { ascending: true });
    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    res.status(200).json({ success: true, data: { calendar: data ?? [] } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/v1/batches/exam-calendar/:exam_code
 * [super_admin] — Update suggested_ends_at and/or notes for an exam.
 * Used when exams get postponed.
 */
export const updateExamCalendarEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { exam_code } = req.params;
    const { suggested_ends_at, notes } = req.body ?? {};
    if (!suggested_ends_at) {
      res.status(400).json({ success: false, message: "suggested_ends_at is required." }); return;
    }
    const { data, error } = await supabaseDB
      .from("exam_calendar")
      .update({ suggested_ends_at, notes: notes ?? null, updated_by: req.user!.id, updated_at: new Date().toISOString() })
      .eq("exam_code", exam_code)
      .select()
      .single();
    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    if (!data) { res.status(404).json({ success: false, message: "Exam not found in calendar." }); return; }
    res.status(200).json({ success: true, data: { entry: data } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
