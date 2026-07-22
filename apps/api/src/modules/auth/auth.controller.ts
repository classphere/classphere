import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { createRequestAuthClient, supabaseAdmin, supabaseDB } from "../../lib/supabase";
import { invalidateAuthContext, expectedBoundSessionToken } from "../../middleware/auth.middleware";

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/login
 * Public — no middleware (authLimiter applied at the route).
 *
 * Handles two login types:
 *   - phone_dob  : Student login via Phone Number + Date of Birth
 *   - email_password : Staff login (teacher, institute_admin, super_admin) via Email + Password
 *
 * Enforces:
 *   - Tenant isolation: user must belong to the institute matching institute_slug
 *   - One-device: generates a new active_session_token on every login, kicking other devices
 *   - Mid-test protection: blocks login from a second device if student has an in_progress attempt
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { login_type, phone, dob, email, password, institute_slug } = req.body;

    // ── Build Supabase credentials ───────────────────────────────────────────
    let supabaseEmail: string;
    let supabasePassword: string;
    console.debug("[login] received login_type:", login_type, "institute_slug:", institute_slug);

    if (login_type === "phone_dob") {
      if (!phone || !dob) {
        res.status(400).json({ success: false, message: "phone and dob are required for student login." });
        return;
      }

      let resolvedSlug = String(institute_slug || "").toLowerCase().trim();
      if (resolvedSlug.includes("localhost")) {
        resolvedSlug = resolvedSlug.split(".")[0];
      }

      if (!resolvedSlug) {
        // Attempt to auto-resolve institute by phone
        const { data: matchedUsers } = await supabaseDB
          .from("users")
          .select("institute_id")
          .eq("phone", String(phone).trim())
          .eq("role", "student");

        if (!matchedUsers || matchedUsers.length === 0) {
          res.status(401).json({ success: false, message: "Invalid credentials. Please check and try again." });
          return;
        }
        if (matchedUsers.length > 1) {
          // More than one student found with this phone (possibly across institutes)
          res.status(400).json({ success: false, message: "Your phone is registered in multiple institutes. Please use your institute's specific login URL (e.g. institute.classphere.com)." });
          return;
        }

        // Exactly one match
        const { data: instData } = await supabaseDB
          .from("institutes")
          .select("subdomain_slug")
          .eq("id", matchedUsers[0].institute_id)
          .single();

        if (!instData) {
          res.status(401).json({ success: false, message: "Invalid credentials. Please check and try again." });
          return;
        }

        resolvedSlug = instData.subdomain_slug || "unknown";
        req.body.institute_slug = resolvedSlug; // For subsequent tenant isolation checks below
      }

      // Shadow email: 9876543210_15082005@saksham.classphere.com
      supabaseEmail = `${String(phone).trim()}_${String(dob).trim()}@${resolvedSlug}.classphere.com`;
      supabasePassword = String(dob).trim();
    } else if (login_type === "email_password") {
      if (!email || !password) {
        res.status(400).json({ success: false, message: "email and password are required." });
        return;
      }
      supabaseEmail = String(email).trim().toLowerCase();
      supabasePassword = String(password);
    } else {
      res.status(400).json({ success: false, message: "login_type must be 'phone_dob' or 'email_password'." });
      return;
    }

    // ── Authenticate via Supabase ─────────────────────────────────────────────
    const { data: authData, error: authError } = await createRequestAuthClient().auth.signInWithPassword({
      email: supabaseEmail,
      password: supabasePassword,
    });

    if (authError || !authData.session) {
      // Generic message — never reveal whether user exists or not
      res.status(401).json({ success: false, message: "Invalid credentials. Please check and try again." });
      return;
    }

    const userId = authData.user.id;

    // ── Fetch user profile from DB ─────────────────────────────────────────────
    const { data: userRecord1, error: userError1 } = await supabaseDB
      .from("users")
      .select("id, name, email, role, avatar_url, institute_id, active_session_token")
      .eq("id", userId)
      .single();

    let userRecord = userRecord1;

    // Fallback A: If not found by ID, try by email (handles dev ID mismatch)
    if (!userRecord) {
      const { data: fallbackRecord } = await supabaseDB
        .from("users")
        .select("id, name, email, role, avatar_url, institute_id, active_session_token")
        .eq("email", supabaseEmail)
        .single();

      if (fallbackRecord) {
        userRecord = fallbackRecord;
        // Fix the ID mismatch so future logins work directly
        await supabaseDB.from("users").update({ id: userId }).eq("email", supabaseEmail);
      } else {
        // Fallback B: Auto-create profile from auth metadata
        const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (authUserData?.user) {
          const meta = authUserData.user.user_metadata ?? {};
          const roleFromMeta = (authUserData.user.app_metadata?.role as string) ?? "student";

          const { data: upserted } = await supabaseDB
            .from("users")
            .upsert({
              id: userId,
              name: meta.name ?? authUserData.user.email?.split("@")[0] ?? "User",
              email: supabaseEmail,
              role: roleFromMeta,
            }, { onConflict: "id" })
            .select("id, name, email, role, avatar_url, institute_id, active_session_token")
            .single();

          userRecord = upserted ?? null;
        }
      }
    }

    if (!userRecord) {
      console.error("[login] All fallbacks exhausted. Cannot find or create profile for:", supabaseEmail, "userId:", userId);
      res.status(500).json({ success: false, message: "User profile not found. Please contact support." });
      return;
    }

    // ── Tenant isolation check ─────────────────────────────────────────────────
    // If user belongs to an institute, require institute_slug (except for super_admin)
    if (userRecord.institute_id && userRecord.role !== "super_admin" && !institute_slug) {
      res.status(400).json({ success: false, message: "Institute slug is required for this account. Please log in using your institute's portal." });
      return;
    }

    if (institute_slug) {
      let sanitizedSlug = String(institute_slug).toLowerCase().trim();
      if (sanitizedSlug.includes("localhost")) {
        sanitizedSlug = sanitizedSlug.split(".")[0];
      }

      const { data: institute } = await supabaseDB
        .from("institutes")
        .select("id, subdomain_slug")
        .eq("subdomain_slug", sanitizedSlug)
        .eq("is_active", true)
        .single();

      if (!institute) {
        res.status(404).json({ success: false, message: "Institute not found." });
        return;
      }

      if (userRecord.institute_id !== institute.id) {
        res.status(403).json({
          success: false,
          code: "WRONG_TENANT",
          message: "This account does not belong to this institute. Please check your login URL.",
        });
        return;
      }
    }

    // ── Mid-test device protection ─────────────────────────────────────────────
    // If this user has an in_progress attempt AND already has an active session from another device,
    // block the new login to avoid corrupting the active test.
    if (userRecord.active_session_token) {
      const { data: activeAttempt } = await supabaseDB
        .from("attempts")
        .select("id")
        .eq("student_id", userId)
        .eq("status", "in_progress")
        .maybeSingle();

      if (activeAttempt) {
        res.status(409).json({
          success: false,
          code: "TEST_IN_PROGRESS",
          message: "This student is currently taking a test on another device. Login blocked to protect the ongoing test.",
        });
        return;
      }
    }

    // ── One-device: generate new session token ─────────────────────────────────
    // The client receives the plain token and sends it back on every request.
    // The DB stores the cryptographically bound form (HMAC of userId|token) so a
    // stolen JWT alone cannot forge a valid session token. See auth.middleware.
    const sessionToken = randomUUID();
    const storedToken = expectedBoundSessionToken(userId, sessionToken);

    await supabaseDB
      .from("users")
      .update({
        active_session_token: storedToken,
        last_login_at: new Date().toISOString(),
        last_login_device: (req.headers["user-agent"] ?? "unknown").substring(0, 255),
      })
      .eq("id", userId);

    // Drop the cached auth context so the next request re-reads the new token.
    await invalidateAuthContext(userId);

    // ── Success ───────────────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        session_token: sessionToken,
        user: {
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          role: userRecord.role,
          avatar_url: userRecord.avatar_url,
          institute_id: userRecord.institute_id,
          exam_target: (userRecord as any).exam_target ?? null,
          phone: (userRecord as any).phone ?? null,
        },
      },
    });
  } catch (err: any) {
    console.error("[login] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/auth/signup
 * Public — Called by the frontend after Supabase Auth creates the user (self-signup flow).
 * Creates the corresponding row in public.users.
 *
 * Body: { id, name, email, exam_target }
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, exam_target } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Authentication token required." });
      return;
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      res.status(401).json({ success: false, message: "Malformed authorization header." });
      return;
    }

    const { data: { user }, error: authError } = await createRequestAuthClient().auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ success: false, message: "Invalid or expired token." });
      return;
    }

    const id = user.id;
    const verifiedEmail = user.email || email;

    if (!name || !verifiedEmail) {
      res.status(400).json({ success: false, message: "Missing required fields: name, email" });
      return;
    }

    const { error } = await supabaseDB
      .from("users")
      .insert({
        id,
        name: name.trim(),
        email: verifiedEmail.toLowerCase().trim(),
        role: "student",
        exam_target: exam_target ?? "JEE",
      });

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
 * POST /api/v1/auth/create-student
 * Protected — institute_admin or super_admin only.
 *
 * Creates a student account using the shadow email pattern:
 *   phone_dob@slug.classphere.com
 *
 * The student logs in with their Phone Number + Date of Birth.
 * They never see or need an "email address".
 *
 * Body: { name, phone, date_of_birth (DDMMYYYY), institute_slug, batch_id? }
 */
