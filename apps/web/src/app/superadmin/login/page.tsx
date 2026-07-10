"use client";

import { useState } from "react";
import { RiFlashlightFill, RiEyeLine, RiEyeOffLine, RiAlertLine, RiShieldCheckLine } from "@remixicon/react";
import { supabase } from "@/lib/supabase";

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

    // 1. Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      if (authError.message.includes("Invalid login credentials")) {
        setError("Incorrect email or password.");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    // 2. Verify super_admin role from our backend
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${authData.session?.access_token}`,
          "x-user-id": authData.user?.id ?? "",
        },
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        await supabase.auth.signOut();
        setError(`API Error: ${data.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }
      
      const role = data.data?.user?.role;

      if (role !== "super_admin") {
        // Sign them out immediately — they're not a super admin
        await supabase.auth.signOut();
        setError(`Access denied. Found role: ${role || 'undefined'}`);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // 3. Auth context picks up SIGNED_IN event and routes to /superadmin
    // (no manual redirect needed — AuthContext handles it)
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
            <div className="flex size-10 items-center justify-center rounded-lg bg-b-pop text-t-light shadow-widget">
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
          <div className="box-hover" />
          
          <div className="relative z-10">
            {error && (
              <div className="flex items-start gap-3 mb-6 p-4 rounded-lg border border-primary-03/15 bg-primary-03/5">
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
