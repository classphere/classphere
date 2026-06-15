"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { RiArrowLeftLine, RiArrowRightLine, RiSave3Line, RiCheckLine } from "@remixicon/react";
import { useParams } from "next/navigation";

export default function DistractorMappingPage() {
  const params = useParams();
  // Using a hardcoded PYQ paper for this demo rather than the taskId
  const testId = "jee-main-2024-jan-shift1";

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Mapped distractor state: { [questionId]: { [optionId]: errorType } }
  const [distractorMap, setDistractorMap] = useState<Record<string, Record<string, string>>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch(`/api/v1/pyqs/${testId}/questions`);
        const json = await res.json();
        if (json.success && json.data.questions) {
          // Filter to only single-choice MCQs for distractor mapping
          const mcqs = json.data.questions.filter((q: any) => q.question_type === "mcq_single" && q.options && q.options.length > 0);
          setQuestions(mcqs);
        }
      } catch (err) {
        console.error("Failed to load questions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [testId]);

  if (loading) {
    return (
      <>
        <Navbar title="Distractor Mapping" />
        <div style={{ padding: "var(--space-600)", textAlign: "center", color: "var(--fg-muted)" }}>
          Loading questions...
        </div>
      </>
    );
  }

  if (questions.length === 0) {
    return (
      <>
        <Navbar title="Distractor Mapping" />
        <div style={{ padding: "var(--space-600)", textAlign: "center", color: "var(--fg-muted)" }}>
          No MCQ questions found for this assignment.
        </div>
      </>
    );
  }

  const currentQ = questions[currentIdx];
  const qId = currentQ.id;

  const handleMapOption = (optionId: string, errorType: string) => {
    setDistractorMap((prev) => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || {}),
        [optionId]: errorType,
      },
    }));
    setSaved(false);
  };

  const handleSave = () => {
    // In reality, this would send a PATCH to /api/v1/questions/distractors
    console.log("Saving distractor map:", distractorMap);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const errorTypes = [
    { value: "", label: "Unmapped" },
    { value: "conceptual", label: "Conceptual Gap" },
    { value: "calculation", label: "Calculation Error" },
    { value: "silly", label: "Silly Error (Misread)" },
    { value: "sign_error", label: "Sign Error (+/-)" },
    { value: "wrong_formula", label: "Wrong Formula" },
    { value: "partial_solve", label: "Stopped at intermediate step" },
  ];

  return (
    <>
      <Navbar title={`Distractor Mapping — Task #${params.taskId}`} />

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h2 className="text-heading-m" style={{ color: "var(--fg-default)", margin: 0 }}>Define Error Traps</h2>
            <p className="text-body-small" style={{ color: "var(--fg-muted)", marginTop: 8 }}>
              Map incorrect options to specific error types. This trains the AI to correctly classify student mistakes deterministically.
            </p>
          </div>
          <button className={`btn ${saved ? "btn-secondary" : "btn-primary"}`} onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saved ? <RiCheckLine size={20} /> : <RiSave3Line size={20} />}
            {saved ? "Saved!" : "Save Mappings"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 32 }}>
          {/* Question Viewer */}
          <div className="rayum-card" style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 className="text-heading-s">Question {currentIdx + 1} of {questions.length}</h3>
              <div style={{ display: "flex", gap: 12 }}>
                <span className="rayum-badge blue">{currentQ.subject}</span>
                <span className="rayum-badge orange">{currentQ.difficulty}</span>
              </div>
            </div>

            <div className="text-body-base" style={{ lineHeight: 1.8, color: "var(--fg-default)", marginBottom: 32 }}>
              {currentQ.question_text}
            </div>

            {currentQ.question_images?.map((img: string, i: number) => (
              <img key={i} src={img} alt="Question" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 32 }} />
            ))}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48, borderTop: "1px solid var(--border-default)", paddingTop: 24 }}>
              <button
                className="btn btn-outline"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(c => c - 1)}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <RiArrowLeftLine size={18} /> Previous
              </button>
              <button
                className="btn btn-primary"
                disabled={currentIdx === questions.length - 1}
                onClick={() => setCurrentIdx(c => c + 1)}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                Next <RiArrowRightLine size={18} />
              </button>
            </div>
          </div>

          {/* Option Mapping Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {currentQ.options?.map((opt: any) => {
              const isCorrect = currentQ.correct_answer.includes(opt.id);
              const mappedError = distractorMap[qId]?.[opt.id] || "";

              return (
                <div key={opt.id} className="rayum-card" style={{ padding: 20, border: isCorrect ? "2px solid var(--success-50)" : "1px solid var(--border-default)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: isCorrect ? "var(--success-50)" : "var(--fg-default)" }}>
                      Option {opt.id}
                    </div>
                    {isCorrect && <span className="rayum-badge green">Correct Answer</span>}
                  </div>
                  <div className="text-body-small" style={{ marginBottom: 16, color: "var(--fg-muted)" }}>
                    {opt.text}
                  </div>

                  {!isCorrect && (
                    <div>
                      <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)", display: "block", marginBottom: 8 }}>
                        If student selects this, it means:
                      </label>
                      <select
                        className="input-field"
                        value={mappedError}
                        onChange={(e) => handleMapOption(opt.id, e.target.value)}
                        style={{ width: "100%", background: mappedError ? "var(--primary-10)" : "transparent" }}
                      >
                        {errorTypes.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
