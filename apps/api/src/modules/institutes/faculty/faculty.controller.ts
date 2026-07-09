import { Request, Response } from "express";
import { supabaseAdmin } from "../../../lib/supabase";

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

    // Find the institute owned by this admin
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

    // Insert faculty member
    const { data: faculty, error: facErr } = await supabaseAdmin
      .from("faculty")
      .insert({
        institute_id: institute.id,
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

    console.log(`[createFaculty] Created faculty "${faculty.name}" (id=${faculty.id}) for institute ${institute.id}`);
    res.status(201).json({ success: true, data: { faculty } });
  } catch (err: any) {
    console.error("[createFaculty error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/faculty
 * [institute_admin] — List all faculty in the institute.
 */
export const listFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (role === "institute_admin") {
      // Find institute owned by this admin
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

      const { data: faculty, error: facErr } = await supabaseAdmin
        .from("faculty")
        .select("*")
        .eq("institute_id", institute.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (facErr) {
        res.status(500).json({ success: false, message: facErr.message });
        return;
      }

      res.status(200).json({ success: true, data: { faculty: faculty ?? [] } });
      return;
    }

    res.status(403).json({ success: false, message: "Access denied" });
  } catch (err: any) {
    console.error("[listFaculty error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
