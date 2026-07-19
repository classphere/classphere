import { supabaseDB } from "./supabase";

/** Records privileged actions without allowing an audit-table failure to break
 * the primary operation. Never include credentials, tokens, or answer keys. */
export async function logAdminAction(
  userId: string | undefined,
  action: string,
  detail: string,
  category: string,
  type: "info" | "success" | "error" = "info"
): Promise<void> {
  try {
    const { error } = await supabaseDB.from("audit_logs").insert({
      user_id: userId ?? null,
      action,
      detail,
      category,
      type,
    });
    if (error) console.error("[admin-audit] failed to write audit record:", error.message);
  } catch (error) {
    console.error("[admin-audit] failed to write audit record:", error);
  }
}
