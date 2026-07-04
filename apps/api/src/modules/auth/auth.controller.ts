import { Request, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/signup
 * Public — Called by the frontend after Supabase Auth creates the user.
 * Creates the corresponding row in public.users.
 *
 * Body: { id, name, email, exam_target }
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, email, exam_target } = req.body;

    if (!id || !name || !email) {
      res.status(400).json({ success: false, message: "Missing required fields: id, name, email" });
      return;
    }

    // Upsert into public.users (in case the row already exists from a previous attempt)
    const { error } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          role: "student",
          exam_target: exam_target ?? "JEE",
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error("[signup] DB error:", error.message);
      res.status(500).json({ success: false, message: "Failed to create user profile: " + error.message });
      return;
    }

    res.status(201).json({
      success: true,
      message: "User profile created successfully.",
      data: { id, name, email, role: "student" },
    });
  } catch (err: any) {
    console.error("[signup] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/login
 * Public — Login is handled client-side via Supabase JS SDK.
 * This is just a stub that confirms the API is alive.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: "Login is handled client-side via Supabase Auth. Use the Supabase JS SDK.",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/auth/me
 * Authenticated — Returns the current user's full profile from public.users,
 * including their enrolled batches.
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    // Fetch user profile from public.users
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, name, email, role, avatar_url, exam_target, created_at")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      // User exists in Supabase Auth but not yet in public.users
      // This can happen if signup backend call failed — auto-create the row
      const authUser = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUser.data?.user) {
        const meta = authUser.data.user.user_metadata ?? {};
        const { error: createError } = await supabaseAdmin.from("users").upsert({
          id: userId,
          name: meta.name ?? authUser.data.user.email?.split("@")[0] ?? "User",
          email: authUser.data.user.email ?? "",
          role: (authUser.data.user.app_metadata?.role as string) ?? "student",
          exam_target: meta.exam_target ?? "JEE",
        }, { onConflict: "id" });

        if (createError) {
          res.status(500).json({ success: false, message: "Failed to initialise user profile" });
          return;
        }

        // Re-fetch
        const { data: newUser } = await supabaseAdmin
          .from("users")
          .select("id, name, email, role, avatar_url, exam_target, created_at")
          .eq("id", userId)
          .single();

        res.status(200).json({ success: true, data: { user: newUser, batches: [] } });
        return;
      }

      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Fetch enrolled batches
    const { data: batchRows } = await supabaseAdmin
      .from("batch_students")
      .select("batch_id, batches(id, name, exam, institute_id)")
      .eq("student_id", userId);

    const batches = (batchRows ?? [])
      .map((row: any) => row.batches)
      .filter(Boolean);

    res.status(200).json({ success: true, data: { user, batches } });
  } catch (err: any) {
    console.error("[getMe] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * PATCH /api/v1/auth/me
 * Authenticated — Update the current user's profile (name, avatar_url only).
 */
export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const { name, avatar_url } = req.body;
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updatePayload.name = String(name).trim();
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url;

    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update(updatePayload)
      .eq("id", userId)
      .select("id, name, email, role, avatar_url")
      .single();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(200).json({ success: true, data: { user: updatedUser } });
  } catch (err: any) {
    console.error("[updateMe] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/join-batch
 * Authenticated — Join a batch using an invite code.
 */
export const joinBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const { invite_code } = req.body;
    if (!invite_code) {
      res.status(400).json({ success: false, message: "Missing invite_code" });
      return;
    }

    // Look up the invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("batch_invites")
      .select("id, batch_id, is_active, expires_at, used_count, max_uses, batches(id, name)")
      .eq("code", invite_code.trim().toUpperCase())
      .single();

    if (inviteError || !invite) {
      res.status(404).json({ success: false, message: "Invalid invite code" });
      return;
    }

    if (!invite.is_active) {
      res.status(400).json({ success: false, message: "This invite link has been deactivated" });
      return;
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      res.status(400).json({ success: false, message: "This invite link has expired" });
      return;
    }

    if (invite.max_uses !== null && invite.used_count >= invite.max_uses) {
      res.status(400).json({ success: false, message: "This invite link has reached its maximum usage" });
      return;
    }

    // Add student to batch (UNIQUE constraint handles duplicates)
    const { error: joinError } = await supabaseAdmin
      .from("batch_students")
      .insert({ batch_id: invite.batch_id, student_id: studentId });

    if (joinError) {
      if (joinError.code === "23505") {
        res.status(409).json({ success: false, message: "You are already a member of this batch" });
        return;
      }
      throw joinError;
    }

    // Increment used_count
    await supabaseAdmin
      .from("batch_invites")
      .update({ used_count: invite.used_count + 1 })
      .eq("id", invite.id);

    const batch = (invite as any).batches;
    res.status(200).json({
      success: true,
      message: `Successfully joined batch: ${batch?.name ?? invite.batch_id}`,
      data: { batch_id: invite.batch_id, batch_name: batch?.name ?? null },
    });
  } catch (err: any) {
    console.error("[joinBatch] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
