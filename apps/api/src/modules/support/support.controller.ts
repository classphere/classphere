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

    // NEW-S2: Add priority enum validation
    const allowedPriorities = ["low", "medium", "high"];
    if (priority && !allowedPriorities.includes(priority)) {
      res.status(400).json({
        success: false,
        message: `Invalid priority '${priority}'. Allowed values: low, medium, high`
      });
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
 * Query params: page, limit
 */
export const listMyTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Validate and sanitize pagination inputs
    let limit = parseInt(req.query.limit as string, 10);
    let page = parseInt(req.query.page as string, 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (isNaN(page) || page < 1) page = 1;
    limit = Math.min(100, limit); // cap limit at 100

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabaseDB
      .from("support_tickets")
      .select("*", { count: "exact" })
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
      }
    });
  } catch (err: any) {
    console.error("[listMyTickets] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/superadmin/tickets
 * [super_admin]
 * Query params: page, limit
 */
export const listAllTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate and sanitize pagination inputs
    let limit = parseInt(req.query.limit as string, 10);
    let page = parseInt(req.query.page as string, 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (isNaN(page) || page < 1) page = 1;
    limit = Math.min(100, limit); // cap limit at 100

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabaseDB
      .from("support_tickets")
      .select(`
        *,
        author:users(name, email),
        institute:institutes(name)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      // If table doesn't exist yet, return empty array gracefully
      if (error.code === '42P01') {
        res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0 }
        });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
      }
    });
  } catch (err: any) {
    console.error("[listAllTickets] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
