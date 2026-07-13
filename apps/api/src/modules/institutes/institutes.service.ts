/**
 * institutes.service.ts
 *
 * Service layer for institutes domain.
 * All Supabase calls go here — controllers stay thin.
 * Architecture: ARCHITECTURE_V2.md §4.1 (modules/institutes/institutes.service.ts)
 */

import { supabaseAdmin, supabaseDB } from "../../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstituteRow {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  plan: string;           // 'free' | 'pro' | 'enterprise'
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields (populated by listAllInstitutes)
  owner_email?: string;
  owner_name?: string;
  student_count?: number;
}

export interface CreateInstituteInput {
  name: string;
  adminEmail: string;
  adminUsername: string;
  type: string;
  price: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * List all institutes with owner info and student counts.
 * Used by: GET /api/v1/superadmin/institutes
 */
export async function listAllInstitutes(): Promise<InstituteRow[]> {
  // 1. Fetch all institutes
  const { data: institutes, error: instErr } = await supabaseDB
    .from("institutes")
    .select("*")
    .order("created_at", { ascending: false });

  if (instErr) throw new Error(`Failed to fetch institutes: ${instErr.message}`);
  if (!institutes || institutes.length === 0) return [];

  // 2. Fetch owner user details for all owner_ids
  const ownerIds = [...new Set(institutes.map((i: any) => i.owner_id).filter(Boolean))];
  let usersMap: Record<string, { email: string; name: string }> = {};

  if (ownerIds.length > 0) {
    const { data: users } = await supabaseDB
      .from("users")
      .select("id, email, name")
      .in("id", ownerIds);

    if (users) {
      usersMap = Object.fromEntries(users.map((u: any) => [u.id, { email: u.email, name: u.name }]));
    }
  }

  // 3. Fetch student counts per institute via batch_students → batches
  const instituteIds = institutes.map((i: any) => i.id);
  let studentCountMap: Record<string, number> = {};

  if (instituteIds.length > 0) {
    const { data: batches } = await supabaseDB
      .from("batches")
      .select("id, institute_id")
      .in("institute_id", instituteIds)
      .eq("is_active", true);

    if (batches && batches.length > 0) {
      const batchIds = batches.map((b: any) => b.id);
      const batchToInstitute = Object.fromEntries(batches.map((b: any) => [b.id, b.institute_id]));

      const { data: batchStudents } = await supabaseDB
        .from("batch_students")
        .select("batch_id")
        .in("batch_id", batchIds);

      if (batchStudents) {
        for (const bs of batchStudents) {
          const instId = batchToInstitute[bs.batch_id];
          if (instId) {
            studentCountMap[instId] = (studentCountMap[instId] ?? 0) + 1;
          }
        }
      }
    }
  }

  // 4. Merge everything
  return institutes.map((inst: any) => ({
    ...inst,
    owner_email: usersMap[inst.owner_id]?.email ?? null,
    owner_name:  usersMap[inst.owner_id]?.name ?? null,
    student_count: studentCountMap[inst.id] ?? 0,
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a strong temp password: e.g. "Inst#xK9m2pQ" */
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "Inst#"; // prefix ensures uppercase + special char requirement
  for (let i = 0; i < 8; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/**
 * Provision a new institute — no pre-signup required.
 *
 * Flow:
 * 1. Duplicate guard (email must not already exist in public.users)
 * 2. Create the auth user via createUser (email_confirm: true → no email sent, no rate limit)
 * 3. Set app_metadata so the JWT has role="institute_admin" from first login
 * 4. Insert into public.users
 * 5. Insert into public.institutes
 * 6. Return the institute row + the one-time temp password so super admin can share it
 *
 * Architecture: ARCHITECTURE_V2.md §4.1 (modules/institutes/institutes.service.ts)
 */
export async function provisionInstitute(
  input: CreateInstituteInput
): Promise<InstituteRow & { tempPassword: string }> {
  const { name, adminEmail, adminUsername, type, price } = input;
  console.log(`[provisionInstitute] START — name="${name}", email="${adminEmail}", username="${adminUsername}"`);

  // ── 1. Duplicate guard ───────────────────────────────────────────────────
  const { data: existingUsers, error: dupCheckErr } = await supabaseDB
    .from("users")
    .select("id, role")
    .eq("email", adminEmail)
    .limit(1);

  if (dupCheckErr) console.warn(`[provisionInstitute] Step 1 warning: ${dupCheckErr.message}`);

  if (existingUsers && existingUsers.length > 0) {
    const existing = existingUsers[0];
    console.log(`[provisionInstitute] Step 1: DUPLICATE — id=${existing.id}, role=${existing.role}`);
    const err = new Error(
      existing.role === "institute_admin" || existing.role === "super_admin"
        ? `An account with email "${adminEmail}" is already an admin.`
        : `An account with email "${adminEmail}" already exists in the system.`
    );
    (err as any).statusCode = 400;
    throw err;
  }

  console.log(`[provisionInstitute] Step 1: No duplicate — proceeding`);

  // ── 2. Create auth user (no email sent, no rate limit) ───────────────────
  const tempPassword = generateTempPassword();
  console.log(`[provisionInstitute] Step 2: Creating auth user via createUser...`);

  const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: tempPassword,
    email_confirm: true,          // mark email as confirmed — no invite email sent
    user_metadata: {
      name: adminUsername,
      role: "institute_admin",
    },
  });

  if (createErr || !createData?.user) {
    const msg = createErr?.message ?? "Unknown error creating user";
    console.error(`[provisionInstitute] Step 2 FAILED: ${msg}`);
    throw new Error(`Failed to create account for "${adminEmail}": ${msg}`);
  }

  const newUserId = createData.user.id;
  console.log(`[provisionInstitute] Step 2: Auth user created — id=${newUserId}`);

  // ── 3. Set app_metadata so role is in JWT from first login ───────────────
  console.log(`[provisionInstitute] Step 3: Setting app_metadata...`);
  const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(newUserId, {
    app_metadata: { role: "institute_admin" },
  });
  if (metaErr) {
    console.warn(`[provisionInstitute] Step 3 warning: ${metaErr.message}`);
  } else {
    console.log(`[provisionInstitute] Step 3: app_metadata set`);
  }

  // ── 4. Insert into public.users ──────────────────────────────────────────
  console.log(`[provisionInstitute] Step 4: Inserting into public.users...`);
  const { error: userInsertErr } = await supabaseDB
    .from("users")
    .insert([{ id: newUserId, email: adminEmail, name: adminUsername, role: "institute_admin" }]);

  if (userInsertErr) {
    console.error(`[provisionInstitute] Step 4 FAILED:`, userInsertErr);
    try { await supabaseAdmin.auth.admin.deleteUser(newUserId); } catch (_) {}
    throw new Error(`Failed to create user profile: ${userInsertErr.message}`);
  }
  console.log(`[provisionInstitute] Step 4: public.users row inserted`);

  // ── 5. Insert institute row ──────────────────────────────────────────────
  // Real schema: id, name, slug, owner_id, plan, logo_url, is_active, created_at, updated_at
  console.log(`[provisionInstitute] Step 5: Inserting into public.institutes...`);
  const { data: newInst, error: insertErr } = await supabaseDB
    .from("institutes")
    .insert([{ name, owner_id: newUserId, plan: "free", is_active: true }])
    .select()
    .single();

  if (insertErr) {
    console.error(`[provisionInstitute] Step 5 FAILED:`, insertErr);
    try { await supabaseDB.from("users").delete().eq("id", newUserId); } catch (_) {}
    try { await supabaseAdmin.auth.admin.deleteUser(newUserId); } catch (_) {}
    throw new Error(`Failed to create institute: ${insertErr.message}`);
  }

  console.log(`[provisionInstitute] Step 5: institute created — id=${newInst.id}`);

  // ── 6. Back-fill institute_id on the user row ────────────────────────────
  console.log(`[provisionInstitute] Step 6: Setting institute_id on user record...`);
  const { error: linkErr } = await supabaseDB
    .from("users")
    .update({ institute_id: newInst.id })
    .eq("id", newUserId);

  if (linkErr) {
    console.warn(`[provisionInstitute] Step 6 warning (non-fatal): ${linkErr.message}`);
  } else {
    console.log(`[provisionInstitute] Step 6: institute_id set on user`);
  }

  console.log(`[provisionInstitute] COMPLETE ✓`);

  return { ...(newInst as InstituteRow), tempPassword };
}



// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Get aggregate stats for the CRM KPI cards.
 * Returns enterprise plan count and estimated MRR.
 */
export async function getInstituteCRMStats(): Promise<{
  enterprisePlans: number;
  estimatedMRR: number;
}> {
  // Enterprise plan count — uses actual 'plan' column
  const { count: enterprisePlans } = await supabaseDB
    .from("institutes")
    .select("id", { count: "exact", head: true })
    .eq("plan", "enterprise")
    .eq("is_active", true);

  // MRR: price_per_student column not yet in schema — returns 0 until billing table is added.
  const estimatedMRR = 0;

  return {
    enterprisePlans: enterprisePlans ?? 0,
    estimatedMRR,
  };
}

