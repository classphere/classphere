"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { 
  PageWrapper, 
  SectionCard, 
  EmptyState, 
  TabBar,
  SecondaryButton 
} from "@/components/ui";

import { 
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

type TabID = "unresolved" | "resolved";

export default function MistakeDiary() {
  const [activeTab, setActiveTab] = useState<TabID>("unresolved");
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

  const tabs = [
    { id: "unresolved" as const, label: `Needs Review (${mistakes.filter(m => !m.resolved).length})` },
    { id: "resolved" as const, label: `Resolved (${mistakes.filter(m => m.resolved).length})` }
  ];

  return (
    <>
      <Navbar title="Mistake Diary" subtitle="Review your past errors so you never make them again." breadcrumbs="Dashboard > Mistake Diary" />
      
      <PageWrapper>
        {/* Filters/Tabs Row */}
        <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-between gap-6 mb-8 select-none">
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
          
          {/* Custom Select Dropdown */}
          <div className="relative min-w-[200px] z-20">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex h-[42px] w-full items-center justify-between rounded-[12px] border border-black/5 dark:border-white/5 bg-b-surface2 dark:bg-[#161616] px-5 text-[13px] font-sans font-semibold text-t-primary shadow-[0_2px_4px_rgba(0,0,0,0.02)] cursor-pointer hover:bg-b-surface1 dark:hover:bg-[#1C1C1C] transition-colors"
            >
              <span>{filterSubject === "All" ? "All Subjects" : filterSubject}</span>
              <RiArrowDownSLine size={16} className={`text-t-secondary transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <ul className="absolute right-0 top-12 z-50 w-full rounded-[12px] border border-black/5 dark:border-white/5 bg-b-surface2 dark:bg-[#161616] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-top-1 duration-150">
                  {SUBJECT_OPTIONS.map((sub) => (
                    <li key={sub}>
                      <button
                        onClick={() => {
                          setFilterSubject(sub);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full rounded-[8px] px-4 py-2 text-left text-[13px] font-sans font-medium transition-colors cursor-pointer ${
                          filterSubject === sub
                            ? "bg-[#f5f5f5] dark:bg-[#222] text-t-primary font-semibold"
                            : "bg-transparent text-t-secondary hover:bg-[#fafafa] dark:hover:bg-[#1C1C1C] hover:text-t-primary"
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
          <SectionCard padding="none">
            <EmptyState
              icon={<RiCheckLine size={48} />}
              title={activeTab === "unresolved" ? "You're all caught up!" : "No resolved mistakes found"}
              description={activeTab === "unresolved" ? "You have reviewed all your errors. Great job!" : "You haven't marked any mistakes as resolved yet."}
            />
          </SectionCard>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredMistakes.map(m => (
              <SectionCard key={m.id} padding="default" className="hover:-translate-y-0.5 hover:shadow-depth transition-all duration-200">
                {/* Card Header */}
                <div className="relative z-10 mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-sans font-bold px-2 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/40 text-t-secondary rounded-[6px] uppercase tracking-wider">
                      {m.subject}
                    </span>
                    <span className="text-[10px] font-sans font-bold px-2 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/40 text-t-secondary rounded-[6px] uppercase tracking-wider">
                      {m.chapter}
                    </span>
                  </div>
                  <span className="text-[12px] font-sans font-semibold text-t-secondary">{m.exam} · {m.date}</span>
                </div>

                {/* Question Text */}
                <div className="relative z-10 mb-6">
                  <div className="text-[11px] font-sans font-bold uppercase tracking-widest text-t-secondary mb-1.5">Question</div>
                  <div className="font-sans font-semibold text-[17px] leading-snug tracking-[-0.02em] text-t-primary">
                    {m.question}
                  </div>
                </div>

                {/* Answers Grid */}
                <div className="relative z-10 mb-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[12px] border border-primary-03/20 bg-primary-03/5 p-5">
                    <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-primary-03 mb-1.5">Your Answer</div>
                    <div className="font-sans font-semibold text-[18px] text-primary-03">{m.studentAnswer}</div>
                  </div>
                  <div className="rounded-[12px] border border-primary-02/20 bg-primary-02/5 p-5">
                    <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-primary-02 mb-1.5">Correct Answer</div>
                    <div className="font-sans font-semibold text-[18px] text-primary-02">{m.correctAnswer}</div>
                  </div>
                </div>

                {/* Diagnostic & Actionable Tip Box */}
                <div className="relative z-10 mb-6 rounded-[12px] bg-b-surface1 dark:bg-b-surface1/40 p-5 border border-black/5 dark:border-white/5 flex flex-col gap-4">
                  <div className="flex gap-3">
                    <RiAlertFill size={20} className="shrink-0 text-t-secondary" />
                    <div>
                      <div className="text-[11px] font-sans font-bold uppercase tracking-widest text-t-secondary mb-0.5">Diagnosis: {m.errorType.replace("_", " ")}</div>
                      <div className="text-[13px] font-sans text-t-primary leading-relaxed">{m.detail}</div>
                    </div>
                  </div>
                  <div className="flex gap-3 border-t border-[#ebebeb] dark:border-[#282828] pt-4">
                    <RiLightbulbFlashLine size={20} className="shrink-0 text-t-secondary" />
                    <div>
                      <div className="text-[11px] font-sans font-bold uppercase tracking-widest text-t-secondary mb-0.5">Actionable Tip</div>
                      <div className="text-[13px] font-sans text-t-primary leading-relaxed">{m.tip}</div>
                    </div>
                  </div>
                </div>

                {/* Toggle Button */}
                <div className="relative z-10 flex justify-end">
                  {m.resolved ? (
                    <SecondaryButton onClick={() => toggleResolved(m.id)}>
                      Mark as Needs Review
                    </SecondaryButton>
                  ) : (
                    <button 
                      onClick={() => toggleResolved(m.id)}
                      className="relative flex items-center gap-2 overflow-hidden rounded-[10px] bg-[#161616] px-5 py-2.5 font-medium text-[13px] text-white shadow-[0px_6.8656px_6.8656px_-2.33333px_rgba(0,0,0,0.16),inset_0px_1px_0px_rgba(255,255,255,0.16),inset_0px_-2px_0px_#191919] transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      <i className="absolute -left-3 top-0 h-3 w-20 -rotate-[125deg] rounded-full bg-white/10 blur-[3px]" />
                      <RiCheckLine size={16} />
                      <span className="relative">Mark as Resolved</span>
                    </button>
                  )}
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </PageWrapper>
    </>
  );
}
