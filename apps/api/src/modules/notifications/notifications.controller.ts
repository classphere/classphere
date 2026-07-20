import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";

export async function listNotifications(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const { data, error } = await supabaseDB.from("notifications")
      .select("id, type, title, body, href, metadata, read_at, created_at")
      .eq("user_id", req.user!.id).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    const notifications = data ?? [];
    res.json({ success: true, data: { notifications, unreadCount: notifications.filter((item) => !item.read_at).length } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message ?? "Could not load notifications." }); }
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabaseDB.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("id", req.params.id).eq("user_id", req.user!.id).is("read_at", null).select("id").maybeSingle();
    if (error) throw error;
    res.json({ success: true, data: { updated: Boolean(data) } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message ?? "Could not update notification." }); }
}

export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
  try {
    const { error } = await supabaseDB.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", req.user!.id).is("read_at", null);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message ?? "Could not update notifications." }); }
}
