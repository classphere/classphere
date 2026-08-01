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
  /** @deprecated Pricing lives on institute_subscriptions; retained for institute_invoices' join. */
  plan: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  enabled_exam_codes?: string[] | null;
  // Joined fields (populated by listAllInstitutes)
  owner_email?: string;
  owner_name?: string;
  student_count?: number;
  theme_primary_color?: string | null;
  subscription?: SubscriptionTerms | null;
  annual_value_paise?: number;
}

export interface CreateInstituteInput {
  name: string;
  adminEmail: string;
  adminUsername: string;
  preferredSubdomain?: string;
  trialMonths?: number;
  logoUrl?: string;
  enabledExamCodes?: string[];
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

  // 3. Billable students per institute — those in an active, unexpired batch.
  const studentCountMap = await getStudentCountsByInstitute();

  // 4. Commercial terms, so the CRM row can show what the institute is worth
  // rather than a plan tier that never mapped to a price.
  const { data: subs } = await supabaseDB
    .from("institute_subscriptions")
    .select("institute_id, status, billing_mode, price_per_student_paise, flat_annual_paise, trial_ends_at, current_period_end");
  const subsByInstitute = Object.fromEntries((subs ?? []).map((s: any) => [s.institute_id, s]));

  // Branding, so the CRM can show and edit what an institute actually looks
  // like. theme_logo_url is the authoritative logo; institutes.logo_url is a
  // second copy that predates it.
  const { data: settings } = await supabaseDB
    .from("institute_settings")
    .select("institute_id, theme_primary_color, theme_logo_url");
  const settingsByInstitute = Object.fromEntries((settings ?? []).map((s: any) => [s.institute_id, s]));

  // 5. Merge everything
  return institutes.map((inst: any) => {
    const sub = subsByInstitute[inst.id] ?? null;
    const students = studentCountMap[inst.id] ?? 0;
    return {
      ...inst,
      owner_email: usersMap[inst.owner_id]?.email ?? null,
      owner_name:  usersMap[inst.owner_id]?.name ?? null,
      student_count: students,
      theme_primary_color: settingsByInstitute[inst.id]?.theme_primary_color ?? null,
      logo_url: settingsByInstitute[inst.id]?.theme_logo_url ?? inst.logo_url ?? null,
      subscription: sub,
      annual_value_paise: sub ? annualValuePaise(sub, students) : 0,
    };
  });
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

const RESERVED_SUBDOMAINS = new Set(["admin", "api", "app", "localhost", "superadmin", "www"]);

function provisioningError(message: string, statusCode = 400): Error {
  const error = new Error(message);
  (error as any).statusCode = statusCode;
  return error;
}

function normalizePreferredSubdomain(value?: string): string | null {
  const subdomain = value?.trim().toLowerCase();
  if (!subdomain) return null;

  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
    throw provisioningError("Subdomain must use lowercase letters, numbers, and hyphens only, and cannot start or end with a hyphen.");
  }
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    throw provisioningError(`The subdomain \"${subdomain}\" is reserved by Classphere.`);
  }
  return subdomain;
}

