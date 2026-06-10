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
      <Navbar title="Create a Test" subtitle="Design a custom test or mock exam" breadcrumbs="Dashboard > Create a Test" />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 32px 24px", width: "100%" }}>
        
        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 32, padding: "0 24px" }}>
          {["Exam & Type", "Subjects & Chapters", "Settings"].map((label, i) => {
            const num = i + 1;
            const active = step === num;
            const done = step > num;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", flex: i === 2 ? 0 : 1 }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12, cursor: done ? "pointer" : "default" }}
                  onClick={() => done && setStep(num)}
                >
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: active || done ? "var(--p-50)" : "var(--n-20)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: active || done ? "white" : "var(--fg-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {done ? <RiCheckLine size={18} /> : num}
                  </div>
                  <span className="text-bold" style={{ color: active || done ? "var(--fg-default)" : "var(--fg-muted)" }}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 1, background: "var(--border-default)", margin: "0 24px" }} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Exam & Type */}
        {step === 1 && (
          <div className="rayum-card" style={{ padding: 32 }}>
            <h2 className="section-title" style={{ marginBottom: 20 }}>Select Exam</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
              {(["JEE", "NEET"] as ExamType[]).map((exam) => (
                <button
                  key={exam}
                  onClick={() => { setSelectedExam(exam); setSelectedSubjects([]); setSelectedChapters([]); }}
                  style={{
                    padding: 20, borderRadius: "var(--r-md)", cursor: "pointer",
                    background: selectedExam === exam ? "var(--p-10)" : "var(--bg-surface)",
                    border: selectedExam === exam ? "2px solid var(--p-50)" : "1px solid var(--border-default)",
                    textAlign: "left", transition: "all 0.2s",
                  }}
                >
                  <div style={{ marginBottom: 12, color: selectedExam === exam ? "var(--p-50)" : "var(--fg-muted)" }}>
                    {exam === "JEE" ? <RiFlaskLine size={28} /> : <RiMicroscopeLine size={28} />}
                  </div>
                  <div className="text-bold" style={{ fontSize: 16, marginBottom: 4 }}>{exam === "JEE" ? "JEE Main" : "NEET-UG"}</div>
                  <div className="t-body-sm">{exam === "JEE" ? "75 Qs · 3 Hours · PCM" : "180 Qs · 3 Hours · PCB"}</div>
                </button>
              ))}
            </div>

            <h2 className="section-title" style={{ marginBottom: 20 }}>Test Type</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
                    padding: 16, borderRadius: "var(--r-md)", cursor: "pointer", textAlign: "left",
                    background: config.type === t.value ? "var(--p-10)" : "var(--bg-surface)",
                    border: config.type === t.value ? "2px solid var(--p-50)" : "1px solid var(--border-default)",
                    transition: "all 0.2s",
                  }}
                >
                  <div className="text-bold" style={{ marginBottom: 4 }}>{t.label}</div>
                  <div className="t-body-sm">{t.desc}</div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32 }}>
              <button className="btn btn-primary" style={{ display: "inline-flex", gap: 8 }} onClick={() => setStep(2)}>
                Next: Select Chapters <RiArrowRightLine size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Subjects & Chapters */}
        {step === 2 && (
          <div className="rayum-card" style={{ padding: 32 }}>
            <h2 className="section-title" style={{ marginBottom: 24 }}>
              Select Subjects & Chapters
            </h2>
            <div style={{ display: "flex", gap: 24 }}>
              {/* Subjects */}
              <div style={{ minWidth: 160 }}>
                <div className="t-label" style={{ marginBottom: 16 }}>
                  Subjects
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {subjects.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSubject(s)}
                      style={{
                        padding: "8px 12px", borderRadius: "var(--r-md)", textAlign: "left",
                        background: selectedSubjects.includes(s) ? "var(--p-10)" : "transparent",
                        color: selectedSubjects.includes(s) ? "var(--fg-default)" : "var(--fg-muted)",
                        fontWeight: selectedSubjects.includes(s) ? 600 : 500,
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div className="t-label">
                    Chapters {selectedChapters.length > 0 && <span style={{ color: "var(--p-50)", textTransform: "none" }}>({selectedChapters.length} selected)</span>}
                  </div>
                  {chapters.length > 0 && (
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: 12, padding: "6px 12px", borderRadius: "var(--r-full)" }}
                      onClick={() => setSelectedChapters(selectedChapters.length === chapters.length ? [] : [...chapters])}
                    >
                      {selectedChapters.length === chapters.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                {selectedSubjects.length === 0 ? (
                  <div className="t-body" style={{ color: "var(--fg-muted)", paddingTop: 20, textAlign: "center" }}>
                    Select a subject first to view chapters
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {chapters.map((c) => (
                      <button
                        key={c}
                        onClick={() => toggleChapter(c)}
                        style={{
                          padding: "6px 12px", borderRadius: "var(--r-full)", cursor: "pointer", fontSize: 13,
                          background: selectedChapters.includes(c) ? "var(--p-50)" : "transparent",
                          border: selectedChapters.includes(c) ? "1px solid var(--p-50)" : "1px solid var(--border-default)",
                          color: selectedChapters.includes(c) ? "white" : "var(--fg-default)",
                          transition: "all 0.2s", fontWeight: 600
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
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
          <div className="rayum-card" style={{ padding: 32 }}>
            <h2 className="section-title" style={{ marginBottom: 24 }}>Test Settings</h2>

            {/* Question count */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <label className="text-bold">Number of Questions</label>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--p-50)" }}>{config.questionCount}</div>
              </div>
              <input
                type="range"
                min={10} max={75} step={5}
                value={config.questionCount}
                onChange={(e) => setConfig({ ...config, questionCount: Number(e.target.value) })}
                style={{ width: "100%", accentColor: "var(--p-50)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--fg-muted)", fontSize: 12, marginTop: 8, fontWeight: 500 }}>
                <span>10</span><span>75</span>
              </div>
            </div>

            {/* Difficulty */}
            <div style={{ marginBottom: 24 }}>
              <label className="text-bold" style={{ display: "block", marginBottom: 12 }}>Difficulty Mix</label>
              <div style={{ display: "flex", gap: 12 }}>
                {["easy", "medium", "hard", "mixed"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setConfig({ ...config, difficulty: d as typeof config.difficulty })}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "var(--r-md)", cursor: "pointer",
                      background: config.difficulty === d ? "var(--p-10)" : "transparent",
                      border: config.difficulty === d ? "2px solid var(--p-50)" : "1px solid var(--border-default)",
                      color: config.difficulty === d ? "var(--p-60)" : "var(--fg-muted)",
                      fontSize: 14, fontWeight: 600, textTransform: "capitalize", transition: "all 0.2s",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div style={{ marginBottom: 32 }}>
              <label className="text-bold" style={{ display: "block", marginBottom: 12 }}>Test Mode</label>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { value: "exam", label: "Exam Mode", desc: "Timed, no hints" },
                  { value: "practice", label: "Practice Mode", desc: "No timer, see hints" },
                ].map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setConfig({ ...config, mode: m.value as typeof config.mode })}
                    style={{
                      flex: 1, padding: "16px", borderRadius: "var(--r-md)", cursor: "pointer", textAlign: "left",
                      background: config.mode === m.value ? "var(--p-10)" : "transparent",
                      border: config.mode === m.value ? "2px solid var(--p-50)" : "1px solid var(--border-default)",
                      transition: "all 0.2s",
                    }}
                  >
                    <div className="text-bold" style={{ marginBottom: 4 }}>{m.label}</div>
                    <div className="t-body-sm">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div style={{ padding: 20, borderRadius: "var(--r-md)", background: "var(--n-10)", border: "1px solid var(--border-default)" }}>
              <div className="text-bold" style={{ fontSize: 15, marginBottom: 16 }}>Test Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Exam", value: selectedExam },
                  { label: "Type", value: config.type },
                  { label: "Questions", value: config.questionCount },
                  { label: "Duration", value: `${estMinutes} min` },
                  { label: "Difficulty", value: config.difficulty },
                  { label: "Mode", value: config.mode },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="t-body-sm">{item.label}</span>
                    <span className="text-bold" style={{ textTransform: "capitalize", fontSize: 14 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
              <button className="btn btn-outline" style={{ display: "inline-flex", gap: 8 }} onClick={() => setStep(2)}>
                <RiArrowLeftLine size={18} /> Back
              </button>
              <button className="btn btn-dark" style={{ display: "inline-flex", gap: 8 }} onClick={handleCreate} disabled={creating}>
                {creating ? "Generating Questions..." : <><RiRocketLine size={18} /> Start Test</>}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
