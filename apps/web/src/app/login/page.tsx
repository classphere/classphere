"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RiFlashlightFill } from "@remixicon/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    // Mock auth
    await new Promise((r) => setTimeout(r, 900));
    if (email && password) {
      localStorage.setItem("ep_auth", "true");
      router.push("/");
    } else {
      setError("Please enter your email and password.");
    }
    setLoading(false);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-default)",
        padding: "var(--space-600)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-800)" }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--secondary-50)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white",
              }}
            ><RiFlashlightFill size={18} /></div>
            <span style={{ fontWeight: 800, fontSize: 20, color: "var(--fg-default)" }}>
              ExamPrep
            </span>
          </Link>
          <h1 className="text-h2" style={{ marginTop: 16, marginBottom: 8 }}>
            Welcome back
          </h1>
          <p className="text-body-base" style={{ color: "var(--fg-muted)" }}>Log in to continue your prep streak</p>
        </div>

        {/* Card */}
        <div className="rayum-card" style={{ padding: 40 }}>
          {error && (
            <div
              className="rayum-badge"
              style={{ background: "var(--error-10)", color: "var(--error-50)", width: "100%", justifyContent: "center", marginBottom: 20, padding: "12px 16px", borderRadius: "var(--radius-sm)" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label className="text-body-small" style={{ display: "block", fontWeight: 600, color: "var(--fg-default)", marginBottom: 8 }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)",
                  background: "var(--bg-default)", color: "var(--fg-default)", fontSize: 14, outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--primary-50)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border-default)"}
              />
            </div>

            <div style={{ marginBottom: 32 }}>
              <label className="text-body-small" style={{ display: "block", fontWeight: 600, color: "var(--fg-default)", marginBottom: 8 }}>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)",
                  background: "var(--bg-default)", color: "var(--fg-default)", fontSize: 14, outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--primary-50)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border-default)"}
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: 14 }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              <span style={{ color: "var(--fg-muted)", fontSize: 12 }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
            </div>
            <button
              className="btn btn-outline"
              style={{ width: "100%", padding: 12 }}
              onClick={() => {
                localStorage.setItem("ep_auth", "true");
                router.push("/");
              }}
            >
              <span>G</span> Google
            </button>
          </div>
        </div>

        <p className="text-body-small" style={{ textAlign: "center", marginTop: 24, color: "var(--fg-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "var(--secondary-50)", fontWeight: 600, textDecoration: "none" }}>
            Sign up free
          </Link>
        </p>
      </div>
    </main>
  );
}
