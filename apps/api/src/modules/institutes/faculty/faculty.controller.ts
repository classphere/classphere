import { Request, Response } from "express";
import { supabaseDB } from "../../../lib/supabase";

// ─── Helper: resolve institute_id for the acting admin ────────────────────────
// Priority: req.user.institute_id (already in JWT via middleware) → owner_id lookup
async function resolveInstituteId(userId: string, instituteIdFromToken: string | null): Promise<string | null> {
  // Fast path: institute_id is already on the user record
  if (instituteIdFromToken) return instituteIdFromToken;

  // Fallback: look up by owner_id (for older records where institute_id wasn't set on users)
  const { data: inst } = await supabaseDB
    .from("institutes")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  return inst?.id ?? null;
}

/**
 * GET /api/v1/faculty
 * [institute_admin] — List all faculty in the institute.
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

    if (!faculty || faculty.length === 0) {
      res.status(200).json({ success: true, data: { faculty: [] }, message: "No faculty found for this institute" });
      return;
    }

    res.status(200).json({ success: true, data: { faculty } });
  } catch (err: any) {
    console.error("[listFaculty error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/faculty
 * [institute_admin] — Create a new faculty member within the admin's institute.
 */
export const createFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, position, subject, batches_count, rating } = req.body;

    if (!name || !position || !subject) {
      res.status(400).json({ success: false, message: "name, position, and subject are required" });
      return;
    }

    const instituteId = await resolveInstituteId(userId!, req.user?.institute_id ?? null);

    if (!instituteId) {
      res.status(404).json({ success: false, message: "No active institute found for this admin" });
      return;
    }

    // Insert faculty member
    const { data: faculty, error: facErr } = await supabaseDB
      .from("faculty")
      .insert({
        institute_id: instituteId,
        name: name.trim(),
        position: position.trim(),
        subject: subject.trim(),
        batches_count: batches_count ? Number(batches_count) : 0,
        rating: rating ? Number(rating) : 0,
        is_active: true,
      })
      .select()
      .single();

    if (facErr || !faculty) {
      console.error("[createFaculty] DB error:", facErr);
      res.status(500).json({ success: false, message: facErr?.message ?? "Failed to create faculty member" });
      return;
    }

    console.log(`[createFaculty] Created faculty "${faculty.name}" (id=${faculty.id}) for institute ${instituteId}`);
    res.status(201).json({ success: true, data: { faculty } });
  } catch (err: any) {
    console.error("[createFaculty error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
