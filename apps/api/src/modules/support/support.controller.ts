import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";

/**
 * POST /api/v1/support/tickets
 * [institute_admin]
 */
export const createTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { subject, message, priority = "medium" } = req.body;

    if (!subject || !message) {
      res.status(400).json({ success: false, message: "Subject and message are required" });
      return;
    }

    // Get institute_id for the user
    const { data: user } = await supabaseDB
      .from("users")
      .select("institute_id")
      .eq("id", userId)
      .single();

    const { data, error } = await supabaseDB
      .from("support_tickets")
      .insert([{
        author_id: userId,
        institute_id: user?.institute_id ?? null,
        subject,
        message,
        priority
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err: any) {
    console.error("[createTicket] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/support/tickets
 * [institute_admin]
 */
export const listMyTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const { data, error } = await supabaseDB
      .from("support_tickets")
      .select("*")
      .eq("author_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error("[listMyTickets] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/superadmin/tickets
 * [super_admin]
 */
export const listAllTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseDB
      .from("support_tickets")
      .select(`
        *,
        author:users(name, email),
        institute:institutes(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      // If table doesn't exist yet, return empty array gracefully
      if (error.code === '42P01') {
        res.status(200).json({ success: true, data: [] });
        return;
      }
      throw error;
    }

    res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error("[listAllTickets] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
