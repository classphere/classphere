import { Request, Response } from "express";
import { provisionInstitute } from "./institutes.service";
import { supabaseAdmin, supabaseDB } from "../../lib/supabase";

// ─── Institute Handlers ─────────────────────────────────────────────────────

/**
 * POST /api/v1/institutes
 * [super_admin only] — Create a new institute and assign an admin user.
 * Delegates all DB work to institutes.service.ts per ARCHITECTURE_V2 §4.1.
 */
export const createInstitute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, adminEmail, adminUsername, type, price } = req.body;

    if (!name || !adminEmail || !adminUsername || !type || price === undefined) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: name, adminEmail, adminUsername, type, price",
      });
      return;
    }

    const result = await provisionInstitute({ name, adminEmail, adminUsername, type, price });
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
      .select("id, name, type, logo_url, primary_color, subdomain_slug, subscription_plan, max_students, is_active, created_at")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    if (!institute) { res.status(404).json({ success: false, message: "No institute found" }); return; }

    res.status(200).json({ success: true, data: { institute } });
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
    const allowed = ["name", "logo_url", "primary_color"];
    const updates: Record<string, any> = {};
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    if (Object.keys(updates).length === 0) { res.status(400).json({ success: false, message: "No valid fields to update" }); return; }

    const { data: institute, error } = await supabaseDB
      .from("institutes").update(updates).eq("id", id).eq("owner_id", userId).select().single();

    if (error || !institute) { res.status(error ? 500 : 404).json({ success: false, message: error?.message ?? "Institute not found" }); return; }
    res.status(200).json({ success: true, data: { institute } });
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
    const { student_id } = req.body;
    if (!student_id) { res.status(400).json({ success: false, message: "student_id is required" }); return; }

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
    const { teacher_id } = req.body;
    if (!teacher_id) { res.status(400).json({ success: false, message: "teacher_id is required" }); return; }

    const { error } = await supabaseDB
      .from("batch_teachers").upsert({ batch_id: id, teacher_id }, { onConflict: "batch_id,teacher_id", ignoreDuplicates: true });
    if (error) { res.status(500).json({ success: false, message: error.message }); return; }
    res.status(201).json({ success: true, message: "Teacher added to batch" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/batches/:id/invite
 * [institute_admin] — Generate a new invite code/link for a batch.
 */
export const generateBatchInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { max_uses = 100, expires_in_days = 30 } = req.body;

    // Generate a short unique code
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const expires_at = new Date(Date.now() + expires_in_days * 86400000).toISOString();
    const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

    const { data: invite, error } = await supabaseDB
      .from("batch_invites").insert({ batch_id: id, code, created_by: req.user!.id, max_uses, expires_at }).select().single();
    if (error) { res.status(500).json({ success: false, message: error.message }); return; }

    res.status(201).json({ success: true, data: { invite: { code, url: `${APP_URL}/invite/${code}`, expires_at, max_uses } } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};


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
