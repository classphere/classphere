"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  RiFlashlightFill, 
  RiEyeLine, 
  RiEyeOffLine, 
  RiAlertLine, 
  RiDeviceLine, 
  RiArrowRightUpLine
} from "@remixicon/react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/lib/tenant-context";
import { storeSessionToken } from "@/lib/auth-context";

import { API_URL } from "@/lib/api.client";

// ── Helper: detect if a string looks like a phone number ─────────────────────
function isPhoneNumber(value: string): boolean {
  return /^\d{6,}$/.test(value.trim());
}

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
      await supabase.auth.setSession({
        access_token: json.data.access_token,
        refresh_token: json.data.refresh_token,
      });
    } catch (err: any) {
      setError(err.message ?? "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const displayName = tenant.instituteName ?? "Classphere";

  // The institute's own mark, falling back to Classphere's when a tenant has
  // not uploaded one. Rendered at two sizes because the cover panel it used to
  // sit on is hidden below md — without the second placement a student signing
  // in on a phone sees no institute branding at all.
  const instituteLogo = (size: number, className: string) => (
    <Image
      src={tenant.logoUrl ?? "/logoC.png"}
      alt={displayName}
      width={size}
      height={size}
      className={className}
    />
  );

  return (
    <main className="min-h-screen flex items-center justify-center bg-b-surface1 px-4 py-8 font-manrope">
      
      {/* Outer Card Container (Split Layout, inspired by reference image) */}
      <div className="w-full max-w-[860px] flex flex-col md:flex-row bg-b-surface2 border border-s-stroke2 rounded-[24px] overflow-hidden p-2 gap-4">
        
        {/* ── Left Panel (Cover Image Container) ── */}
        <section className="hidden md:flex md:w-[45%] shrink-0 relative rounded-[18px] overflow-hidden aspect-[4/5] bg-zinc-950">
          
          {/* Volcanic sand dune landscape matching the reference image aesthetic */}
          <Image
            src="https://images.unsplash.com/photo-1541844053589-346841d0b34c?auto=format&fit=crop&w=800&q=80"
            alt="Dune cover image"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

          {/* Institute mark, over the gradient so it stays legible on any cover */}
          <div className="absolute left-6 top-6 z-10 flex items-center gap-2.5">
            <span className="flex size-11 items-center justify-center rounded-[10px] border border-white/15 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm">
              {instituteLogo(44, "max-h-full w-auto object-contain")}
            </span>
            <span className="max-w-[180px] truncate font-urbanist text-[15px] font-bold text-white/95 drop-shadow">
              {displayName}
            </span>
          </div>

          {/* Slogan at the bottom */}
          <div className="absolute bottom-8 left-6 right-6 z-10">
            <h2 className="font-urbanist text-[22px] font-bold leading-snug text-white/95">
              Empowering Student Success,<br />
              Enhancing Academy Performance.
            </h2>
          </div>

        </section>

        {/* ── Right Panel (Login Form Container) ── */}
        <section className="flex-1 flex flex-col justify-center px-4 py-8 md:px-8">
          
          <div className="flex flex-col gap-6">
            
            {/* Header */}
            <div>
              {/* Phones never see the cover panel, so the mark belongs here too.
                  Hidden on md+ to avoid showing it twice on the split layout. */}
              <span className="mb-4 flex size-12 items-center justify-center rounded-[12px] border border-s-stroke2 bg-b-surface1 p-2 shadow-widget md:hidden">
                {instituteLogo(48, "max-h-full w-auto object-contain")}
              </span>
              <h1 className="font-urbanist text-[26px] font-bold tracking-tight text-t-primary leading-tight">
                Welcome back
              </h1>
              <p className="text-[14px] text-t-secondary mt-1">
                {tenant.domain ? `Access your portal for ${displayName}` : "Enter your credentials to continue"}
              </p>
            </div>

            {/* Device conflict banner */}
            {redirectReason === "device_conflict" && (
              <div className="flex items-start gap-3 p-4 rounded-[10px] border border-primary-05/15 bg-primary-05/5">
                <RiDeviceLine size={18} className="text-primary-05 shrink-0 mt-0.5" />
                <span className="text-[13px] text-primary-05 font-medium leading-relaxed">
                  You were signed out because your session was initialized on another terminal.
                </span>
              </div>
            )}

            {/* Error messaging */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-[10px] border border-primary-03/15 bg-primary-03/5">
                <RiAlertLine size={18} className="text-primary-03 shrink-0 mt-0.5" />
                <span className="text-[13px] text-primary-03 font-medium leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              
              {/* Field 1 */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-credential" className="text-[12px] font-bold text-t-primary uppercase tracking-wide">
                  Phone Number or Email
                </label>
                <input
                  id="login-credential"
                  type="text"
                  placeholder="9876543210 or name@domain.com"
                  value={credential}
                  onChange={(e) => {
                    setCredential(e.target.value);
                    setSecondField("");
                  }}
                  required
                  autoComplete="username"
                  className="input"
                />
                
                {/* Type helper badges */}
                {credential.length > 3 && (
                  <div className="text-[11px] text-t-tertiary font-semibold pl-1">
                    {isPhoneNumber(credential)
                      ? "🔢 Student login detected (DOB required)"
                      : "📧 Staff login detected (Password required)"}
                  </div>
                )}
              </div>

              {/* Field 2 */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-second" className="text-[12px] font-bold text-t-primary uppercase tracking-wide">
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
                  {loginType === "email_password" && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-t-secondary hover:text-t-primary transition-colors cursor-pointer"
                    >
                      {showPassword ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
                    </button>
                  )}
                </div>
                {loginType === "phone_dob" && (
                  <p className="text-[11px] text-t-tertiary pl-1">
                    Format: DDMMYYYY (e.g. 15082005)
                  </p>
                )}
              </div>

              {/* Submit CTA */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : "Sign In"}
              </button>

            </form>

            {/* Portal link */}
            {!tenant.domain && (
              <p className="text-[13px] text-center text-t-secondary font-medium pt-2">
                Portal Administration?{" "}
                <Link href="/superadmin/login" className="font-bold text-t-primary hover:underline inline-flex items-center gap-0.5">
                  Super Admin Panel <RiArrowRightUpLine size={14} />
                </Link>
              </p>
            )}

          </div>

        </section>

      </div>
    </main>
  );
}

// ── Page wrapper with Suspense (required for useSearchParams in Next.js App Router) ──
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-b-surface1">
        <span className="size-8 border-2 border-primary-01/30 border-t-primary-01 rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
