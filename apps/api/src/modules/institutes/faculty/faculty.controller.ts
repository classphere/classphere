import { Request, Response } from "express";
import { supabaseAdmin, supabaseDB } from "../../../lib/supabase";
import { sendFacultyInviteEmail } from "../../../lib/mailer";

// ─── Helper: resolve institute_id for the acting admin ────────────────────────
async function resolveInstituteId(userId: string, instituteIdFromToken: string | null): Promise<string | null> {
  if (instituteIdFromToken) return instituteIdFromToken;
  const { data: inst } = await supabaseDB
    .from("institutes")
    .select("id, name")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return inst?.id ?? null;
}

async function resolveInstituteName(instituteId: string): Promise<string> {
  const { data } = await supabaseDB.from("institutes").select("name").eq("id", instituteId).maybeSingle();
  return data?.name ?? "Your Institute";
}

/** Generates a strong temp password, e.g. "Teach#xK9m2pQ" */
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "Teach#";
  for (let i = 0; i < 8; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
  return pw;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/faculty
 * [institute_admin | super_admin] — List all faculty in the institute.
 */
export const listFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (role !== "institute_admin" && role !== "super_admin") {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const instituteId = await resolveInstituteId(userId!, req.user?.institute_id ?? null);
    if (!instituteId) {
      res.status(404).json({ success: false, message: "No active institute found for this admin" });
      return;
    }

    const { data: faculty, error: facErr } = await supabaseDB
      .from("faculty")
      .select("*")
      .eq("institute_id", instituteId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (facErr) {
      res.status(500).json({ success: false, message: facErr.message });
      return;
    }

    res.status(200).json({ success: true, data: { faculty: faculty ?? [] } });
  } catch (err: any) {
    console.error("[listFaculty error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/faculty
 * [institute_admin] — Provision a new faculty member:
 *   1. Validate batch belongs to this institute
 *   2. Check email not already registered
 *   3. Create Supabase auth user (teacher)
 *   4. Insert public.users row
 *   5. Insert faculty row
 *   6. Link teacher to batch via batch_teachers
 *   7. Send invite email with temp password
 */
export const createFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, email, phone, position, subject, batch_id, rating } = req.body;

    // ── 1. Validate required fields ──────────────────────────────────────────
    if (!name || !email || !position || !subject || !batch_id) {
      res.status(400).json({
        success: false,
        message: "name, email, position, subject, and batch_id are required",
      });
      return;
    }

    const instituteId = await resolveInstituteId(userId!, req.user?.institute_id ?? null);
    if (!instituteId) {
      res.status(404).json({ success: false, message: "No active institute found for this admin" });
      return;
    }

    // ── 2. Validate batch belongs to this institute ──────────────────────────
    const { data: batch, error: batchErr } = await supabaseDB
      .from("batches")
      .select("id, name")
      .eq("id", batch_id)
      .eq("institute_id", instituteId)
      .eq("is_active", true)
      .maybeSingle();

    if (batchErr || !batch) {
      res.status(400).json({ success: false, message: "Batch not found or does not belong to your institute" });
      return;
    }

    // ── 3. Check for duplicate email ─────────────────────────────────────────
    const { data: existing } = await supabaseDB
      .from("users")
      .select("id, role")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      res.status(400).json({
        success: false,
        message: `An account with email "${email}" already exists (role: ${existing.role})`,
      });
      return;
    }

    // ── 4. Create Supabase auth user ─────────────────────────────────────────
    const tempPassword = generateTempPassword();
    const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: name.trim(), role: "teacher" },
      app_metadata: { role: "teacher" },
    });

    if (createErr || !createData?.user) {
      console.error("[createFaculty] Auth createUser failed:", createErr);
      res.status(500).json({ success: false, message: createErr?.message ?? "Failed to create auth account" });
      return;
    }

    const newUserId = createData.user.id;
    console.log(`[createFaculty] Auth user created: ${newUserId} (${email})`);

    // ── 5. Insert public.users row ───────────────────────────────────────────
    const { error: userErr } = await supabaseDB.from("users").insert([{
      id: newUserId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: "teacher",
      institute_id: instituteId,
    }]);

    if (userErr) {
      console.error("[createFaculty] users insert failed:", userErr);
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      res.status(500).json({ success: false, message: `Failed to create user profile: ${userErr.message}` });
      return;
    }

    // ── 6. Insert faculty record ─────────────────────────────────────────────
    const { data: faculty, error: facErr } = await supabaseDB.from("faculty").insert({
      id: newUserId,           // share the same ID as public.users for easy joins
      institute_id: instituteId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() ?? null,
      position: position.trim(),
      subject: subject.trim(),
      rating: rating ? Number(rating) : 0,
      batches_count: 1,
      is_active: true,
    }).select().maybeSingle();

    if (facErr) {
      console.error("[createFaculty] faculty insert failed:", facErr);
      // Non-fatal — user is created, just metadata missing
      await supabaseDB.from("users").delete().eq("id", newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      res.status(500).json({ success: false, message: "Failed to create faculty profile." });
      return;
    }

    // ── 7. Link to batch ─────────────────────────────────────────────────────
    const { error: linkErr } = await supabaseDB.from("batch_teachers").insert({
      batch_id,
      teacher_id: newUserId,
    });

    if (linkErr) {
      await supabaseDB.from("faculty").delete().eq("id", newUserId);
      await supabaseDB.from("users").delete().eq("id", newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      res.status(500).json({ success: false, message: "Failed to assign faculty to the selected batch." });
      return;
    } else {
      console.log(`[createFaculty] Linked teacher ${newUserId} to batch ${batch_id}`);
    }

    // ── 8. Send invite email ─────────────────────────────────────────────────
    const instituteName = await resolveInstituteName(instituteId);
    try {
      await sendFacultyInviteEmail({
        to: email.trim().toLowerCase(),
        name: name.trim(),
        instituteName,
        tempPassword,
      });
    } catch (mailErr: any) {
      console.warn("[createFaculty] Email send failed (non-fatal):", mailErr.message);
    }

    console.log(`[createFaculty] COMPLETE — faculty "${name}" (${email}) provisioned`);
    res.status(201).json({
      success: true,
      message: `Faculty member created. Invite email sent to ${email}.`,
      data: { faculty: faculty ?? { id: newUserId, name, email, position, subject, institute_id: instituteId } },
    });
  } catch (err: any) {
    console.error("[createFaculty error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
