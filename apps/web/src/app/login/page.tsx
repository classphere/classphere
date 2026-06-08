"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
      router.push("/dashboard");
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
        background: "var(--bg-primary)",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Orbs */}
      <div className="orb" style={{ width: 400, height: 400, background: "#f97316", top: "-10%", left: "20%", opacity: 0.1 }} />
      <div className="orb" style={{ width: 300, height: 300, background: "#a855f7", bottom: "0%", right: "20%", opacity: 0.08 }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, #f97316, #eab308)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 900, color: "#000",
              }}
            >E</div>
            <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "#f1f5f9" }}>
              Exam<span style={{ color: "#f97316" }}>Prep</span>
            </span>
          </Link>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f1f5f9", marginTop: 16, marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Log in to continue your prep streak</p>
        </div>

        {/* Card */}
        <div
          className="glass"
          style={{ borderRadius: 20, padding: "36px 32px" }}
        >
          {error && (
            <div
              className="badge badge-red"
              style={{ width: "100%", justifyContent: "center", marginBottom: 20, padding: "12px 16px", borderRadius: 10 }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "0.95rem" }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div className="divider" style={{ flex: 1 }} />
              <span style={{ color: "#334155", fontSize: "0.75rem" }}>or continue with</span>
              <div className="divider" style={{ flex: 1 }} />
            </div>
            <button
              className="btn-secondary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => {
                localStorage.setItem("ep_auth", "true");
                router.push("/dashboard");
              }}
            >
              <span>G</span> Google
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, color: "#475569", fontSize: "0.85rem" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "#f97316", fontWeight: 600, textDecoration: "none" }}>
            Sign up free
          </Link>
        </p>
      </div>
    </main>
  );
}
