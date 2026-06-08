import Link from "next/link";

export default function LandingPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
      {/* ── Navbar ── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(8,12,20,0.7)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #f97316, #eab308)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 900, color: "#000",
            }}
          >E</div>
          <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#f1f5f9" }}>
            Exam<span style={{ color: "#f97316" }}>Prep</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/login" className="btn-ghost">Log in</Link>
          <Link href="/signup" className="btn-primary">Get Started Free</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          padding: "120px 24px 80px", position: "relative", textAlign: "center",
        }}
      >
        {/* Orbs */}
        <div className="orb" style={{ width: 500, height: 500, background: "#f97316", top: "10%", left: "20%", opacity: 0.12 }} />
        <div className="orb" style={{ width: 400, height: 400, background: "#a855f7", top: "20%", right: "15%", opacity: 0.10 }} />
        <div className="orb" style={{ width: 300, height: 300, background: "#eab308", bottom: "10%", left: "50%", opacity: 0.08 }} />

        <div style={{ maxWidth: 780, position: "relative", zIndex: 1 }}>
          <div className="section-label" style={{ marginBottom: 24 }}>
            🎯 JEE · NEET · SSC · UPSC
          </div>
          <h1
            style={{
              fontSize: "clamp(2.4rem, 6vw, 4rem)", fontWeight: 900, lineHeight: 1.1,
              marginBottom: 24, color: "#f1f5f9",
            }}
          >
            Don&apos;t just take tests.<br />
            <span className="gradient-text">Understand why you fail them.</span>
          </h1>
          <p
            style={{
              fontSize: "1.15rem", color: "#94a3b8", lineHeight: 1.7,
              marginBottom: 40, maxWidth: 600, margin: "0 auto 40px",
            }}
          >
            ExamPrep gives you AI-powered analysis after every test — not just a score,
            but exactly what you got wrong, why, and a 7-day plan to fix it.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" className="btn-primary" style={{ fontSize: "1rem", padding: "14px 32px" }}>
              Start for Free →
            </Link>
            <Link href="/dashboard" className="btn-secondary" style={{ fontSize: "1rem", padding: "14px 28px" }}>
              View Demo
            </Link>
          </div>
          <p style={{ marginTop: 20, color: "#475569", fontSize: "0.8rem" }}>
            No credit card required · Free for students · JEE question bank ready
          </p>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section style={{ padding: "0 24px 60px" }}>
        <div
          style={{
            maxWidth: 960, margin: "0 auto", display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1,
            background: "rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {[
            { value: "50,000+", label: "Questions" },
            { value: "12,000+", label: "Active Students" },
            { value: "94%", label: "Report Accuracy" },
            { value: "3x", label: "Score Improvement" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                padding: "32px 24px", textAlign: "center",
                background: "rgba(8,12,20,0.8)", borderRight: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="gradient-text" style={{ fontSize: "2.2rem", fontWeight: 900 }}>{s.value}</div>
              <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div className="section-label" style={{ marginBottom: 16 }}>Features</div>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "#f1f5f9" }}>
            Everything you need to crack the exam
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {[
            {
              icon: "🧠",
              title: "AI Analysis — After Every Test",
              desc: "Get a detailed breakdown of every mistake. Error patterns, weak topics, and concept gaps identified automatically.",
              accent: "#f97316",
            },
            {
              icon: "🎯",
              title: "Booster Tests — Close the Loop",
              desc: "Immediately after analysis, get a curated test on exactly the topics you struggled with. No dead ends.",
              accent: "#a855f7",
            },
            {
              icon: "📊",
              title: "Live Rankings & Streaks",
              desc: "See where you rank globally, within your batch, and in your institute. Daily streak keeps you consistent.",
              accent: "#eab308",
            },
            {
              icon: "🏫",
              title: "Institute & Batch Tools",
              desc: "Teachers get AI-powered batch analysis. Instantly know which chapters need re-teaching.",
              accent: "#22c55e",
            },
            {
              icon: "⚡",
              title: "Custom Test Builder",
              desc: "Pick exam, subjects, chapters, difficulty mix. Create a chapter test or a full mock in 30 seconds.",
              accent: "#3b82f6",
            },
            {
              icon: "📈",
              title: "Progress Tracking",
              desc: "Watch your improvement per topic over time. See the booster chain from weakness to mastery.",
              accent: "#ef4444",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="glass glass-hover"
              style={{ borderRadius: 16, padding: "28px 24px" }}
            >
              <div
                style={{
                  width: 48, height: 48, borderRadius: 12, marginBottom: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, background: `${f.accent}18`,
                  border: `1px solid ${f.accent}30`,
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "#f1f5f9", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        style={{
          padding: "80px 24px",
          background: "rgba(255,255,255,0.02)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <div className="section-label" style={{ marginBottom: 16 }}>How It Works</div>
          <h2 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 60 }}>
            From test to improvement in 3 steps
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 40 }}>
            {[
              { step: "01", title: "Take a Test", desc: "Create a custom test by exam, subject, chapter, difficulty — or use a preset." },
              { step: "02", title: "Get AI Analysis", desc: "Receive a detailed report in seconds. Weak topics, error patterns, and a 7-day study plan." },
              { step: "03", title: "Take the Booster", desc: "Auto-generated test on your exact weak areas. Watch your score jump on the same topics." },
            ].map((s, i) => (
              <div key={s.step} style={{ position: "relative" }}>
                {i < 2 && (
                  <div style={{
                    display: "none",
                  }} />
                )}
                <div
                  className="gradient-text"
                  style={{ fontSize: "3rem", fontWeight: 900, marginBottom: 12 }}
                >
                  {s.step}
                </div>
                <h3 style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 10, fontSize: "1.1rem" }}>{s.title}</h3>
                <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div className="section-label" style={{ marginBottom: 16 }}>Pricing</div>
          <h2 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#f1f5f9" }}>Simple, transparent pricing</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {[
            {
              name: "Free",
              price: "₹0",
              period: "forever",
              desc: "Get started with no risk",
              features: ["2 tests per week", "Basic score report", "Global leaderboard"],
              cta: "Start Free",
              href: "/signup",
              highlight: false,
            },
            {
              name: "Student Pro",
              price: "₹99",
              period: "per month",
              desc: "Everything you need to crack JEE",
              features: ["Unlimited tests", "Full AI analysis + study plan", "Booster tests", "Rank card", "Test history"],
              cta: "Start for ₹99/mo",
              href: "/signup",
              highlight: true,
            },
            {
              name: "Institute",
              price: "₹2,999",
              period: "per month",
              desc: "For coaching institutes",
              features: ["3 batches, 100 students", "Batch AI analysis", "Teacher dashboard", "Invite management", "PDF reports"],
              cta: "Start 30-day Trial",
              href: "/signup",
              highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              style={{
                borderRadius: 20,
                padding: "32px 28px",
                background: plan.highlight ? "rgba(249,115,22,0.06)" : "var(--bg-card)",
                border: plan.highlight ? "1.5px solid rgba(249,115,22,0.4)" : "1px solid rgba(255,255,255,0.08)",
                position: "relative",
                boxShadow: plan.highlight ? "var(--shadow-glow)" : "none",
              }}
            >
              {plan.highlight && (
                <div
                  className="badge badge-orange"
                  style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)" }}
                >
                  Most Popular
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "#f1f5f9", marginBottom: 4 }}>{plan.name}</div>
                <div style={{ color: "#64748b", fontSize: "0.8rem" }}>{plan.desc}</div>
              </div>
              <div style={{ marginBottom: 28 }}>
                <span className={plan.highlight ? "gradient-text" : ""} style={{ fontSize: "2.4rem", fontWeight: 900, color: plan.highlight ? undefined : "#f1f5f9" }}>
                  {plan.price}
                </span>
                <span style={{ color: "#64748b", fontSize: "0.85rem", marginLeft: 6 }}>/{plan.period}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, marginBottom: 28 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, color: "#94a3b8", fontSize: "0.875rem", marginBottom: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#22c55e", marginTop: 2 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={plan.highlight ? "btn-primary" : "btn-secondary"}
                style={{ width: "100%", justifyContent: "center", display: "flex" }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        style={{
          padding: "80px 24px", textAlign: "center",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: "2.4rem", fontWeight: 900, color: "#f1f5f9", marginBottom: 16 }}>
            Ready to see your <span className="gradient-text">actual weak spots?</span>
          </h2>
          <p style={{ color: "#64748b", marginBottom: 32, fontSize: "1rem" }}>
            Join 12,000+ JEE and NEET aspirants already using ExamPrep.
          </p>
          <Link href="/signup" className="btn-primary" style={{ fontSize: "1.05rem", padding: "16px 40px" }}>
            Get Started — It&apos;s Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "24px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
          color: "#334155",
          fontSize: "0.8rem",
        }}
      >
        © 2026 ExamPrep. Built for Indian students by Indian engineers.
      </footer>
    </main>
  );
}