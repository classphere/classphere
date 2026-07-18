import { createClient } from "@supabase/supabase-js";
import { Agent, setGlobalDispatcher } from "undici";
import "../config/env";

// Configure global connection pooling dispatcher for Node native fetch (prevents port exhaustion under load)
const globalAgent = new Agent({
  keepAliveTimeout: 15000, // Keep idle sockets open for 15s
  connections: 200,        // Pool up to 200 concurrent sockets per origin (1 lakh scale optimization)
  pipelining: 1,
});
setGlobalDispatcher(globalAgent);

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

/** Creates an isolated client for a single login or token-validation request. */
export function createRequestAuthClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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
