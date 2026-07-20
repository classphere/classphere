import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";

export async function registerPushDevice(req: Request, res: Response): Promise<void> {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const platform = req.body?.platform;
    if (!token || token.length > 4096 || !["android", "ios"].includes(platform)) {
      res.status(400).json({ success: false, message: "A valid native device token and platform are required." }); return;
    }
    const { error } = await supabaseDB.from("push_devices").upsert({
      user_id: req.user!.id, platform, token, disabled_at: null, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: "token" });
    if (error) throw error;
    res.status(204).end();
  } catch (error: any) { res.status(500).json({ success: false, message: error.message ?? "Could not register this device." }); }
}

export async function unregisterPushDevice(req: Request, res: Response): Promise<void> {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    if (!token) { res.status(400).json({ success: false, message: "A device token is required." }); return; }
    const { error } = await supabaseDB.from("push_devices").update({ disabled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("user_id", req.user!.id).eq("token", token);
    if (error) throw error;
    res.status(204).end();
  } catch (error: any) { res.status(500).json({ success: false, message: error.message ?? "Could not unregister this device." }); }
}
