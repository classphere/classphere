"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { RiBookmarkFill, RiFilter3Line, RiCheckLine, RiSearchLine, RiAlertFill, RiLightbulbFlashLine, RiArrowRightLine } from "@remixicon/react";

const MOCK_MISTAKES = [
  {
    id: "m1",
    date: "2026-06-12",
    exam: "JEE Main Mock 4",
    subject: "Physics",
    chapter: "Thermodynamics",
    question: "A Carnot engine operates between 300K and 600K. If the work done is 800J, what is the heat extracted from the source?",
    studentAnswer: "-1600 J",
    correctAnswer: "1600 J",
    errorType: "sign_error",
    detail: "Sign error: You calculated the correct magnitude but applied the wrong sign convention for heat extracted.",
    tip: "Always draw the source/sink diagram and use Q1 = W + Q2 to track energy flow direction.",
    resolved: false
  },
  {
    id: "m2",
    date: "2026-06-10",
    exam: "JEE Main Mock 3",
    subject: "Chemistry",
    chapter: "Electrochemistry",
    question: "Calculate the standard cell potential for the reaction: Zn(s) + Cu2+(aq) -> Zn2+(aq) + Cu(s) given E0(Zn2+/Zn) = -0.76V and E0(Cu2+/Cu) = +0.34V.",
    studentAnswer: "-0.42V",
    correctAnswer: "1.10V",
    errorType: "calculation",
    detail: "Calculation error: You subtracted 0.76 from 0.34 instead of adding them (E_cell = E_cathode - E_anode = 0.34 - (-0.76)).",
    tip: "Write out the equation clearly: 0.34 - (-0.76). Don't skip the double negative in your head.",
    resolved: false
  },
  {
    id: "m3",
    date: "2026-06-05",
    exam: "JEE Main Mock 2",
    subject: "Mathematics",
    chapter: "Integral Calculus",
    question: "Evaluate the integral of x * e^x dx from 0 to 1.",
    studentAnswer: "e - 1",
    correctAnswer: "1",
    errorType: "partial_solve",
    detail: "Partial solve: You applied integration by parts correctly but forgot to evaluate the limits on the [x * e^x] term.",
    tip: "Always write [f(x)]_a^b explicitly before plugging in the upper and lower limits.",
    resolved: true
  }
];

export default function MistakeDiary() {
  const [activeTab, setActiveTab] = useState<"unresolved" | "resolved">("unresolved");
  const [filterSubject, setFilterSubject] = useState<string>("All");

  const [mistakes, setMistakes] = useState(MOCK_MISTAKES);

  const toggleResolved = (id: string) => {
    setMistakes(mistakes.map(m => m.id === id ? { ...m, resolved: !m.resolved } : m));
  };

  const filteredMistakes = mistakes.filter(m => {
    if (activeTab === "unresolved" && m.resolved) return false;
    if (activeTab === "resolved" && !m.resolved) return false;
    if (filterSubject !== "All" && m.subject !== filterSubject) return false;
    return true;
  });

  return (
    <>
      <Navbar title="Mistake Diary" />
      <main className="mx-auto w-full max-w-screen-lg px-6 pb-10 pt-6 md:px-8">
        
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-t-tertiary">
              <RiBookmarkFill className="text-primary-01" /> Review log
            </div>
            <h1 className="text-h4 font-semibold tracking-tight text-t-primary">Mistake Diary</h1>
            <p className="mt-2 text-body-2 text-t-secondary">
              Review your past errors so you never make them again.
            </p>
          </div>
          <div className="w-full lg:w-48">
             <select 
              className="input h-11 w-full rounded-3xl"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="All">All Subjects</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-s-stroke2">
          <button 
            onClick={() => setActiveTab("unresolved")}
            className={`border-b-2 px-2 pb-3 text-body-2 font-semibold transition-colors ${
              activeTab === "unresolved"
                ? "border-primary-01 text-primary-01"
                : "border-transparent text-t-secondary hover:text-t-primary"
            }`}
          >
            Needs Review ({mistakes.filter(m => !m.resolved).length})
          </button>
          <button 
            onClick={() => setActiveTab("resolved")}
            className={`border-b-2 px-2 pb-3 text-body-2 font-semibold transition-colors ${
              activeTab === "resolved"
                ? "border-primary-01 text-primary-01"
                : "border-transparent text-t-secondary hover:text-t-primary"
            }`}
          >
            Resolved ({mistakes.filter(m => m.resolved).length})
          </button>
        </div>

        {/* List */}
        {filteredMistakes.length === 0 ? (
          <div className="card py-16 text-center text-t-secondary">
            <RiCheckLine size={48} className="mx-auto mb-4 text-t-tertiary" />
            <h3 className="text-h5 font-semibold text-t-primary">No mistakes found here!</h3>
            <p className="mt-2 text-body-2 text-t-secondary">You have reviewed all your errors.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredMistakes.map(m => (
              <div key={m.id} className={`card border p-6 md:p-8 ${m.resolved ? "border-primary-02/30" : "border-[#EF9D0E]/30"}`}>
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="label label-gray">{m.subject}</span>
                    <span className="label label-gray">{m.chapter}</span>
                  </div>
                  <span className="text-caption text-t-secondary">{m.exam} • {m.date}</span>
                </div>

                <div className="mb-6">
                  <div className="mb-2 text-overline font-bold uppercase tracking-wider text-t-tertiary">Question</div>
                  <div className="text-body-2 font-semibold leading-relaxed text-t-primary">{m.question}</div>
                </div>

                <div className="mb-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-[#FF6A55]/20 bg-[#FF6A55]/5 p-4">
                    <div className="mb-1 text-caption font-bold text-[#FF6A55]">Your Answer</div>
                    <div className="text-body-1 font-bold text-[#FF6A55]">{m.studentAnswer}</div>
                  </div>
                  <div className="rounded-3xl border border-[#00A656]/20 bg-[#00A656]/5 p-4">
                    <div className="mb-1 text-caption font-bold text-[#00A656]">Correct Answer</div>
                    <div className="text-body-1 font-bold text-[#00A656]">{m.correctAnswer}</div>
                  </div>
                </div>

                <div className="mb-6 rounded-3xl bg-b-surface1 p-5">
                  <div className="mb-4 flex gap-3">
                    <RiAlertFill size={20} className="shrink-0 text-[#EF9D0E]" />
                    <div>
                      <div className="mb-1 text-caption font-bold text-[#EF9D0E]">Diagnosis: {m.errorType.replace("_", " ")}</div>
                      <div className="text-body-2 text-t-primary">{m.detail}</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <RiLightbulbFlashLine size={20} className="shrink-0 text-primary-01" />
                    <div>
                      <div className="mb-1 text-caption font-bold text-primary-01">Actionable Tip</div>
                      <div className="text-body-2 text-t-primary">{m.tip}</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    className={m.resolved ? "btn btn-outline" : "btn btn-primary"} 
                    onClick={() => toggleResolved(m.id)}
                    style={{ display: "inline-flex", gap: 8 }}
                  >
                    {m.resolved ? "Mark as Needs Review" : <><RiCheckLine size={18} /> Mark as Resolved</>}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
