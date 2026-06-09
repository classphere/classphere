"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RiFlashlightFill } from "@remixicon/react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState<"JEE" | "NEET" | "Both">("JEE");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    localStorage.setItem("ep_auth", "true");
    router.push("/");
  };

  return (
    <main
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "var(--bg-default)", padding: "var(--space-600)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-800)" }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--secondary-50)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}><RiFlashlightFill size={18} /></div>
            <span style={{ fontWeight: 800, fontSize: 20, color: "var(--fg-default)" }}>ExamPrep</span>
          </Link>
          <h1 className="text-h2" style={{ marginTop: 16, marginBottom: 8 }}>
            Start your prep today
          </h1>
          <p className="text-body-base" style={{ color: "var(--fg-muted)" }}>Free account — no credit card needed</p>
        </div>

        <div className="rayum-card" style={{ padding: 40 }}>
          <form onSubmit={handleSignup}>
            {[
              { id: "name", label: "Full Name", type: "text", placeholder: "Harsh Singh" },
              { id: "email", label: "Email", type: "email", placeholder: "you@example.com" },
              { id: "password", label: "Password", type: "password", placeholder: "Minimum 8 characters" },
            ].map((field) => (
              <div key={field.id} style={{ marginBottom: 20 }}>
                <label className="text-body-small" style={{ display: "block", fontWeight: 600, color: "var(--fg-default)", marginBottom: 8 }}>
                  {field.label}
                </label>
                <input
                  id={`signup-${field.id}`}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={form[field.id as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field.id]: e.target.value })}
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
            ))}

            {/* Exam selection */}
            <div style={{ marginBottom: 32 }}>
              <label className="text-body-small" style={{ display: "block", fontWeight: 600, color: "var(--fg-default)", marginBottom: 10 }}>
                I am preparing for
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                {(["JEE", "NEET", "Both"] as const).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setExam(e)}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: 14, fontWeight: 600,
                      background: exam === e ? "var(--primary-10)" : "var(--bg-default)",
                      border: exam === e ? "1.5px solid var(--primary-50)" : "1.5px solid var(--border-default)",
                      color: exam === e ? "var(--fg-default)" : "var(--fg-muted)",
                      transition: "all 0.15s"
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="signup-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: 14 }}
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Free Account"}
            </button>
          </form>

          <p style={{ fontSize: 12, color: "var(--fg-muted)", textAlign: "center", marginTop: 24 }}>
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p className="text-body-small" style={{ textAlign: "center", marginTop: 24, color: "var(--fg-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--secondary-50)", fontWeight: 600, textDecoration: "none" }}>Log in</Link>
        </p>
      </div>
    </main>
  );
}
