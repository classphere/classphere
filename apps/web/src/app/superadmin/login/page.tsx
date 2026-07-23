"use client";

import { useState } from "react";
import Image from "next/image";
import { RiEyeLine, RiEyeOffLine, RiAlertLine, RiShieldCheckLine } from "@remixicon/react";
import { supabase } from "@/lib/supabase";
import { storeSessionToken } from "@/lib/auth-context";
import { API_URL } from "@/lib/api.client";

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
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
      if (json.data.user.role !== "super_admin") {
        setError("This account does not have platform administrator access.");
        setLoading(false);
        return;
      }

      storeSessionToken(json.data.session_token);
      await supabase.auth.setSession({
        access_token: json.data.access_token,
        refresh_token: json.data.refresh_token,
      });
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-b-surface1 px-4 py-8 font-manrope">
      <div className="w-full max-w-[860px] flex flex-col md:flex-row gap-4 overflow-hidden rounded-[24px] border border-s-stroke2 bg-b-surface2 p-2">
        <section className="relative hidden aspect-[4/5] shrink-0 overflow-hidden rounded-[18px] bg-[#151515] md:flex md:w-[45%]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,157,61,0.24),transparent_38%),linear-gradient(145deg,#1e1e1e,#090909)]" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
          <div className="absolute left-7 top-7 flex items-center gap-3">
            <Image src="/logoC.png" alt="Classphere" width={44} height={44} className="size-11 rounded-[10px] object-contain bg-white/10" />
            <span className="text-lg font-bold tracking-tight text-white">Classphere</span>
          </div>
          <div className="absolute bottom-8 left-7 right-7">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-orange-200">
              <RiShieldCheckLine size={15} /> PLATFORM CONTROL
            </div>
            <h1 className="font-urbanist text-[27px] font-bold leading-snug text-white">Operate every institute with confidence.</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/65">Secure access to Classphere’s platform administration.</p>
          </div>
        </section>

        <section className="flex flex-1 flex-col justify-center px-4 py-8 md:px-8">
          <div className="flex flex-col gap-6">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-primary-01">
                <RiShieldCheckLine size={15} /> SUPER ADMIN PORTAL
              </div>
              <h1 className="font-urbanist text-[26px] font-bold leading-tight tracking-tight text-t-primary">Welcome back</h1>
              <p className="mt-1 text-[14px] text-t-secondary">Sign in to manage the Classphere platform.</p>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-[10px] border border-primary-03/15 bg-primary-03/5 p-4">
                <RiAlertLine size={18} className="mt-0.5 shrink-0 text-primary-03" />
                <span className="text-[13px] font-medium leading-relaxed text-primary-03">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="admin-email" className="text-[12px] font-bold uppercase tracking-wide text-t-primary">Email</label>
                <input
                  id="admin-email"
                  type="email"
                  placeholder="admin@classphere.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="admin-password" className="text-[12px] font-bold uppercase tracking-wide text-t-primary">Password</label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    className="input pr-12"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-t-secondary transition-colors hover:text-t-primary"
                  >
                    {showPassword ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
                  </button>
                </div>
              </div>

              <button id="admin-login-submit" type="submit" disabled={loading} className="btn btn-primary mt-2 w-full">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Verifying access...
                  </span>
                ) : "Sign In to Admin"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