export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, date_of_birth, institute_slug, batch_id } = req.body;
    const actorInstituteId = req.user?.institute_id;

    if (!name || !phone || !date_of_birth || !institute_slug) {
      res.status(400).json({ success: false, message: "name, phone, date_of_birth, and institute_slug are required." });
      return;
    }

    // Institute admins can only create students for their own institute
    if (req.user?.role === "institute_admin") {
      const { data: institute } = await supabaseDB
        .from("institutes")
        .select("id")
        .eq("subdomain_slug", institute_slug.toLowerCase().trim())
        .single();

      if (!institute || institute.id !== actorInstituteId) {
        res.status(403).json({ success: false, message: "You can only create students for your own institute." });
        return;
      }
    }

    // Resolve institute_id from slug
    let sanitizedSlug = String(institute_slug).toLowerCase().trim();
    if (sanitizedSlug.includes("localhost")) {
      sanitizedSlug = sanitizedSlug.split(".")[0];
    }

    const { data: institute } = await supabaseDB
      .from("institutes")
      .select("id")
      .eq("subdomain_slug", sanitizedSlug)
      .single();

    if (!institute) {
      res.status(404).json({ success: false, message: "Institute not found." });
      return;
    }

    // Build shadow email
    const shadowEmail = `${String(phone).trim()}_${String(date_of_birth).trim()}@${sanitizedSlug}.classphere.com`;

    // Create Supabase Auth user (email already confirmed — no verification email)
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: shadowEmail,
      password: String(date_of_birth).trim(),
      email_confirm: true,
      user_metadata: { name: name.trim() },
    });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        res.status(409).json({
          success: false,
          message: "A student with this phone number and date of birth already exists in this institute.",
        });
        return;
      }
      throw createError;
    }

    // Create public.users record
    await supabaseDB.from("users").insert({
      id: authUser.user!.id,
      name: name.trim(),
      email: shadowEmail,
      phone: String(phone).trim(),
      date_of_birth: String(date_of_birth).trim(),
      role: "student",
      institute_id: institute.id,
    });

    // Add to batch if provided
    if (batch_id) {
      const { error: batchError } = await supabaseDB.from("batch_students").insert({
        batch_id,
        student_id: authUser.user!.id,
      });
      if (batchError && batchError.code !== "23505") {
        // 23505 = duplicate — already in batch, not a hard error
        console.warn("[createStudent] batch insert warning:", batchError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `Student ${name.trim()} created successfully.`,
      data: { student_id: authUser.user!.id },
    });
  } catch (err: any) {
    console.error("[createStudent] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/auth/me
 * Authenticated — Returns the current user's full profile from public.users.
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const { data: user, error: userError } = await supabaseDB
      .from("users")
      .select("id, name, email, role, avatar_url, institute_id, phone, exam_target, created_at")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      // User exists in Supabase Auth but not in public.users — auto-create
      const authUser = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUser.data?.user) {
        const meta = authUser.data.user.user_metadata ?? {};
        const { error: createError } = await supabaseDB.from("users").upsert({
          id: userId,
          name: meta.name ?? authUser.data.user.email?.split("@")[0] ?? "User",
          email: authUser.data.user.email ?? "",
          role: (authUser.data.user.app_metadata?.role as string) ?? "student",
        }, { onConflict: "id" });

        if (createError) {
          res.status(500).json({ success: false, message: "Failed to initialise user profile" });
          return;
        }

        const { data: newUser } = await supabaseDB
          .from("users")
          .select("id, name, email, role, avatar_url, institute_id, phone, exam_target, created_at")
          .eq("id", userId)
          .single();

        res.status(200).json({ success: true, data: { user: newUser, batches: [] } });
        return;
      }

      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Fetch enrolled batches
    const { data: batchRows } = await supabaseDB
      .from("batch_students")
      .select("batch_id, batches(id, name, exam, institute_id)")
      .eq("student_id", userId);

    const batches = (batchRows ?? []).map((row: any) => row.batches).filter(Boolean);

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

    const { data: updatedUser, error } = await supabaseDB
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
