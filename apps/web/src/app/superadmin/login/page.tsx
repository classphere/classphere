"use client";

import { useState } from "react";
import { RiFlashlightFill, RiEyeLine, RiEyeOffLine, RiAlertLine, RiShieldCheckLine } from "@remixicon/react";
import { supabase } from "@/lib/supabase";
import { storeSessionToken } from "@/lib/auth-context";
import { API_URL } from "@/lib/api.client";

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Call our backend login endpoint — no institute_slug = super admin path
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login_type: "email_password",
          email: email.trim(),
          password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? "Incorrect email or password.");
        setLoading(false);
        return;
      }

      // Verify the user is actually a super_admin
      if (json.data.user.role !== "super_admin") {
        setError(`Access denied. Found role: ${json.data.user.role || "undefined"}`);
        setLoading(false);
        return;
      }

      // Store session token
      storeSessionToken(json.data.session_token);

      // Set Supabase session — AuthContext's onAuthStateChange fires and redirects to /superadmin
      await supabase.auth.setSession({
        access_token: json.data.access_token,
        refresh_token: json.data.refresh_token,
      });

      // Keep spinner going — AuthContext handles redirect
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <main data-theme="dark" className="min-h-screen flex items-center justify-center bg-b-surface1 px-4 dark">

      {/* Subtle grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-10"
        style={{
          backgroundImage: "linear-gradient(var(--stroke-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--stroke-subtle) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-[400px]">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="flex size-10 items-center justify-center rounded-[10px] bg-b-pop text-t-light shadow-widget">
              <RiFlashlightFill size={20} className="text-t-primary" />
            </div>
            <span className="t-title-page-s text-t-primary tracking-tight">
              Classphere
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <RiShieldCheckLine size={16} className="text-primary-02" />
            <span className="t-label text-primary-02">
              SUPER ADMIN PORTAL
            </span>
          </div>
          
          <h1 className="t-title-page-s text-t-primary tracking-tight mb-2">
            Admin Sign In
          </h1>
          <p className="t-body-base text-t-secondary">
            Restricted access — authorised personnel only
          </p>
        </div>

        {/* Card */}
        <div className="card group relative">

          <div className="relative z-10">
            {error && (
              <div className="flex items-start gap-3 mb-6 p-4 rounded-[10px] border border-primary-03/15 bg-primary-03/5">
                <RiAlertLine size={18} className="text-primary-03 shrink-0 mt-0.5" />
                <span className="t-body-base text-primary-03">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label htmlFor="admin-email" className="t-label text-t-secondary">
                  EMAIL
                </label>
                <input
                  id="admin-email"
                  type="email"
                  placeholder="admin@classphere.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="input"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label htmlFor="admin-password" className="t-label text-t-secondary">
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-t-tertiary hover:text-t-primary transition-colors"
                  >
                    {showPassword ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
                  </button>
                </div>
              </div>

              <button
                id="admin-login-submit"
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    Verifying access...
                  </span>
                ) : "Sign In to Admin"}
              </button>
            </form>
          </div>
        </div>

        <p className="t-body-base text-center mt-6 text-t-tertiary">
          ← Back to{" "}
          <a href="/login" className="text-t-secondary hover:text-t-primary transition-colors hover:underline">
            student login
          </a>
        </p>
      </div>
    </main>
  );
}