async function assertSubdomainAvailable(subdomain: string): Promise<void> {
  const [instituteResult, settingsResult] = await Promise.all([
    supabaseDB.from("institutes").select("id").eq("subdomain_slug", subdomain).maybeSingle(),
    supabaseDB.from("institute_settings").select("institute_id").eq("subdomain", subdomain).maybeSingle(),
  ]);

  if (instituteResult.error || settingsResult.error) {
    throw new Error(`Failed to check subdomain availability: ${(instituteResult.error ?? settingsResult.error)?.message}`);
  }
  if (instituteResult.data || settingsResult.data) {
    throw provisioningError(`The subdomain \"${subdomain}\" is already in use. Choose another one.`, 409);
  }
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
  const { name, adminEmail, adminUsername, preferredSubdomain, trialMonths = 2, logoUrl, enabledExamCodes } = input;
  const supportedExamCodes = [...new Set((enabledExamCodes ?? ["jee-main", "jee-advanced", "neet-ug"])
    .filter((exam) => ["jee-main", "jee-advanced", "jee-main-advanced", "neet-ug"].includes(exam)))];
  if (supportedExamCodes.length === 0) {
    const err = new Error("Select at least one supported examination.");
    (err as any).statusCode = 400;
    throw err;
  }
  if (!Number.isInteger(trialMonths) || trialMonths < 1 || trialMonths > 24) {
    const err = new Error("Trial duration must be a whole number between 1 and 24 months.");
    (err as any).statusCode = 400;
    throw err;
  }

  const requestedSubdomain = normalizePreferredSubdomain(preferredSubdomain);
  const generatedCandidate = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48) || "institute";
  const generatedSubdomain = RESERVED_SUBDOMAINS.has(generatedCandidate) ? "institute" : generatedCandidate;
  let subdomain_slug = requestedSubdomain ?? generatedSubdomain;

  // Explicit choices must either be available or fail. The legacy automatic
  // path still produces a unique address without ever changing a chosen one.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await assertSubdomainAvailable(subdomain_slug);
      break;
    } catch (error: any) {
      if (requestedSubdomain || error.statusCode !== 409 || attempt === 4) throw error;
      subdomain_slug = `${generatedSubdomain.slice(0, 54)}-${Math.random().toString(36).slice(2, 8)}`;
    }
  }
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
    .insert([{
      name,
      owner_id: newUserId,
      plan: "trial",
      is_active: true,
      subdomain_slug,
      logo_url: logoUrl || null,
      enabled_exam_codes: supportedExamCodes,
    }])
    .select()
    .single();

  if (insertErr) {
    console.error(`[provisionInstitute] Step 5 FAILED:`, insertErr);
    try { await supabaseDB.from("users").delete().eq("id", newUserId); } catch (_) {}
    try { await supabaseAdmin.auth.admin.deleteUser(newUserId); } catch (_) {}
    throw new Error(`Failed to create institute: ${insertErr.message}`);
  }

  console.log(`[provisionInstitute] Step 5: institute created — id=${newInst.id}`);

  // ── 5a. Insert institute_settings ────────────────────────────────────────
  console.log(`[provisionInstitute] Step 5a: Inserting into public.institute_settings...`);
  const { error: settingsErr } = await supabaseDB
    .from("institute_settings")
    .insert([{ institute_id: newInst.id, subdomain: subdomain_slug, theme_logo_url: logoUrl || null }]);
  
  if (settingsErr) {
    console.error(`[provisionInstitute] Step 5a FAILED: ${settingsErr.message}`);
    await supabaseDB.from("institutes").delete().eq("id", newInst.id);
    await supabaseDB.from("users").delete().eq("id", newUserId);
    try { await supabaseAdmin.auth.admin.deleteUser(newUserId); } catch (_) {}
    throw new Error(`Failed to configure institute domain: ${settingsErr.message}`);
  }

  // ── 5b. Insert institute_subscriptions (Free Trial) ──────────────────────
  {
    console.log(`[provisionInstitute] Step 5b: Creating free trial subscription for ${trialMonths} months...`);
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + trialMonths);

    const { error: subErr } = await supabaseDB
      .from("institute_subscriptions")
      .insert([{
        institute_id: newInst.id,
        plan_tier: "trial",
        status: "trialing",
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString()
      }]);
    
    if (subErr) {
      console.warn(`[provisionInstitute] Step 5b warning (non-fatal): ${subErr.message}`);
    }
  }

  // ── 6. Back-fill institute_id on the user row ────────────────────────────
  console.log(`[provisionInstitute] Step 6: Setting institute_id on user record...`);
  const { error: linkErr } = await supabaseDB
    .from("users")
    .update({ institute_id: newInst.id })
    .eq("id", newUserId);

  if (linkErr) {
    await supabaseDB.from("institute_subscriptions").delete().eq("institute_id", newInst.id);
    await supabaseDB.from("institute_settings").delete().eq("institute_id", newInst.id);
    await supabaseDB.from("institutes").delete().eq("id", newInst.id);
    await supabaseDB.from("users").delete().eq("id", newUserId);
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    throw new Error(`Failed to link institute administrator: ${linkErr.message}`);
  }
  console.log(`[provisionInstitute] Step 6: institute_id set on user`);

  console.log(`[provisionInstitute] COMPLETE ✓`);

  return { ...(newInst as InstituteRow), tempPassword };
}



