import { Request, Response } from "express";

/**
 * POST /api/v1/auth/signup
 * Public — Register a new user with email + password via Supabase Auth.
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // 1. Validate req.body: { email, password, name }
    // 2. Call supabaseAdmin.auth.admin.createUser({ email, password, user_metadata: { name } })
    // 3. On success, insert a row into the public.users table (id from auth, name, email, role='student')
    // 4. Return { success: true, data: { user: { id, email, name, role } } }
    res.status(201).json({ success: true, message: "signup — TODO: implement" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/auth/login
 * Public — Login is handled client-side via Supabase JS SDK.
 * This endpoint can be used for server-side token exchange if needed.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement (optional server-side login if needed)
    // Note: Supabase recommends client-side signInWithPassword — this route is a stub.
    // If needed:
    // 1. Validate req.body: { email, password }
    // 2. Call supabase.auth.signInWithPassword({ email, password })
    // 3. Return { success: true, data: { session, user } }
    res.status(200).json({ success: true, message: "login — TODO: implement" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/auth/join-batch
 * Authenticated — Join a batch using an invite code.
 */
export const joinBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // 1. Validate req.body: { invite_code: string }
    // 2. Look up batch_invites where code = invite_code AND is_active = true AND expires_at > now()
    // 3. Check max_uses not exceeded (used_count < max_uses or max_uses IS NULL)
    // 4. Insert into batch_students: { batch_id, student_id: req.user!.id }
    //    — handle UNIQUE conflict (student already in batch)
    // 5. Increment used_count on batch_invites
    // 6. Return { success: true, data: { batch_id, batch_name, message: "Joined successfully" } }
    res.status(200).json({ success: true, message: "joinBatch — TODO: implement" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/auth/me
 * Authenticated — Return the current user's profile.
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // 1. SELECT * FROM users WHERE id = req.user!.id
    // 2. Also fetch enrolled batches: SELECT b.* FROM batches b JOIN batch_students bs ON b.id = bs.batch_id WHERE bs.student_id = req.user!.id
    // 3. Return { success: true, data: { user, batches } }
    res.status(200).json({ success: true, message: "getMe — TODO: implement", user: req.user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/v1/auth/me
 * Authenticated — Update the current user's profile.
 */
export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // 1. Validate req.body (allow: name, avatar_url — disallow: role, email)
    // 2. UPDATE users SET name = $1, avatar_url = $2, updated_at = now() WHERE id = req.user!.id
    // 3. Return { success: true, data: { user: updated_row } }
    res.status(200).json({ success: true, message: "updateMe — TODO: implement" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
