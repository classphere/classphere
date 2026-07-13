"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { RiFlashlightFill, RiEyeLine, RiEyeOffLine, RiAlertLine, RiDeviceLine } from "@remixicon/react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant-context";
import { storeSessionToken } from "@/lib/auth-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Helper: detect if a string looks like a phone number ─────────────────────
function isPhoneNumber(value: string): boolean {
  return /^\d{6,}$/.test(value.trim());
}

// ── Inner component (reads searchParams) ─────────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenant = useTenant();

  const [credential, setCredential] = useState(""); // phone or email
  const [secondField, setSecondField] = useState(""); // dob or password
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reason for redirect (e.g. device_conflict)
  const redirectReason = searchParams.get("reason");

  // Derived state: what mode are we in?
  const loginType: "phone_dob" | "email_password" =
    credential.trim().length > 0 && isPhoneNumber(credential)
      ? "phone_dob"
      : "email_password";

  const secondFieldLabel = loginType === "phone_dob" ? "Date of Birth" : "Password";
  const secondFieldType = loginType === "phone_dob" || showPassword ? "text" : "password";
  const secondFieldPlaceholder = loginType === "phone_dob" ? "DDMMYYYY  (e.g. 15082005)" : "••••••••";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login_type: loginType,
          phone: loginType === "phone_dob" ? credential.trim() : undefined,
          dob: loginType === "phone_dob" ? secondField.trim() : undefined,
          email: loginType === "email_password" ? credential.trim() : undefined,
          password: loginType === "email_password" ? secondField : undefined,
          institute_slug: tenant.domain,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.code === "TEST_IN_PROGRESS") {
          setError("This account is currently taking a test on another device. Please finish the test first.");
        } else if (json.code === "WRONG_TENANT") {
          setError("This account does not belong to this institute. Please check your login URL.");
        } else {
          setError(json.message ?? "Login failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Store session token for one-device enforcement
      storeSessionToken(json.data.session_token);

      // Set Supabase session — this triggers onAuthStateChange in AuthContext
      // which handles the role-based redirect automatically
      await supabase.auth.setSession({
        access_token: json.data.access_token,
        refresh_token: json.data.refresh_token,
      });

      // AuthContext's onAuthStateChange will redirect — keep spinner going
    } catch (err: any) {
      setError(err.message ?? "An unexpected error occurred.");
      setLoading(false);
    }
  };

  // Branding: use institute logo/name if available, else fallback to Classphere
  const logoContent = tenant.logoUrl ? (
    <Image
      src={tenant.logoUrl}
      alt={tenant.instituteName ?? "Institute logo"}
      width={40}
      height={40}
      className="size-10 rounded-[10px] object-contain"
    />
  ) : (
    <div className="flex size-10 items-center justify-center rounded-[10px] bg-t-primary text-b-surface1 shadow-widget">
      <RiFlashlightFill size={20} />
    </div>
  );

  const displayName = tenant.instituteName ?? "Classphere";

  return (
    <main className="min-h-screen flex items-center justify-center bg-b-surface1 px-4">
      <div className="w-full max-w-[420px]">

        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 mb-6">
            {logoContent}
            <span className="t-title-page-s tracking-tight text-t-primary">
              {displayName}
            </span>
          </div>
          <h1 className="t-title-page-s tracking-tight mt-4 mb-2">
            Welcome back
          </h1>
          <p className="t-body-base text-t-secondary">
            {tenant.slug
              ? "Log in to continue your prep"
              : "Log in to your account"}
          </p>
        </div>

        {/* Card */}
        <div className="card group relative">
          <div className="relative z-10">

            {/* Device conflict banner */}
            {redirectReason === "device_conflict" && (
              <div className="flex items-start gap-3 mb-6 p-4 rounded-[10px] border border-amber-500/20 bg-amber-500/5">
                <RiDeviceLine size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <span className="t-body-base text-amber-600 dark:text-amber-400">
                  You were signed out because your account was opened on another device.
                </span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 mb-6 p-4 rounded-[10px] border border-primary-03/15 bg-primary-03/5">
                <RiAlertLine size={18} className="text-primary-03 shrink-0 mt-0.5" />
                <span className="t-body-base text-primary-03">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-5">

              {/* Credential field (phone or email — user just types) */}
              <div className="flex flex-col gap-2">
                <label htmlFor="login-credential" className="t-sub-s text-t-primary">
                  Phone Number or Email
                </label>
                <input
                  id="login-credential"
                  type="text"
                  inputMode="text"
                  placeholder="9876543210 or you@example.com"
                  value={credential}
                  onChange={(e) => {
                    setCredential(e.target.value);
                    setSecondField(""); // reset second field when credential changes
                  }}
                  required
                  autoComplete="username"
                  className="input"
                />
                {/* Subtle hint showing what was detected */}
                {credential.length > 3 && (
                  <p className="text-xs text-t-tertiary pl-1">
                    {isPhoneNumber(credential)
                      ? "🔢 Student login detected — enter your date of birth below"
                      : "📧 Staff login detected — enter your password below"}
                  </p>
                )}
              </div>

              {/* Second field: DOB or Password */}
              <div className="flex flex-col gap-2">
                <label htmlFor="login-second" className="t-sub-s text-t-primary">
                  {secondFieldLabel}
                </label>
                <div className="relative">
                  <input
                    id="login-second"
                    type={secondFieldType}
                    placeholder={secondFieldPlaceholder}
                    value={secondField}
                    onChange={(e) => setSecondField(e.target.value)}
                    required
                    autoComplete={loginType === "phone_dob" ? "off" : "current-password"}
                    maxLength={loginType === "phone_dob" ? 8 : undefined}
                    className="input pr-12"
                  />
                  {/* Show/hide toggle only for password */}
                  {loginType === "email_password" && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-t-secondary hover:text-t-primary transition-colors"
                    >
                      {showPassword ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
                    </button>
                  )}
                </div>
                {loginType === "phone_dob" && (
                  <p className="text-xs text-t-tertiary pl-1">
                    Enter your date of birth as 8 digits: DDMMYYYY
                  </p>
                )}
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

        {/* Footer note — only show on super admin or when no tenant is detected */}
        {!tenant.slug && (
          <p className="t-body-base text-center mt-6 text-t-secondary">
            Super Admin?{" "}
            <Link href="/superadmin/login" className="font-semibold text-t-primary hover:underline">
              Use admin login
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

// ── Page wrapper with Suspense (required for useSearchParams in Next.js App Router) ──
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
