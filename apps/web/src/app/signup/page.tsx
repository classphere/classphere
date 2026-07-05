"use client";

import { useState } from "react";
import Link from "next/link";
import { RiFlashlightFill, RiEyeLine, RiEyeOffLine, RiAlertLine, RiCheckLine } from "@remixicon/react";
import { supabase } from "@/lib/supabase";

import { API_URL } from "@/lib/api.client";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [exam, setExam] = useState<"JEE" | "NEET" | "Both">("JEE");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    // 1. Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          name: form.name.trim(),
          exam_target: exam,
        },
      },
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        setError("This email is already registered. Try logging in instead.");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    // 2. Call our backend to create the public.users row + initial profile
    if (authData?.user) {
      try {
        await fetch(`${API_URL}/api/v1/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: authData.user.id,
            name: form.name.trim(),
            email: form.email.trim(),
            exam_target: exam,
          }),
        });
      } catch {
        // Non-fatal — the user still exists in Supabase Auth, the backend row
        // will be created on first getMe call if needed
      }
    }

    setSuccess(true);
    setLoading(false);
    // AuthContext will pick up the SIGNED_IN event and redirect automatically
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-b-surface1 px-4">
        <div className="w-full max-w-[420px] text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-[rgba(0,166,86,0.1)] border border-s-stroke2/40 mx-auto mb-6">
            <RiCheckLine size={28} className="text-primary-02" />
          </div>
          <h1 className="font-sans text-[24px] font-semibold text-t-primary dark:text-t-primary mb-2">
            Account created!
          </h1>
          <p className="font-sans text-[14px] text-t-secondary mb-8">
            Check your inbox to verify your email, then log in to start your prep.
          </p>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center px-8 rounded-lg bg-shade-02 text-t-light font-sans text-[14px] font-semibold transition-all hover:bg-shade-03 active:scale-[0.98]"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-b-surface1 px-4 py-8">
      <div className="w-full max-w-[440px]">

        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/login" className="inline-flex items-center gap-2.5 no-underline mb-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-shade-02 text-t-light shadow-[inset_0px_1px_1px_rgba(214,214,214,0.25),inset_0px_-1px_2px_rgba(0,0,0,0.53)]">
              <RiFlashlightFill size={20} />
            </div>
            <span className="font-sans text-[22px] font-bold text-t-primary dark:text-t-primary tracking-tight">
              ExamPrep
            </span>
          </Link>
          <h1 className="font-sans text-[28px] font-semibold text-t-primary dark:text-t-primary tracking-tight mt-4 mb-2">
            Start your prep today
          </h1>
          <p className="font-sans text-[14px] text-t-secondary">
            Free account — no credit card needed
          </p>
        </div>

        {/* Card */}
        <div className="bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/40 rounded-lg shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] p-8">

          {error && (
            <div className="flex items-start gap-3 mb-6 p-4 rounded-lg bg-[rgba(255,106,85,0.05)] border border-s-stroke2/40">
              <RiAlertLine size={18} className="text-primary-03 shrink-0 mt-0.5" />
              <span className="font-sans text-[13px] text-primary-03 leading-[150%]">{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="flex flex-col gap-5">
            {/* Name */}
            <div className="flex flex-col gap-2">
              <label htmlFor="signup-name" className="font-sans text-[13px] font-semibold text-t-primary dark:text-t-primary">
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                placeholder="Harsh Singh"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoComplete="name"
                className="h-12 w-full rounded-lg border border-s-stroke2 dark:border-s-stroke2 bg-b-surface1 dark:bg-b-surface3 px-4 font-sans text-[14px] text-t-primary dark:text-t-primary placeholder:text-t-secondary outline-none transition-all focus:border-t-primary dark:focus:border-t-secondary"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label htmlFor="signup-email" className="font-sans text-[13px] font-semibold text-t-primary dark:text-t-primary">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                className="h-12 w-full rounded-lg border border-s-stroke2 dark:border-s-stroke2 bg-b-surface1 dark:bg-b-surface3 px-4 font-sans text-[14px] text-t-primary dark:text-t-primary placeholder:text-t-secondary outline-none transition-all focus:border-t-primary dark:focus:border-t-secondary"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="signup-password" className="font-sans text-[13px] font-semibold text-t-primary dark:text-t-primary">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="new-password"
                  className="h-12 w-full rounded-lg border border-s-stroke2 dark:border-s-stroke2 bg-b-surface1 dark:bg-b-surface3 px-4 pr-12 font-sans text-[14px] text-t-primary dark:text-t-primary placeholder:text-t-secondary outline-none transition-all focus:border-t-primary dark:focus:border-t-secondary"
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

            {/* Exam Selection */}
            <div className="flex flex-col gap-2">
              <label className="font-sans text-[13px] font-semibold text-t-primary dark:text-t-primary">
                I am preparing for
              </label>
              <div className="flex gap-2">
                {(["JEE", "NEET", "Both"] as const).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setExam(e)}
                    className={`flex-1 h-12 rounded-lg font-sans text-[13px] font-semibold transition-all cursor-pointer border ${
                      exam === e
                        ? "bg-[rgba(16,16,16,0.04)] dark:bg-b-surface1 border-t-primary dark:border-t-primary text-t-primary dark:text-t-primary"
                        : "bg-transparent border-s-stroke2 dark:border-s-stroke2 text-t-secondary hover:border-t-primary hover:text-t-primary"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="mt-1 flex h-12 w-full items-center justify-center rounded-lg bg-shade-02 hover:bg-shade-03 dark:bg-t-primary dark:text-b-surface1 text-t-light font-sans text-[14px] font-semibold transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-widget cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-s-border/30 border-t-[#FDFDFD] rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : "Create Free Account"}
            </button>
          </form>

          <p className="font-sans text-[11px] text-center text-t-secondary mt-6 leading-[160%]">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p className="font-sans text-[13px] text-center mt-6 text-t-secondary">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-t-primary dark:text-t-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
