import { Request, Response } from "express";
import { provisionInstitute } from "./institutes.service";
import { supabaseAdmin, supabaseDB } from "../../lib/supabase";

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
    const { name, adminEmail, adminUsername, type, price, isFreeTrial, trialMonths, logoUrl } = req.body;

    if (!name || !adminEmail || !adminUsername || !type || price === undefined) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: name, adminEmail, adminUsername, type, price",
      });
      return;
    }

    const result = await provisionInstitute({ name, adminEmail, adminUsername, type, price, isFreeTrial, trialMonths, logoUrl });
    const { tempPassword, ...institute } = result;

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
    const { data: institute, error } = await supabaseDB
      .from("institutes")
      .select("id, name, plan, logo_url, primary_color, subdomain_slug, is_active, created_at")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    if (!institute) { res.status(404).json({ success: false, message: "No institute found" }); return; }

    // Fetch recent students for this institute
    const { data: recentStudents } = await supabaseDB
      .from("users")
      .select("id, name, email, phone, role, created_at")
      .eq("institute_id", institute.id)
      .eq("role", "student")
      .order("created_at", { ascending: false })
      .limit(5);

    // Map DB schema to UI expectations
    const mappedInstitute = {
      ...institute,
      subscription_plan: institute.plan,
      type: "hybrid",
      max_students: 1000 // default dummy since no column exists
    };

    res.status(200).json({ success: true, data: { institute: mappedInstitute, recentStudents: recentStudents || [] } });
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

    const allowed = isSuperAdmin
      ? ["name", "logo_url", "primary_color", "plan", "is_active"]
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

    // Fetch all active batches for this institute
    const { data: batches } = await supabaseDB
      .from("batches").select("id, name, exam").eq("institute_id", id).eq("is_active", true);

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
    const { data: instituteUsers } = await supabaseDB.from("users").select("id").eq("institute_id", id).eq("role", "student");
    const studentIds = (instituteUsers ?? []).map(u => u.id);
    
    let studentStats: any[] = [];
    if (studentIds.length > 0) {
      const { data: stats } = await supabaseDB
        .from("student_stats")
        .select("student_id, accuracy_pct, total_tests, users!inner(name)")
        .in("student_id", studentIds)
        .order("accuracy_pct", { ascending: false });
      studentStats = stats ?? [];
    }

    const topStudents = studentStats.slice(0, 5).map(s => ({
      name: s.users?.name,
      accuracy: s.accuracy_pct,
      tests: s.total_tests
    }));
    
    const bottomStudents = studentStats.slice().reverse().slice(0, 5).map(s => ({
      name: s.users?.name,
      accuracy: s.accuracy_pct,
      tests: s.total_tests
    }));

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

    res.status(200).json({
      success: true,
      data: {
        trendData,
        masteryData,
        topStudents,
        bottomStudents,
        batchLeaderboard,
      }
    });

  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Batch Handlers ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/batches
 * [institute_admin] — Create a new batch within the admin's institute.
 */
export const createBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, exam, max_students, max_teachers } = req.body;

    if (!name || !exam) {
      res.status(400).json({ success: false, message: "name and exam are required" });
      return;
    }

    // ── 1. Find the institute owned by this admin ────────────────────────────
    const { data: institute, error: instErr } = await supabaseDB
      .from("institutes")
      .select("id")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .single();

    if (instErr || !institute) {
      res.status(404).json({ success: false, message: "No active institute found for this admin" });
      return;
    }

    // ── 2. Insert the batch ──────────────────────────────────────────────────
    const { data: batch, error: batchErr } = await supabaseDB
      .from("batches")
      .insert({
        institute_id: institute.id,
        name: name.trim(),
        exam: exam.trim(),
        max_students: max_students ? Number(max_students) : null,
        max_teachers: max_teachers ? Number(max_teachers) : null,
        is_active: true,
      })
      .select()
      .single();

    if (batchErr || !batch) {
      console.error("[createBatch] DB error:", batchErr);
      res.status(500).json({ success: false, message: batchErr?.message ?? "Failed to create batch" });
      return;
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

    if (role === "institute_admin") {
      // ── Find institute owned by this admin ─────────────────────────────────
      const { data: institute, error: instErr } = await supabaseDB
        .from("institutes")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .single();

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

    const allowed = ["name", "exam", "description", "max_students", "max_teachers"];
    const updates: Record<string, any> = {};
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    if (Object.keys(updates).length === 0) { res.status(400).json({ success: false, message: "No valid fields" }); return; }

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

    const { data: settings, error } = await supabaseDB
      .from("institute_settings")
      .select("*, institutes(name, is_active)")
      .or(`subdomain.eq.${domain},custom_domain.eq.${domain}`)
      .single();

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
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }

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
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 2); // 2 months trial
      
      const { data: newSub, error: insertErr } = await supabaseDB
        .from("institute_subscriptions")
        .insert({ 
          institute_id: user.institute_id,
          plan_tier: "trial",
          status: "trialing",
          current_period_start: start.toISOString(),
          current_period_end: end.toISOString()
        })
        .select()
        .single();
      if (insertErr) { res.status(500).json({ success: false, message: insertErr.message }); return; }
      sub = newSub;
    } else if (error) {
      res.status(500).json({ success: false, message: error.message }); return;
    }

    res.status(200).json({ success: true, data: sub });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
