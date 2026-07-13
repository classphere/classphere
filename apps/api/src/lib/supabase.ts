import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("[Supabase] SUPABASE_URL or SUPABASE_SERVICE_KEY not set in environment.");
}

/**
 * supabaseAdmin — used ONLY for admin-level auth operations:
 *   - supabaseAdmin.auth.signInWithPassword(...)
 *   - supabaseAdmin.auth.admin.createUser(...)
 *   - supabaseAdmin.auth.admin.getUserById(...)
 *   - supabaseAdmin.auth.admin.listUsers()
 *
 * ⚠️  NEVER use this for .from("table") DB queries after calling signInWithPassword.
 *     signInWithPassword mutates this client's internal session, causing all subsequent
 *     .from() calls to run as the authenticated user (with RLS) instead of service role.
 *     Use supabaseDB for all database queries.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * supabaseDB — a completely separate client using the same service_role key.
 * Used for ALL .from("table") database queries.
 * This client is NEVER used for signInWithPassword, so its session is never
 * contaminated — it always queries as service_role, bypassing RLS.
 */
export const supabaseDB = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
