import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("[Supabase] SUPABASE_URL or SUPABASE_SERVICE_KEY not set in environment.");
}

/**
 * Server-side Supabase admin client.
 * Uses the service_role key — bypasses RLS.
 * Only use this on the API server, never expose to the browser.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
