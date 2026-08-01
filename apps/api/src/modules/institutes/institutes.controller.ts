import { Request, Response } from "express";
import { annualValuePaise, provisionInstitute } from "./institutes.service";
import { supabaseAdmin, supabaseDB } from "../../lib/supabase";
import { logAdminAction } from "../../lib/admin-audit";
import { getOrSetCache } from "../../lib/cache";

/** Lifecycle values institute_subscriptions.status accepts (see migration 10). */
const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "cancelled"];

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

    const attemptsByPaper = new Map<string, number[]>();
    const attemptsByStudent = new Map<string, Array<{ paper_id: string; percentage: number; submitted_at: string | null }>>();
    for (const attempt of submittedAttempts ?? []) {
      const maxScore = Number((attempt as any).max_score);
      if (!Number.isFinite(maxScore) || maxScore <= 0) continue;
      const percentage = Math.max(0, Math.min(100, (Number((attempt as any).score ?? 0) / maxScore) * 100));
      const paperId = String((attempt as any).paper_id ?? "");
      if (!paperId) continue;
      attemptsByPaper.set(paperId, [...(attemptsByPaper.get(paperId) ?? []), percentage]);
      const studentId = String((attempt as any).student_id);
      attemptsByStudent.set(studentId, [...(attemptsByStudent.get(studentId) ?? []), {
        paper_id: paperId,
        percentage,
        submitted_at: (attempt as any).submitted_at ?? null,
      }]);
    }

    const topPerformers = [...attemptsByStudent.entries()]
      .filter(([, attempts]) => attempts.length >= 3)
      .map(([studentId, attempts]) => {
        const ordered = [...attempts].sort((a, b) =>
          new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime()
        ).slice(0, 8);
        const weighted = ordered.reduce((sum, attempt, index) => {
          const weight = 1 + ((ordered.length - index - 1) * 0.12);
          const peerScores = [...(attemptsByPaper.get(attempt.paper_id) ?? [])].sort((a, b) => b - a);
          const higherOrEqual = peerScores.filter((score) => score >= attempt.percentage).length;
          const percentile = peerScores.length > 1
            ? ((peerScores.length - higherOrEqual) / (peerScores.length - 1)) * 100
            : attempt.percentage;
          return {
            weight: sum.weight + weight,
            percentage: sum.percentage + (attempt.percentage * weight),
            percentile: sum.percentile + (percentile * weight),
          };
        }, { weight: 0, percentage: 0, percentile: 0 });
        const averagePercentage = weighted.percentage / weighted.weight;
        const averagePercentile = weighted.percentile / weighted.weight;
        const variance = ordered.reduce((sum, attempt) => sum + Math.pow(attempt.percentage - averagePercentage, 2), 0) / ordered.length;
        const consistency = Math.max(0, Math.min(100, 100 - Math.sqrt(variance) * 2));
        const recentAverage = ordered.slice(0, Math.min(3, ordered.length)).reduce((sum, attempt) => sum + attempt.percentage, 0) / Math.min(3, ordered.length);
        const previous = ordered.slice(3);
        const previousAverage = previous.length
          ? previous.reduce((sum, attempt) => sum + attempt.percentage, 0) / previous.length
          : recentAverage;
        const trend = Math.max(-15, Math.min(15, recentAverage - previousAverage));
        const performanceScore = (averagePercentile * 0.60) + (averagePercentage * 0.22) + (consistency * 0.12) + ((trend + 15) / 30 * 100 * 0.06);
        const student = studentById.get(studentId);
        return {
          id: studentId,
          name: student?.name ?? "Student",
          email: student?.email ?? null,
          tests_taken: attempts.length,
          average_percentage: Math.round(averagePercentage),
          consistency: Math.round(consistency),
          trend: Math.round(trend),
          performance_score: Math.round(performanceScore),
        };
      })
      .sort((a, b) => b.performance_score - a.performance_score || b.tests_taken - a.tests_taken)
      .slice(0, 5);

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
        .in("batch_id", batchIds);
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
    const { name, exam, starts_at, ends_at } = req.body;

    if (!name || !exam) {
      res.status(400).json({ success: false, message: "name and exam are required" });
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
        ends_at: (() => {
          if (ends_at) return ends_at;
          // Auto-fill from exam_calendar
          return null; // will be patched below after insert
        })(),
        is_active: true,
      })
      .select()
      .single();

    if (batchErr || !batch) {
      console.error("[createBatch] DB error:", batchErr);
      res.status(500).json({ success: false, message: batchErr?.message ?? "Failed to create batch" });
      return;
    }

    // Auto-fill ends_at from exam_calendar if not provided
    if (!ends_at && batch) {
      const { data: calRow } = await supabaseDB
        .from("exam_calendar")
        .select("suggested_ends_at")
        .eq("exam_code", exam.trim())
        .maybeSingle();
      if (calRow?.suggested_ends_at) {
        let suggestedDate = new Date(calRow.suggested_ends_at);
        // If the suggested date is in the past, push to next year
        if (suggestedDate < new Date()) {
          suggestedDate.setFullYear(suggestedDate.getFullYear() + 1);
        }
        await supabaseDB.from("batches").update({
          ends_at: suggestedDate.toISOString().split("T")[0]
        }).eq("id", batch.id);
        (batch as any).ends_at = suggestedDate.toISOString().split("T")[0];
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

      res.status(200).json({ success: true, data: { batches: batches ?? [] } });
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
      res.status(200).json({ success: true, data: { batches } });
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
    const { data: studentLinks } = await supabaseDB
      .from("batch_students").select("student_id, users(id, name, phone, date_of_birth)").eq("batch_id", id);
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

    const allowed = ["name", "exam", "description", "max_students", "max_teachers", "starts_at", "ends_at"];
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

    const { error } = await supabaseDB
      .from("batch_students").upsert({ batch_id: id, student_id }, { onConflict: "batch_id,student_id", ignoreDuplicates: true });
    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    res.status(201).json({ success: true, message: "Student added to batch" });
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

    const { error } = await supabaseDB
      .from("batch_students").delete().eq("batch_id", id).eq("student_id", student_id);
    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    res.status(200).json({ success: true, message: "Student removed from batch" });
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
    // many students they actually have, so it is computed rather than stored —
    // a cached total would drift the moment anyone enrolled.
    const { count: studentCount } = await supabaseDB
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("institute_id", user.institute_id)
      .eq("role", "student");

    const students = studentCount ?? 0;
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
