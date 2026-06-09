"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { examConfig } from "@/lib/mock-data";
import {
  RiCheckLine,
  RiFlaskLine,
  RiMicroscopeLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiRocketLine
} from "@remixicon/react";

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
    <>
      <Navbar title="Create a Test" />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* Step indicator */}
        <div style={{ display: "flex", gap: 0, marginBottom: "var(--space-600)" }}>
          {["Exam & Type", "Subjects & Chapters", "Settings"].map((label, i) => {
            const num = i + 1;
            const active = step === num;
            const done = step > num;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10, cursor: done ? "pointer" : "default" }}
                  onClick={() => done && setStep(num)}
                >
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: active || done ? "var(--primary-50)" : "var(--neutral-20)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800, color: active || done ? "var(--neutral-100)" : "var(--fg-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {done ? <RiCheckLine size={16} /> : num}
                  </div>
                  <span className="text-body-base" style={{ fontWeight: active ? 600 : 400, color: active || done ? "var(--fg-default)" : "var(--fg-muted)" }}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 1, background: "var(--border-default)", margin: "0 12px" }} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Exam & Type */}
        {step === 1 && (
          <div className="rayum-card">
            <h2 className="text-h3" style={{ marginBottom: "var(--space-400)" }}>Select Exam</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "var(--space-600)" }}>
              {(["JEE", "NEET"] as ExamType[]).map((exam) => (
                <button
                  key={exam}
                  onClick={() => { setSelectedExam(exam); setSelectedSubjects([]); setSelectedChapters([]); }}
                  style={{
                    padding: "var(--space-500)", borderRadius: "var(--radius-md)", cursor: "pointer",
                    background: selectedExam === exam ? "var(--primary-10)" : "var(--bg-default)",
                    border: selectedExam === exam ? "2px solid var(--primary-50)" : "1.5px solid var(--border-default)",
                    textAlign: "left", transition: "all 0.15s",
                  }}
                >
                  <div style={{ marginBottom: 12, color: selectedExam === exam ? "var(--primary-50)" : "var(--fg-muted)" }}>
                    {exam === "JEE" ? <RiFlaskLine size={32} /> : <RiMicroscopeLine size={32} />}
                  </div>
                  <div className="text-body-large" style={{ fontWeight: 700, color: "var(--fg-default)" }}>{exam === "JEE" ? "JEE Main" : "NEET-UG"}</div>
                  <div className="text-body-small" style={{ color: "var(--fg-muted)", marginTop: 4 }}>
                    {exam === "JEE" ? "75 Qs · 3 Hours · PCM" : "180 Qs · 3 Hours · PCB"}
                  </div>
                </button>
              ))}
            </div>

            <h2 className="text-h3" style={{ marginBottom: "var(--space-400)" }}>Test Type</h2>
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
                    padding: "var(--space-300)", borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left",
                    background: config.type === t.value ? "var(--primary-10)" : "var(--bg-default)",
                    border: config.type === t.value ? "1.5px solid var(--primary-50)" : "1.5px solid var(--border-default)",
                    transition: "all 0.15s",
                  }}
                >
                  <div className="text-body-base" style={{ fontWeight: 600, color: "var(--fg-default)" }}>{t.label}</div>
                  <div className="text-body-small" style={{ color: "var(--fg-muted)", marginTop: 3 }}>{t.desc}</div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-600)" }}>
              <button className="btn btn-primary" style={{ display: "inline-flex", gap: 8 }} onClick={() => setStep(2)}>
                Next: Select Chapters <RiArrowRightLine size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Subjects & Chapters */}
        {step === 2 && (
          <div className="rayum-card">
            <h2 className="text-h3" style={{ marginBottom: "var(--space-500)" }}>
              Select Subjects & Chapters
            </h2>
            <div style={{ display: "flex", gap: "var(--space-600)" }}>
              {/* Subjects */}
              <div style={{ minWidth: 160 }}>
                <div className="text-body-small" style={{ fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", marginBottom: "var(--space-300)" }}>
                  Subjects
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {subjects.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSubject(s)}
                      style={{
                        padding: "8px 12px", borderRadius: "var(--radius-md)", textAlign: "left",
                        background: selectedSubjects.includes(s) ? "var(--primary-10)" : "transparent",
                        color: selectedSubjects.includes(s) ? "var(--fg-default)" : "var(--fg-muted)",
                        fontWeight: selectedSubjects.includes(s) ? 600 : 400,
                        border: "none", cursor: "pointer", fontSize: 14
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ width: 1, background: "var(--border-default)" }} />

              {/* Chapters */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-300)" }}>
                  <div className="text-body-small" style={{ fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase" }}>
                    Chapters {selectedChapters.length > 0 && <span style={{ color: "var(--primary-90)" }}>({selectedChapters.length} selected)</span>}
                  </div>
                  {chapters.length > 0 && (
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: 12, padding: "4px 8px" }}
                      onClick={() => setSelectedChapters(selectedChapters.length === chapters.length ? [] : [...chapters])}
                    >
                      {selectedChapters.length === chapters.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                {selectedSubjects.length === 0 ? (
                  <div className="text-body-base" style={{ color: "var(--fg-muted)", paddingTop: 20 }}>
                    <RiArrowLeftLine size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> Select a subject first
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {chapters.map((c) => (
                      <button
                        key={c}
                        onClick={() => toggleChapter(c)}
                        style={{
                          padding: "6px 12px", borderRadius: "var(--radius-full)", cursor: "pointer", fontSize: 12,
                          background: selectedChapters.includes(c) ? "var(--primary-50)" : "var(--bg-default)",
                          border: selectedChapters.includes(c) ? "1px solid var(--primary-50)" : "1px solid var(--border-default)",
                          color: selectedChapters.includes(c) ? "white" : "var(--fg-muted)",
                          transition: "all 0.15s", fontWeight: 600
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-600)" }}>
              <button className="btn btn-outline" style={{ display: "inline-flex", gap: 8 }} onClick={() => setStep(1)}>
                <RiArrowLeftLine size={18} /> Back
              </button>
              <button className="btn btn-primary" style={{ display: "inline-flex", gap: 8 }} onClick={() => setStep(3)}>
                Next: Settings <RiArrowRightLine size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <div className="rayum-card">
            <h2 className="text-h3" style={{ marginBottom: "var(--space-600)" }}>Test Settings</h2>

            {/* Question count */}
            <div style={{ marginBottom: "var(--space-600)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <label className="text-body-base" style={{ fontWeight: 600, color: "var(--fg-default)" }}>Questions</label>
                <span className="text-body-large" style={{ fontWeight: 800, color: "var(--primary-50)" }}>{config.questionCount}</span>
              </div>
              <input
                type="range"
                min={10} max={75} step={5}
                value={config.questionCount}
                onChange={(e) => setConfig({ ...config, questionCount: Number(e.target.value) })}
                style={{ width: "100%", accentColor: "var(--primary-50)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--fg-muted)", fontSize: 12, marginTop: 6 }}>
                <span>10</span><span>75</span>
              </div>
            </div>

            {/* Difficulty */}
            <div style={{ marginBottom: "var(--space-600)" }}>
              <label className="text-body-base" style={{ fontWeight: 600, color: "var(--fg-default)", display: "block", marginBottom: 12 }}>Difficulty Mix</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["easy", "medium", "hard", "mixed"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setConfig({ ...config, difficulty: d as typeof config.difficulty })}
                    style={{
                      flex: 1, padding: "10px 8px", borderRadius: "var(--radius-md)", cursor: "pointer",
                      background: config.difficulty === d ? "var(--primary-10)" : "var(--bg-default)",
                      border: config.difficulty === d ? "1.5px solid var(--primary-50)" : "1.5px solid var(--border-default)",
                      color: config.difficulty === d ? "var(--fg-default)" : "var(--fg-muted)",
                      fontSize: 14, fontWeight: 600, textTransform: "capitalize", transition: "all 0.15s",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div style={{ marginBottom: "var(--space-600)" }}>
              <label className="text-body-base" style={{ fontWeight: 600, color: "var(--fg-default)", display: "block", marginBottom: 12 }}>Test Mode</label>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { value: "exam", label: "Exam Mode", desc: "Timed, no hints" },
                  { value: "practice", label: "Practice Mode", desc: "No timer, see hints" },
                ].map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setConfig({ ...config, mode: m.value as typeof config.mode })}
                    style={{
                      flex: 1, padding: "14px", borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left",
                      background: config.mode === m.value ? "var(--primary-10)" : "var(--bg-default)",
                      border: config.mode === m.value ? "1.5px solid var(--primary-50)" : "1.5px solid var(--border-default)",
                      transition: "all 0.15s",
                    }}
                  >
                    <div className="text-body-base" style={{ fontWeight: 600, color: "var(--fg-default)" }}>{m.label}</div>
                    <div className="text-body-small" style={{ color: "var(--fg-muted)", marginTop: 3 }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div style={{ padding: "18px 20px", borderRadius: "var(--radius-md)", background: "var(--bg-default)", border: "1px solid var(--border-default)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-default)", marginBottom: 10 }}>Test Summary</div>
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
                    <span style={{ color: "var(--fg-muted)", fontSize: 13 }}>{item.label}:</span>
                    <span style={{ color: "var(--fg-default)", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-600)" }}>
              <button className="btn btn-outline" style={{ display: "inline-flex", gap: 8 }} onClick={() => setStep(2)}>
                <RiArrowLeftLine size={18} /> Back
              </button>
              <button className="btn btn-primary" style={{ display: "inline-flex", gap: 8 }} onClick={handleCreate} disabled={creating}>
                {creating ? "Generating Questions..." : <><RiRocketLine size={18} /> Start Test</>}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
