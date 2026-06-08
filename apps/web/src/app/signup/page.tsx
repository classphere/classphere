"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    localStorage.setItem("ep_auth", "true");
    router.push("/dashboard");
  };

  return (
    <main
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "var(--bg-primary)", padding: "24px",
        position: "relative", overflow: "hidden",
      }}
    >
      <div className="orb" style={{ width: 400, height: 400, background: "#a855f7", top: "-5%", right: "15%", opacity: 0.1 }} />
      <div className="orb" style={{ width: 350, height: 350, background: "#f97316", bottom: "5%", left: "15%", opacity: 0.08 }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #f97316, #eab308)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#000" }}>E</div>
            <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "#f1f5f9" }}>Exam<span style={{ color: "#f97316" }}>Prep</span></span>
          </Link>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f1f5f9", marginTop: 16, marginBottom: 6 }}>
            Start your prep today
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Free account — no credit card needed</p>
        </div>

        <div className="glass" style={{ borderRadius: 20, padding: "36px 32px" }}>
          <form onSubmit={handleSignup}>
            {[
              { id: "name", label: "Full Name", type: "text", placeholder: "Harsh Singh" },
              { id: "email", label: "Email", type: "email", placeholder: "you@example.com" },
              { id: "password", label: "Password", type: "password", placeholder: "Minimum 8 characters" },
            ].map((field) => (
              <div key={field.id} style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>
                  {field.label}
                </label>
                <input
                  id={`signup-${field.id}`}
                  type={field.type}
                  className="input-field"
                  placeholder={field.placeholder}
                  value={form[field.id as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field.id]: e.target.value })}
                  required
                />
              </div>
            ))}

            {/* Exam selection */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: 10 }}>
                I am preparing for
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                {["JEE", "NEET", "Both"].map((exam) => (
                  <button
                    key={exam}
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: "center", padding: "10px 8px", fontSize: "0.85rem" }}
                  >
                    {exam}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="signup-submit"
              type="submit"
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "0.95rem" }}
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Free Account →"}
            </button>
          </form>

          <p style={{ fontSize: "0.72rem", color: "#334155", textAlign: "center", marginTop: 16 }}>
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, color: "#475569", fontSize: "0.85rem" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#f97316", fontWeight: 600, textDecoration: "none" }}>Log in</Link>
        </p>
      </div>
    </main>
  );
}
