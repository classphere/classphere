import { Request, Response } from "express";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function sbSelect(table: string, query: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      "apikey":        SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase select failed: ${await res.text()}`);
  return res.json();
}

async function sbPost(table: string, rows: any[], prefer = "return=representation") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer":        prefer,
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase ${table} insert failed (${res.status}): ${await res.text()}`);
  if (prefer.includes("return=representation")) return res.json();
  return null;
}

async function sbPatch(table: string, query: string, updates: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Supabase ${table} update failed: ${await res.text()}`);
}

// ─── Institute Handlers ─────────────────────────────────────────────────────

/**
 * POST /api/v1/institutes
 * [super_admin only] — Create a new institute and assign an admin user.
 */
export const createInstitute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, adminEmail, type, price } = req.body;
    
    if (!name || !adminEmail || !type || price === undefined) {
      res.status(400).json({ success: false, message: "Missing required fields (name, adminEmail, type, price)" });
      return;
    }

    // 1. Verify adminEmail user exists
    const users = await sbSelect("users", `email=eq.${encodeURIComponent(adminEmail)}&select=id,role`);
    if (!users || users.length === 0) {
      res.status(404).json({ success: false, message: `No user found with email ${adminEmail}. They must sign up first.` });
      return;
    }
    const owner = users[0];

    // 2. Check if they already own an active institute
    const existingInst = await sbSelect("institutes", `owner_id=eq.${owner.id}&is_active=eq.true`);
    if (existingInst && existingInst.length > 0) {
      res.status(400).json({ success: false, message: "User is already an active institute admin." });
      return;
    }

    // 3. INSERT INTO institutes
    const newInsts = await sbPost("institutes", [{
      name,
      owner_id: owner.id,
      institute_type: type,
      price_per_student: price,
      subscription_plan: 'trial'
    }]);

    if (!newInsts || newInsts.length === 0) {
      throw new Error("Failed to insert institute record.");
    }
    const institute = newInsts[0];

    // 4. UPDATE users SET role = 'institute_admin'
    if (owner.role !== 'institute_admin' && owner.role !== 'super_admin') {
      await sbPatch("users", `id=eq.${owner.id}`, { role: 'institute_admin' });
    }

    res.status(201).json({ success: true, message: "Institute provisioned successfully", data: institute });
  } catch (err: any) {
    console.error("[createInstitute error]", err);
    res.status(500).json({ success: false, message: err.message });
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
    // TODO: implement
    // 1. Validate req.body: { name, exam_id, description?, start_date?, end_date? }
    // 2. Fetch institute by owner_id = req.user!.id; verify max_batches not exceeded
    // 3. INSERT INTO batches (institute_id, name, exam_id, description, start_date, end_date) RETURNING *
    // 4. Return { success: true, data: { batch } } with 201
    res.status(201).json({ success: true, message: "createBatch — TODO: implement" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/batches
 * [institute_admin / teacher] — List all batches in the institute.
 */
export const listBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // For institute_admin:
    //   SELECT b.*, COUNT(bs.student_id) AS student_count
    //     FROM batches b LEFT JOIN batch_students bs ON bs.batch_id = b.id
    //   WHERE b.institute_id = (SELECT id FROM institutes WHERE owner_id = req.user!.id)
    //     AND b.is_active = true
    //   GROUP BY b.id ORDER BY b.created_at DESC
    //
    // For teacher:
    //   SELECT b.* FROM batches b
    //     JOIN batch_teachers bt ON bt.batch_id = b.id
    //   WHERE bt.teacher_id = req.user!.id AND b.is_active = true
    //
    // Return { success: true, data: { batches } }
    res.status(200).json({ success: true, message: "listBatches — TODO: implement" });
  } catch (err: any) {
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
