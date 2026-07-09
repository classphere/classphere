import { Request, Response } from "express";
import { provisionInstitute } from "./institutes.service";
import { supabaseAdmin } from "../../lib/supabase";

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
    // TODO: implement
    // 1. SELECT * FROM institutes WHERE owner_id = req.user!.id AND is_active = true
    // 2. If not found: 404
    // 3. Return { success: true, data: { institute } }
    res.status(200).json({ success: true, message: "getMyInstitute — TODO: implement" });
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
    // TODO: implement
    // 1. Verify institute belongs to req.user!.id (owner_id = req.user!.id)
    // 2. Validate req.body (allow: name, metadata — disallow: subscription_plan, max_students by non-super_admin)
    // 3. UPDATE institutes SET ...fields WHERE id = $id AND owner_id = req.user!.id RETURNING *
    // 4. Return { success: true, data: { institute } }
    res.status(200).json({ success: true, message: "updateInstitute — TODO: implement", id });
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
    // TODO: implement
    // 1. Verify institute belongs to req.user!.id
    // 2. Aggregate:
    //    a. Total students: COUNT(*) FROM batch_students bs JOIN batches b ON b.id = bs.batch_id WHERE b.institute_id = $id
    //    b. Total batches: COUNT(*) FROM batches WHERE institute_id = $id AND is_active = true
    //    c. Tests this month: COUNT(*) FROM tests t JOIN test_batch_assignments tba ON tba.test_id = t.id
    //         JOIN batches b ON b.id = tba.batch_id WHERE b.institute_id = $id AND t.created_at >= date_trunc('month', now())
    //    d. Average student score this month: similar join + avg(a.score)
    // 3. Return { success: true, data: { stats: { total_students, total_batches, tests_this_month, avg_score } } }
    res.status(200).json({ success: true, message: "getInstituteStats — TODO: implement", id });
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
    const { data: institute, error: instErr } = await supabaseAdmin
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
    const { data: batch, error: batchErr } = await supabaseAdmin
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
      const { data: institute, error: instErr } = await supabaseAdmin
        .from("institutes")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_active", true)
        .single();

      if (instErr || !institute) {
        res.status(404).json({ success: false, message: "No active institute found for this admin" });
        return;
      }

      const { data: batches, error: batchErr } = await supabaseAdmin
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
      const { data: rows, error } = await supabaseAdmin
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
    // TODO: implement
    // 1. SELECT * FROM batches WHERE id = $id AND is_active = true
    // 2. If not found: 404
    // 3. Verify access: user is teacher in batch, institute_admin of batch's institute, or super_admin
    // 4. Fetch students: SELECT u.id, u.name, u.email, bs.joined_at FROM users u
    //      JOIN batch_students bs ON bs.student_id = u.id WHERE bs.batch_id = $id
    // 5. Fetch teachers: similar with batch_teachers
    // 6. Return { success: true, data: { batch, students, teachers } }
    res.status(200).json({ success: true, message: "getBatch — TODO: implement", id });
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
    // TODO: implement
    // 1. Verify batch belongs to institute owned by req.user!.id
    // 2. Validate req.body: allow name, description, start_date, end_date
    // 3. UPDATE batches SET ...fields WHERE id = $id RETURNING *
    // 4. Return { success: true, data: { batch } }
    res.status(200).json({ success: true, message: "updateBatch — TODO: implement", id });
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
    // TODO: implement
    // SOFT DELETE — do NOT hard delete
    // 1. Verify batch belongs to institute owned by req.user!.id
    // 2. UPDATE batches SET is_active = false WHERE id = $id
    // 3. Return { success: true, message: "Batch deactivated" }
    res.status(200).json({ success: true, message: "deactivateBatch (soft) — TODO: implement", id });
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
    // TODO: implement
    // 1. Validate req.body: { student_id: string }
    // 2. Verify batch belongs to institute owned by req.user!.id
    // 3. Verify student exists and has role 'student'
    // 4. Check max_students not exceeded
    // 5. INSERT INTO batch_students (batch_id, student_id) ON CONFLICT DO NOTHING
    // 6. Return { success: true, message: "Student added to batch" } with 201
    res.status(201).json({ success: true, message: "addStudentToBatch — TODO: implement", batch_id: id });
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
    // TODO: implement
    // 1. Verify batch belongs to institute owned by req.user!.id
    // 2. DELETE FROM batch_students WHERE batch_id = $id AND student_id = $student_id
    // 3. Return { success: true, message: "Student removed from batch" }
    res.status(200).json({ success: true, message: "removeStudentFromBatch — TODO: implement", batch_id: id, student_id });
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
    // TODO: implement
    // 1. Validate req.body: { teacher_id: string }
    // 2. Verify batch belongs to institute owned by req.user!.id
    // 3. Verify teacher exists and has role 'teacher'
    // 4. INSERT INTO batch_teachers (batch_id, teacher_id) ON CONFLICT DO NOTHING
    // 5. Return { success: true, message: "Teacher added to batch" } with 201
    res.status(201).json({ success: true, message: "addTeacherToBatch — TODO: implement", batch_id: id });
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
    // TODO: implement
    // 1. Verify batch belongs to institute owned by req.user!.id
    // 2. Validate req.body: { max_uses?: number, expires_in_days?: number }
    // 3. Generate a unique invite code using invite.service.generateCode()
    //    — Format: "INST-BATCHNAME-XXXX" (uppercase, readable)
    // 4. INSERT INTO batch_invites (batch_id, code, created_by, max_uses, expires_at) RETURNING *
    // 5. Build the invite URL: `${process.env.FRONTEND_URL}/invite/${code}`
    // 6. Return { success: true, data: { invite: { code, url, expires_at, max_uses } } } with 201
    res.status(201).json({ success: true, message: "generateBatchInvite — TODO: implement", batch_id: id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
