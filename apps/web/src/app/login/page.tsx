"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RiFlashlightFill, RiEyeLine, RiEyeOffLine, RiAlertLine } from "@remixicon/react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      // Map Supabase error messages to user-friendly strings
      if (authError.message.includes("Invalid login credentials")) {
        setError("Incorrect email or password. Please try again.");
      } else if (authError.message.includes("Email not confirmed")) {
        setError("Please verify your email before logging in. Check your inbox.");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    // ── Success: redirect based on role baked into app_metadata ─────────────
    // app_metadata.role is set during institute provisioning (createUser step).
    // Fallback to user_metadata.role, then default to student dashboard.
    const role =
      data.user?.app_metadata?.role ||
      data.user?.user_metadata?.role ||
      "student";

    if (role === "super_admin") {
      router.push("/superadmin");
    } else if (role === "institute_admin") {
      router.push("/institute");
    } else {
      router.push("/");
    }
    // Note: setLoading(false) is intentionally omitted here —
    // keeping the spinner visible during navigation gives a smoother UX.
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-b-surface1 px-4">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/login" className="inline-flex items-center gap-2.5 no-underline mb-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-t-primary text-b-surface1 shadow-widget">
              <RiFlashlightFill size={20} />
            </div>
            <span className="t-title-page-s tracking-tight text-t-primary">
              ExamPrep
            </span>
          </Link>
          <h1 className="t-title-page-s tracking-tight mt-4 mb-2">
            Welcome back
          </h1>
          <p className="t-body-base text-t-secondary">
            Log in to continue your prep streak
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
                <label htmlFor="login-email" className="t-sub-s text-t-primary">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="input"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label htmlFor="login-password" className="t-sub-s text-t-primary">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-t-secondary hover:text-t-primary transition-colors"
                  >
                    {showPassword ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        <p className="t-body-base text-center mt-6 text-t-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-t-primary hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </main>
  );
}
