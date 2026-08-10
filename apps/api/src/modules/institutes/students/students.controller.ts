import { Request, Response } from "express";
import { supabaseDB, supabaseAdmin } from "../../../lib/supabase";
import { enrolExclusively, findConflictingEnrolment } from "../../../lib/batch-enrolment";
import * as XLSX from "xlsx";

// ─── Helper: resolve institute_id ─────────────────────────────────────────────
async function resolveInstituteId(userId: string, instituteIdFromToken: string | null): Promise<string | null> {
  if (instituteIdFromToken) return instituteIdFromToken;
  const { data } = await supabaseDB
    .from("institutes").select("id")
    .eq("owner_id", userId).eq("is_active", true).maybeSingle();
  return data?.id ?? null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentRow {
  name: string;
  phone: string;
  dob: string;         // DDMMYYYY string
  batch_name: string;
}

interface ImportResult {
  imported: number;
  updated: number;
  /** Existing students the sheet reassigned to a different batch. */
  moved: number;
  skipped: number;
  errors: string[];
  /** "Name — Old Batch → New Batch", so a reassignment is reviewable, not just counted. */
  moves: string[];
}

// ─── Normalise DOB: accept DDMMYYYY, DD/MM/YYYY, DD-MM-YYYY → DDMMYYYY ───────
function normaliseDob(raw: string): string | null {
  if (!raw) return null;
  const s = String(raw).trim().replace(/[\/\-\.]/g, "");
  if (/^\d{8}$/.test(s)) return s;
  return null;
}

// ─── Normalise phone: strip spaces/dashes, keep digits only ──────────────────
function normalisePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = String(raw).trim().replace(/\D/g, "");
  if (digits.length < 6) return null;
  return digits;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/students
 * [institute_admin] — List all students in the institute.
 */
export const listStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user?.role;
    if (role !== "institute_admin" && role !== "super_admin") {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const instituteId = await resolveInstituteId(req.user!.id, req.user?.institute_id ?? null);
    if (!instituteId) {
      res.status(404).json({ success: false, message: "No active institute found" });
      return;
    }

    // Fetch all students for this institute
    const { data: students, error } = await supabaseDB
      .from("users")
      .select("id, name, phone, date_of_birth, created_at")
      .eq("institute_id", instituteId)
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    // Also fetch batch assignments for each student
    const studentIds = (students ?? []).map((s: any) => s.id);
    let batchMap: Record<string, string[]> = {};

    if (studentIds.length > 0) {
      const { data: batchLinks } = await supabaseDB
        .from("batch_students")
        .select("student_id, batches(name)")
        .in("student_id", studentIds)
        // Shows the batch a student is in, not one they have left.
        .is("left_at", null);

      if (batchLinks) {
        for (const link of batchLinks as any[]) {
          if (!batchMap[link.student_id]) batchMap[link.student_id] = [];
          if (link.batches?.name) batchMap[link.student_id].push(link.batches.name);
        }
      }
    }

    const result = (students ?? []).map((s: any) => ({
      ...s,
      batches: batchMap[s.id] ?? [],
    }));

    res.status(200).json({ success: true, data: { students: result, total: result.length } });
  } catch (err: any) {
    console.error("[listStudents error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/students/import
 * [institute_admin] — Upload a CSV or XLSX file with student data.
 *
 * Expected columns (case-insensitive): Name, Phone, DOB, Batch.
 * When batch_id is included in multipart data, Batch is optional and every
 * row is enrolled in that selected batch.
 * DOB format: DDMMYYYY (or DD/MM/YYYY — normalised automatically)
 *
 * Duplicate handling:
 *   - Same phone + same batch → skip
 *   - Same phone + different batch → add to new batch (update)
 */
export const importStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user?.role;
    if (role !== "institute_admin" && role !== "super_admin") {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const instituteId = await resolveInstituteId(req.user!.id, req.user?.institute_id ?? null);
    if (!instituteId) {
      res.status(404).json({ success: false, message: "No active institute found" });
      return;
    }

    // ── Parse uploaded file ──────────────────────────────────────────────────
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: "No file uploaded. Send the file as multipart/form-data with field name 'file'" });
      return;
    }

    let rows: StudentRow[];
    try {
      rows = parseFile(file.buffer, file.originalname);
    } catch (parseErr: any) {
      res.status(400).json({ success: false, message: `File parse error: ${parseErr.message}` });
      return;
    }

    if (rows.length === 0) {
      res.status(400).json({ success: false, message: "File is empty or has no valid rows" });
      return;
    }

    // ── Fetch existing batches for this institute ─────────────────────────────
    const { data: batches } = await supabaseDB
      .from("batches")
      .select("id, name")
      .eq("institute_id", instituteId)
      .eq("is_active", true);

    const batchByName: Record<string, string> = {};
    const batchNameById: Record<string, string> = {};
    for (const b of batches ?? []) {
      batchByName[b.name.toLowerCase().trim()] = b.id;
      batchNameById[b.id] = b.name;
    }

    const requestedBatchId = typeof req.body?.batch_id === "string" ? req.body.batch_id.trim() : "";
    if (requestedBatchId && !(batches ?? []).some((batch) => batch.id === requestedBatchId)) {
      res.status(400).json({ success: false, message: "The selected batch does not belong to your institute." });
      return;
    }

    // Fetch institute slug for shadow email
    const { data: institute } = await supabaseDB.from("institutes").select("subdomain_slug").eq("id", instituteId).single();
    const slug = institute?.subdomain_slug || "unknown";

    // ── Process each row ─────────────────────────────────────────────────────
    const result: ImportResult = { imported: 0, updated: 0, moved: 0, skipped: 0, errors: [], moves: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowLabel = `Row ${i + 2}`; // +2 because row 1 = header

      const name = row.name?.trim();
      const phone = normalisePhone(row.phone);
      const dob = normaliseDob(row.dob);
      const batchKey = row.batch_name?.trim().toLowerCase();

      if (!name || !phone || !dob || (!requestedBatchId && !batchKey)) {
        result.errors.push(`${rowLabel}: Missing required field(s). Got: name="${row.name}" phone="${row.phone}" dob="${row.dob}" batch="${row.batch_name}"`);
        continue;
      }

      const batchId = requestedBatchId || batchByName[batchKey];
      if (!batchId) {
        result.errors.push(`${rowLabel}: Batch "${row.batch_name}" not found in your institute. Create it first.`);
        continue;
      }
      const batchName = batchNameById[batchId] ?? "the selected batch";

      // Check if student already exists (by phone + institute)
      const { data: existing } = await supabaseDB
        .from("users")
        .select("id")
        .eq("phone", phone)
        .eq("institute_id", instituteId)
        .eq("role", "student")
        .maybeSingle();

      if (existing) {
        // Already enrolled here, so the row says nothing new. left_at matters:
        // a student who left this batch and appears in the sheet again is being
        // re-enrolled, not skipped.
        const { data: activeHere } = await supabaseDB
          .from("batch_students")
          .select("batch_id")
          .eq("student_id", existing.id)
          .eq("batch_id", batchId)
          .is("left_at", null)
          .maybeSingle();

        if (activeHere) {
          result.skipped++;
          continue;
        }

        // Listed against a different batch than the one they are in. Unlike the
        // single-student form, which stops and asks, a corrected roster is
        // re-uploaded precisely to reassign people — erroring on every moved
        // student would make the import look broken. So it moves them, and
        // reports moves separately from new enrolments so the institute can see
        // that it happened.
        const { movedFrom, error: linkErr } = await enrolExclusively(existing.id, batchId);
        if (linkErr) {
          result.errors.push(`${rowLabel}: Failed to update batch for ${name}: ${linkErr}`);
        } else if (movedFrom) {
          result.moved++;
          result.moves.push(`${name} — ${movedFrom.batch_name} → ${batchName}`);
        } else {
          result.updated++;
        }
        continue;
      }

      // New student — create in Auth first
      const shadowEmail = `${phone}_${dob}@${slug}.classphere.com`;

      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: shadowEmail,
        password: String(dob).trim(),
        email_confirm: true,
        user_metadata: { name: name.trim() },
      });

      if (createError) {
        if (createError.message.includes("already been registered")) {
           result.skipped++;
        } else {
           result.errors.push(`${rowLabel}: Failed to create auth user for "${name}": ${createError.message}`);
        }
        continue;
      }

      const newId = authUser.user!.id;

      const { data: newUser, error: userErr } = await supabaseDB
        .from("users")
        .insert({
          id: newId,
          name,
          phone,
          email: shadowEmail,
          date_of_birth: dob,
          role: "student",
          institute_id: instituteId,
        })
        .select("id")
        .single();

      if (userErr || !newUser) {
        result.errors.push(`${rowLabel}: Failed to create student "${name}": ${userErr?.message ?? "unknown error"}`);
        continue;
      }

      // Link to batch
      const { error: batchLinkErr } = await supabaseDB.from("batch_students").insert({
        student_id: newUser.id,
        batch_id: batchId,
      });

      if (batchLinkErr) {
        result.errors.push(`${rowLabel}: Student created but failed to add to batch: ${batchLinkErr.message}`);
      }

      result.imported++;
    }

    console.log(`[importStudents] Done: ${result.imported} imported, ${result.updated} updated, ${result.moved} moved, ${result.skipped} skipped, ${result.errors.length} errors`);

    // A move is called out on its own. Folding it into "updated" is how the
    // old import hid the fact that it was reassigning people between batches.
    const parts = [`${result.imported} added`];
    if (result.updated) parts.push(`${result.updated} re-enrolled`);
    if (result.moved) parts.push(`${result.moved} moved to a different batch`);
    if (result.skipped) parts.push(`${result.skipped} already in batch`);

    res.status(200).json({
      success: true,
      message: `Import complete: ${parts.join(", ")}.`,
      data: result,
    });
  } catch (err: any) {
    console.error("[importStudents error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/students
 * [institute_admin] — Add a single student.
 */
export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user?.role;
    if (role !== "institute_admin" && role !== "super_admin") {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const instituteId = await resolveInstituteId(req.user!.id, req.user?.institute_id ?? null);
    if (!instituteId) {
      res.status(404).json({ success: false, message: "No active institute found" });
      return;
    }

    const { name, phone: rawPhone, dob: rawDob, batch_id } = req.body;
    const phone = normalisePhone(rawPhone);
    const dob = normaliseDob(rawDob);

    if (!name || !phone || !dob || !batch_id) {
      res.status(400).json({ success: false, message: "Missing required fields (name, phone, dob, batch_id)" });
      return;
    }

    // Verify batch
    const { data: batch } = await supabaseDB
      .from("batches")
      .select("id")
      .eq("id", batch_id)
      .eq("institute_id", instituteId)
      .maybeSingle();

    if (!batch) {
      res.status(400).json({ success: false, message: "Invalid batch selected" });
      return;
    }

    // Check existing student
    const { data: existing } = await supabaseDB
      .from("users")
      .select("id")
      .eq("phone", phone)
      .eq("institute_id", instituteId)
      .eq("role", "student")
      .maybeSingle();

    let studentId = existing?.id;

    if (!studentId) {
      const { data: institute } = await supabaseDB.from("institutes").select("subdomain_slug").eq("id", instituteId).single();
      const slug = institute?.subdomain_slug || "unknown";
      const shadowEmail = `${phone}_${dob}@${slug}.classphere.com`;

      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: shadowEmail,
        password: String(dob).trim(),
        email_confirm: true,
        user_metadata: { name: name.trim() },
      });

      if (createError) {
        if (createError.message.includes("already been registered")) {
           res.status(409).json({ success: false, message: "A student with this phone and DOB already exists." });
        } else {
           res.status(500).json({ success: false, message: `Failed to create auth user: ${createError.message}` });
        }
        return;
      }

      const newId = authUser.user!.id;

      const { data: newUser, error: userErr } = await supabaseDB
        .from("users")
        .insert({
          id: newId,
          name: name.trim(),
          phone,
          email: shadowEmail,
          date_of_birth: dob,
          role: "student",
          institute_id: instituteId,
        })
        .select("id")
        .single();

      if (userErr || !newUser) {
        await supabaseAdmin.auth.admin.deleteUser(newId).catch(() => {});
        res.status(500).json({ success: false, message: `Failed to create student: ${userErr?.message}` });
        return;
      }
      studentId = newUser.id;
    }

    // Link to batch. A student holds one active enrolment, so an existing
    // student who is already in a different batch is a move, and the admin has
    // to say so — retrying with move=true is what the confirm dialog sends.
    // Only reachable for an existing student; a freshly created one has no
    // enrolments to conflict with.
    const conflict = await findConflictingEnrolment(studentId!, batch_id);
    if (conflict && req.body.move !== true) {
      res.status(409).json({
        success: false,
        code: "ALREADY_ENROLLED",
        message: `${name.trim()} is already in ${conflict.batch_name}. Move them instead?`,
        data: { current_batch: conflict },
      });
      return;
    }

    const { movedFrom, error: linkErr } = await enrolExclusively(studentId!, batch_id);
    if (linkErr) {
      if (!existing?.id) {
        await supabaseDB.from("users").delete().eq("id", studentId);
        await supabaseAdmin.auth.admin.deleteUser(studentId).catch(() => {});
      }
      res.status(500).json({ success: false, message: `Student created but failed to link batch: ${linkErr}` });
      return;
    }

    res.status(200).json({
      success: true,
      message: movedFrom ? `Student moved from ${movedFrom.batch_name}.` : "Student added successfully!",
    });
  } catch (err: any) {
    console.error("[createStudent error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── File Parser ──────────────────────────────────────────────────────────────

function parseFile(buffer: Buffer, filename: string): StudentRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return raw.map((r: any) => {
    // Normalise column names: case-insensitive, strip spaces
    const keys = Object.keys(r);
    const get = (variants: string[]) => {
      for (const v of variants) {
        const k = keys.find(k => k.trim().toLowerCase() === v.toLowerCase());
        if (k !== undefined) return String(r[k] ?? "").trim();
      }
      return "";
    };

    return {
      name: get(["name", "student name", "full name"]),
      phone: get(["phone", "phone number", "mobile", "mobile number", "contact"]),
      dob: get(["dob", "date of birth", "dateofbirth", "birth date"]),
      batch_name: get(["batch", "batch name", "class", "section"]),
    };
  }).filter(r => r.name || r.phone); // filter empty rows
}
