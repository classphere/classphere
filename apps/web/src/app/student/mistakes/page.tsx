"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { 
  RiBookmarkFill, 
  RiCheckLine, 
  RiAlertFill, 
  RiLightbulbFlashLine, 
  RiArrowDownSLine 
} from "@remixicon/react";

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

const SUBJECT_OPTIONS = ["All", "Physics", "Chemistry", "Mathematics"];

export default function MistakeDiary() {
  const [activeTab, setActiveTab] = useState<"unresolved" | "resolved">("unresolved");
  const [filterSubject, setFilterSubject] = useState<string>("All");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
      <Navbar title="Mistake Diary" subtitle="Review your past errors so you never make them again." breadcrumbs="Dashboard > Mistake Diary" />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-6 md:px-6 overflow-x-hidden">
        
        {/* Filters/Tabs Row */}
        <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-between gap-6 p-6 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none mb-8">
          
          {/* Custom Tab Segment Controller */}
          <div className="flex gap-1 rounded-lg border border-s-stroke2/30 bg-b-surface1 dark:bg-b-surface1/60 p-1 select-none">
            <button 
              onClick={() => setActiveTab("unresolved")}
              className={`px-6 py-2.5 text-xs font-sans font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "unresolved"
                  ? "bg-b-surface2 dark:bg-b-surface2 text-t-primary dark:text-t-primary shadow-widget"
                  : "bg-transparent text-t-secondary hover:text-t-primary"
              }`}
            >
              Needs Review ({mistakes.filter(m => !m.resolved).length})
            </button>
            <button 
              onClick={() => setActiveTab("resolved")}
              className={`px-6 py-2.5 text-xs font-sans font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "resolved"
                  ? "bg-b-surface2 dark:bg-b-surface2 text-t-primary dark:text-t-primary shadow-widget"
                  : "bg-transparent text-t-secondary hover:text-t-primary"
              }`}
            >
              Resolved ({mistakes.filter(m => m.resolved).length})
            </button>
          </div>
          
          {/* Custom Select Dropdown */}
          <div className="relative min-w-[200px]">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex h-11 w-full items-center justify-between rounded-lg border border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 px-5 text-sm font-sans font-semibold text-t-primary dark:text-t-primary shadow-widget cursor-pointer active:scale-98 transition-all"
            >
              <span>{filterSubject === "All" ? "All Subjects" : filterSubject}</span>
              <RiArrowDownSLine size={16} className={`text-t-secondary transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <ul className="absolute right-0 top-13 z-50 rounded-lg border border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 p-1.5 shadow-dropdown animate-in fade-in slide-in-from-top-1 duration-150">
                  {SUBJECT_OPTIONS.map((sub) => (
                    <li key={sub}>
                      <button
                        onClick={() => {
                          setFilterSubject(sub);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-sans font-semibold transition-colors cursor-pointer ${
                          filterSubject === sub
                            ? "bg-b-surface1 dark:bg-b-surface1 text-t-primary dark:text-t-primary"
                            : "bg-transparent text-t-secondary hover:bg-b-surface1 hover:text-t-primary dark:hover:bg-b-surface3"
                        }`}
                      >
                        {sub === "All" ? "All Subjects" : sub}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* List of Mistakes */}
        {filteredMistakes.length === 0 ? (
          <div className="group relative card text-center py-20 text-t-secondary rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40">
            <div className="box-hover" />
            <RiCheckLine size={48} className="mx-auto mb-4 text-t-secondary relative z-10" />
            <h3 className="font-semibold text-body-2 text-t-primary mb-1 relative z-10">No mistakes found here!</h3>
            <p className="text-caption text-t-secondary relative z-10">You have reviewed all your errors.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredMistakes.map(m => (
              <div key={m.id} className="group relative flex flex-col p-6 md:p-8 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none hover:-translate-y-0.5 hover:shadow-[0px_10px_20px_-8px_rgba(0,0,0,0.06)] transition-all duration-200">
                <div className="box-hover" />
                
                {/* Card Header */}
                <div className="relative z-10 mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-sans font-semibold px-2 py-0.5 border border-s-stroke2/20 bg-b-surface1 dark:bg-b-surface1/60 text-t-secondary rounded-lg uppercase tracking-wider">
                      {m.subject}
                    </span>
                    <span className="text-[10px] font-sans font-semibold px-2 py-0.5 border border-s-stroke2/20 bg-b-surface1 dark:bg-b-surface1/60 text-t-secondary rounded-lg uppercase tracking-wider">
                      {m.chapter}
                    </span>
                  </div>
                  <span className="text-[12px] font-sans text-t-secondary">{m.exam} · {m.date}</span>
                </div>

                {/* Question Text */}
                <div className="relative z-10 mb-6">
                  <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-t-secondary mb-1.5">Question</div>
                  <div className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                    {m.question}
                  </div>
                </div>

                {/* Answers Grid */}
                <div className="relative z-10 mb-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-primary-03/15 bg-[rgba(255,106,85,0.03)] p-5">
                    <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-primary-03 mb-1.5">Your Answer</div>
                    <div className="font-sans font-bold text-[18px] text-primary-03">{m.studentAnswer}</div>
                  </div>
                  <div className="rounded-lg border border-primary-02/15 bg-[rgba(0,166,86,0.03)] p-5">
                    <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-primary-02 mb-1.5">Correct Answer</div>
                    <div className="font-sans font-bold text-[18px] text-primary-02">{m.correctAnswer}</div>
                  </div>
                </div>

                {/* Diagnostic & Actionable Tip Box */}
                <div className="relative z-10 mb-6 rounded-lg bg-b-surface1 dark:bg-b-surface1/60 p-5 border border-s-stroke2/30 flex flex-col gap-4">
                  <div className="flex gap-3">
                    <RiAlertFill size={20} className="shrink-0 text-t-secondary" />
                    <div>
                      <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-t-secondary mb-0.5">Diagnosis: {m.errorType.replace("_", " ")}</div>
                      <div className="text-[13px] font-sans text-t-primary dark:text-t-primary leading-relaxed">{m.detail}</div>
                    </div>
                  </div>
                  <div className="flex gap-3 border-t border-s-stroke2/20 pt-4">
                    <RiLightbulbFlashLine size={20} className="shrink-0 text-t-secondary" />
                    <div>
                      <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-t-secondary mb-0.5">Actionable Tip</div>
                      <div className="text-[13px] font-sans text-t-primary dark:text-t-primary leading-relaxed">{m.tip}</div>
                    </div>
                  </div>
                </div>

                {/* Toggle Button */}
                <div className="relative z-10 flex justify-end">
                  <button 
                    onClick={() => toggleResolved(m.id)}
                    className={`flex flex-row justify-center items-center h-8 px-4 text-[12px] font-sans font-semibold rounded-lg transition-all active:scale-95 cursor-pointer ${
                      m.resolved 
                        ? "border border-s-stroke2 dark:border-s-stroke2 bg-transparent text-t-secondary hover:text-t-primary dark:hover:text-t-primary" 
                        : "bg-shade-02 hover:bg-shade-04 text-t-light dark:bg-t-primary dark:text-b-surface1 dark:hover:bg-t-primary/90 shadow-widget"
                    }`}
                  >
                    {m.resolved ? "Mark as Needs Review" : <><RiCheckLine size={16} className="mr-1.5" /> Mark as Resolved</>}
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
