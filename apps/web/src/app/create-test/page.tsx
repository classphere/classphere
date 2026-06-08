"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { examConfig } from "@/lib/mock-data";

type ExamType = "JEE" | "NEET";

export default function CreateTestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedExam, setSelectedExam] = useState<ExamType>("JEE");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [config, setConfig] = useState({
    questionCount: 25,
    difficulty: "mixed" as "easy" | "medium" | "hard" | "mixed",
    mode: "exam" as "exam" | "practice",
    type: "chapter" as "chapter" | "subject" | "full" | "past_year",
  });
  const [creating, setCreating] = useState(false);

  const subjects = Object.keys(examConfig[selectedExam].subjects);
  const chapters: string[] = selectedSubjects.flatMap(
    (s) => (examConfig[selectedExam].subjects as Record<string, string[]>)[s] || []
  );

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
    setSelectedChapters([]);
  };

  const toggleChapter = (c: string) => {
    setSelectedChapters((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleCreate = async () => {
    setCreating(true);
    await new Promise((r) => setTimeout(r, 1200));
    router.push("/test/mock-test-001");
  };

  const speed = examConfig[selectedExam].speedMinPerQ;
  const estMinutes = Math.round(config.questionCount * speed);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
            Create a Test
          </h1>
          <p style={{ color: "#64748b" }}>Configure your custom test in 3 steps</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 0, marginBottom: 40 }}>
          {["Exam & Type", "Subjects & Chapters", "Settings"].map((label, i) => {
            const num = i + 1;
            const active = step === num;
            const done = step > num;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 10, cursor: done ? "pointer" : "default",
                  }}
                  onClick={() => done && setStep(num)}
                >
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: active ? "linear-gradient(135deg, #f97316, #eab308)" : done ? "#22c55e" : "rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", fontWeight: 800, color: active || done ? "#000" : "#475569",
                      flexShrink: 0,
                    }}
                  >
                    {done ? "✓" : num}
                  </div>
                  <span style={{ fontSize: "0.8rem", fontWeight: active ? 600 : 400, color: active ? "#f1f5f9" : "#475569" }}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)", margin: "0 12px" }} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Exam & Type */}
        {step === 1 && (
          <div className="animate-fade">
            <div className="glass" style={{ borderRadius: 20, padding: "32px" }}>
              <h2 style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 20 }}>Select Exam</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
                {(["JEE", "NEET"] as ExamType[]).map((exam) => (
                  <button
                    key={exam}
                    onClick={() => { setSelectedExam(exam); setSelectedSubjects([]); setSelectedChapters([]); }}
                    style={{
                      padding: "20px", borderRadius: 14, cursor: "pointer",
                      background: selectedExam === exam ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.03)",
                      border: selectedExam === exam ? "2px solid #f97316" : "1.5px solid rgba(255,255,255,0.08)",
                      textAlign: "left", transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{exam === "JEE" ? "⚗️" : "🔬"}</div>
                    <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "1rem" }}>{exam === "JEE" ? "JEE Main" : "NEET-UG"}</div>
                    <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 4 }}>
                      {exam === "JEE" ? "75 Qs · 3 Hours · PCM" : "180 Qs · 3 Hours · PCB"}
                    </div>
                  </button>
                ))}
              </div>

              <h2 style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Test Type</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {[
                  { value: "chapter", label: "Chapter Test", desc: "Focus on specific chapters" },
                  { value: "subject", label: "Subject Test", desc: "Full subject coverage" },
                  { value: "full", label: "Full Mock", desc: "Complete exam simulation" },
                  { value: "past_year", label: "Past Year", desc: "Actual paper questions" },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setConfig({ ...config, type: t.value as typeof config.type })}
                    style={{
                      padding: "14px 16px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                      background: config.type === t.value ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.03)",
                      border: config.type === t.value ? "1.5px solid rgba(249,115,22,0.4)" : "1.5px solid rgba(255,255,255,0.08)",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "0.9rem" }}>{t.label}</div>
                    <div style={{ color: "#475569", fontSize: "0.75rem", marginTop: 3 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn-primary" onClick={() => setStep(2)}>Next: Select Chapters →</button>
            </div>
          </div>
        )}

        {/* Step 2: Subjects & Chapters */}
        {step === 2 && (
          <div className="animate-fade">
            <div className="glass" style={{ borderRadius: 20, padding: "32px" }}>
              <h2 style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 20 }}>
                Select Subjects & Chapters
              </h2>
              <div style={{ display: "flex", gap: 24 }}>
                {/* Subjects */}
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                    Subjects
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {subjects.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleSubject(s)}
                        className="sidebar-link"
                        style={{ background: selectedSubjects.includes(s) ? "rgba(249,115,22,0.12)" : undefined,
                          color: selectedSubjects.includes(s) ? "#fb923c" : undefined,
                          border: selectedSubjects.includes(s) ? "1px solid rgba(249,115,22,0.2)" : undefined }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ width: 1, background: "rgba(255,255,255,0.07)" }} />

                {/* Chapters */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Chapters {selectedChapters.length > 0 && <span style={{ color: "#f97316" }}>({selectedChapters.length} selected)</span>}
                    </div>
                    {chapters.length > 0 && (
                      <button
                        className="btn-ghost"
                        style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                        onClick={() => setSelectedChapters(selectedChapters.length === chapters.length ? [] : [...chapters])}
                      >
                        {selectedChapters.length === chapters.length ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>

                  {selectedSubjects.length === 0 ? (
                    <div style={{ color: "#334155", fontSize: "0.875rem", paddingTop: 20 }}>
                      ← Select a subject first
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {chapters.map((c) => (
                        <button
                          key={c}
                          onClick={() => toggleChapter(c)}
                          style={{
                            padding: "6px 12px", borderRadius: 20, cursor: "pointer", fontSize: "0.8rem",
                            background: selectedChapters.includes(c) ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.04)",
                            border: selectedChapters.includes(c) ? "1px solid rgba(249,115,22,0.35)" : "1px solid rgba(255,255,255,0.08)",
                            color: selectedChapters.includes(c) ? "#fb923c" : "#94a3b8",
                            transition: "all 0.15s", fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary" onClick={() => setStep(3)}>Next: Settings →</button>
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <div className="animate-fade">
            <div className="glass" style={{ borderRadius: 20, padding: "32px" }}>
              <h2 style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 28 }}>Test Settings</h2>

              {/* Question count */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, color: "#94a3b8", fontSize: "0.875rem" }}>Questions</label>
                  <span className="gradient-text" style={{ fontWeight: 800, fontSize: "1rem" }}>{config.questionCount}</span>
                </div>
                <input
                  type="range"
                  min={10} max={75} step={5}
                  value={config.questionCount}
                  onChange={(e) => setConfig({ ...config, questionCount: Number(e.target.value) })}
                  style={{ width: "100%", accentColor: "#f97316" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", color: "#334155", fontSize: "0.72rem", marginTop: 6 }}>
                  <span>10</span><span>75</span>
                </div>
              </div>

              {/* Difficulty */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ fontWeight: 600, color: "#94a3b8", fontSize: "0.875rem", display: "block", marginBottom: 12 }}>Difficulty Mix</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {["easy", "medium", "hard", "mixed"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setConfig({ ...config, difficulty: d as typeof config.difficulty })}
                      style={{
                        flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                        background: config.difficulty === d ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.04)",
                        border: config.difficulty === d ? "1.5px solid rgba(249,115,22,0.4)" : "1.5px solid rgba(255,255,255,0.08)",
                        color: config.difficulty === d ? "#fb923c" : "#64748b",
                        fontSize: "0.8rem", fontWeight: 600, fontFamily: "Inter, sans-serif",
                        textTransform: "capitalize", transition: "all 0.15s",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ fontWeight: 600, color: "#94a3b8", fontSize: "0.875rem", display: "block", marginBottom: 12 }}>Test Mode</label>
                <div style={{ display: "flex", gap: 12 }}>
                  {[
                    { value: "exam", label: "Exam Mode", desc: "Timed, no hints" },
                    { value: "practice", label: "Practice Mode", desc: "No timer, see hints" },
                  ].map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setConfig({ ...config, mode: m.value as typeof config.mode })}
                      style={{
                        flex: 1, padding: "14px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                        background: config.mode === m.value ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.04)",
                        border: config.mode === m.value ? "1.5px solid rgba(249,115,22,0.4)" : "1.5px solid rgba(255,255,255,0.08)",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "0.875rem" }}>{m.label}</div>
                      <div style={{ color: "#475569", fontSize: "0.75rem", marginTop: 3 }}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div
                style={{
                  padding: "18px 20px", borderRadius: 12,
                  background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.15)",
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fb923c", marginBottom: 10 }}>Test Summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Exam", value: selectedExam },
                    { label: "Type", value: config.type },
                    { label: "Questions", value: config.questionCount },
                    { label: "Duration", value: `${estMinutes} min` },
                    { label: "Difficulty", value: config.difficulty },
                    { label: "Mode", value: config.mode },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>{item.label}:</span>
                      <span style={{ color: "#f1f5f9", fontSize: "0.8rem", fontWeight: 600, textTransform: "capitalize" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
              <button
                className="btn-primary animate-glow"
                style={{ fontSize: "1rem", padding: "14px 32px" }}
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? "Generating Questions..." : "🚀 Start Test"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