// ─── Billing ──────────────────────────────────────────────────────────────────

/** Annual rate charged per student when nothing else is set: ₹590. */
export const DEFAULT_PRICE_PER_STUDENT_PAISE = 59_000;

export interface SubscriptionTerms {
  status: "trialing" | "active" | "past_due" | "cancelled";
  billing_mode: "per_student" | "flat";
  price_per_student_paise: number;
  flat_annual_paise: number | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

/**
 * What an institute is worth per year, in paise.
 *
 * Kept as a pure function so the same arithmetic backs the CRM list, the KPI
 * cards and the institute's own billing page — three places that previously
 * disagreed, because two of them read a stored invoice total and one read a
 * plan tier.
 */
export function annualValuePaise(terms: Pick<SubscriptionTerms, "billing_mode" | "price_per_student_paise" | "flat_annual_paise">, studentCount: number): number {
  if (terms.billing_mode === "flat") return terms.flat_annual_paise ?? 0;
  return (terms.price_per_student_paise ?? DEFAULT_PRICE_PER_STUDENT_PAISE) * studentCount;
}

/**
 * Billable students per institute, keyed by institute id.
 *
 * "Billable" means enrolled in a batch that is active, started, and not past
 * its expiry — see migration 36. Tying the count to batch lifecycle is what
 * makes the end of a session a renewal boundary: an immortal batch would
 * otherwise let an institute rotate new cohorts through one year's fee
 * forever, and, in the other direction, expired cohorts would keep billing.
 *
 * Aggregated in Postgres rather than by pulling rows: the previous approach
 * counted enrolments rather than students and truncated at 1000 rows, and both
 * mistakes now reach an invoice.
 */
export async function getStudentCountsByInstitute(): Promise<Record<string, number>> {
  const { data, error } = await supabaseDB.rpc("institute_student_counts");
  if (error) {
    console.error("[billing] student count rollup failed:", error.message);
    return {};
  }
  return Object.fromEntries(
    (data ?? []).map((row: any) => [row.institute_id, Number(row.student_count) || 0]),
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Aggregate stats for the CRM KPI cards.
 *
 * Reports what the business actually runs on — how many institutes are paying,
 * how many students they are billed for, and the annual value of that book.
 * It used to report a count of institutes on an "enterprise" plan, a tier that
 * was never sold, and an MRR summed from invoices that nothing writes.
 */
export async function getInstituteCRMStats(): Promise<{
  activeInstitutes: number;
  trialInstitutes: number;
  billedStudents: number;
  estimatedARRPaise: number;
}> {
  const [{ data: subs }, studentCounts] = await Promise.all([
    supabaseDB
      .from("institute_subscriptions")
      .select("institute_id, status, billing_mode, price_per_student_paise, flat_annual_paise"),
    getStudentCountsByInstitute(),
  ]);

  let activeInstitutes = 0;
  let trialInstitutes = 0;
  let billedStudents = 0;
  let estimatedARRPaise = 0;

  for (const sub of subs ?? []) {
    const students = studentCounts[sub.institute_id] ?? 0;
    if (sub.status === "trialing") {
      trialInstitutes += 1;
      continue; // a trial bills nothing yet, so it must not inflate ARR
    }
    if (sub.status !== "active") continue;
    activeInstitutes += 1;
    billedStudents += students;
    estimatedARRPaise += annualValuePaise(sub, students);
  }

  return { activeInstitutes, trialInstitutes, billedStudents, estimatedARRPaise };
}

