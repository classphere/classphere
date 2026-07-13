import { Request, Response } from "express";
import { supabaseDB, supabaseAdmin } from "../../../lib/supabase";
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
  skipped: number;
  errors: string[];
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
        .in("student_id", studentIds);

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
 * Expected columns (case-insensitive): Name, Phone, DOB, Batch
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
    for (const b of batches ?? []) {
      batchByName[b.name.toLowerCase().trim()] = b.id;
    }

    // Fetch institute slug for shadow email
    const { data: institute } = await supabaseDB.from("institutes").select("subdomain_slug").eq("id", instituteId).single();
    const slug = institute?.subdomain_slug || "unknown";

    // ── Process each row ─────────────────────────────────────────────────────
    const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowLabel = `Row ${i + 2}`; // +2 because row 1 = header

      const name = row.name?.trim();
      const phone = normalisePhone(row.phone);
      const dob = normaliseDob(row.dob);
      const batchKey = row.batch_name?.trim().toLowerCase();

      if (!name || !phone || !dob || !batchKey) {
        result.errors.push(`${rowLabel}: Missing required field(s). Got: name="${row.name}" phone="${row.phone}" dob="${row.dob}" batch="${row.batch_name}"`);
        continue;
      }

      const batchId = batchByName[batchKey];
      if (!batchId) {
        result.errors.push(`${rowLabel}: Batch "${row.batch_name}" not found in your institute. Create it first.`);
        continue;
      }

      // Check if student already exists (by phone + institute)
      const { data: existing } = await supabaseDB
        .from("users")
        .select("id")
        .eq("phone", phone)
        .eq("institute_id", instituteId)
        .eq("role", "student")
        .maybeSingle();

      if (existing) {
        // Check if already in this batch
        const { data: existingLink } = await supabaseDB
          .from("batch_students")
          .select("batch_id")
          .eq("student_id", existing.id)
          .eq("batch_id", batchId)
          .maybeSingle();

        if (existingLink) {
          // Same phone + same batch → skip
          result.skipped++;
        } else {
          // Same phone + different batch → add to new batch
          const { error: linkErr } = await supabaseDB.from("batch_students").insert({
            student_id: existing.id,
            batch_id: batchId,
          });
          if (linkErr) {
            result.errors.push(`${rowLabel}: Failed to update batch for ${name}: ${linkErr.message}`);
          } else {
            result.updated++;
          }
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
           result.errors.push(`${rowLabel}: A student with this phone and DOB already exists.`);
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

    console.log(`[importStudents] Done: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors`);

    res.status(200).json({
      success: true,
      message: `Import complete: ${result.imported} students added, ${result.updated} batch assignments updated, ${result.skipped} skipped (already in batch).`,
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
        res.status(500).json({ success: false, message: `Failed to create student: ${userErr?.message}` });
        return;
      }
      studentId = newUser.id;
    }

    // Link to batch
    const { data: existingLink } = await supabaseDB
      .from("batch_students")
      .select("batch_id")
      .eq("student_id", studentId)
      .eq("batch_id", batch_id)
      .maybeSingle();

    if (!existingLink) {
      const { error: linkErr } = await supabaseDB.from("batch_students").insert({
        student_id: studentId,
        batch_id,
      });

      if (linkErr) {
        res.status(500).json({ success: false, message: `Student created but failed to link batch: ${linkErr.message}` });
        return;
      }
    }

    res.status(200).json({ success: true, message: "Student added successfully!" });
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
