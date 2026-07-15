import React, { useState } from "react";
import {
  RiSearchLine,
  RiLightbulbFlashLine,
  RiArrowUpSLine,
  RiArrowDownSLine,
} from "@remixicon/react";
import { SectionCard } from "@/components/ui/SectionCard";
import { formatTimeSpent, getSubjectStats, getOverviewLabel } from "@/lib/results-utils";

interface DetailedPerformanceTabsProps {
  analysis: any;
  totalQuestions: number;
  strategySubjects: string[];
}

export function DetailedPerformanceTabs({ analysis: a, totalQuestions, strategySubjects }: DetailedPerformanceTabsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "analysis" | "time" | "missed" | "complete">("overview");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <SectionCard
      title="Detailed Performance Report"
      subtitle="Deep-dive pedagogical analysis of your test attempts."
      padding="large"
      headerRight={
        <div className="flex items-center gap-1 p-1 rounded-full border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1 w-fit max-w-full overflow-x-auto scrollbar-hide shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
          {[
            { id: "overview", label: "Overview" },
            { id: "analysis", label: "Analysis" },
            { id: "time", label: "Time & Accuracy" },
            { id: "missed", label: "Missed Concepts" },
            { id: "complete", label: "Complete Analysis" }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-[10px] text-[12px] font-sans font-semibold tracking-[0.004em] transition-all whitespace-nowrap shrink-0 ${
                activeTab === t.id 
                  ? "bg-linear-to-b from-[#2C2C2C] to-[#282828] text-white shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-full after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] relative overflow-hidden" 
                  : "bg-transparent text-t-secondary hover:text-t-primary"
              }`}
            >
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
      }
    >
      <div className="relative z-10 pt-2 border-t border-s-stroke2/50 mt-4">
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fadeIn mt-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-t-tertiary">Summary of marks scored in the test</div>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {[
                { label: "Score", value: `${a.scoring.score}/${a.scoring.maxScore}`, sub: "Marks Obtained" },
                { label: "Accuracy", value: `${a.scoring.correctCount + a.scoring.incorrectCount > 0 ? Math.round((a.scoring.correctCount / (a.scoring.correctCount + a.scoring.incorrectCount)) * 100) : 0}%`, sub: "Attempt Accuracy" },
                { label: "Qs Attempted", value: `${a.scoring.correctCount + a.scoring.incorrectCount}/${totalQuestions}`, sub: "Out of Total Questions" },
                { label: "Time Taken", value: `${Math.round(Object.values(a.attemptStrategy?.timePerSubjectSec || {}).reduce((sum: number, val: any) => sum + val, 0) / 60)}/180 min`, sub: "Total Spent Time" }
              ].map((stat, i) => (
                <div key={i} className="rounded-[10px] border border-s-stroke2 bg-b-surface1 p-5 text-center">
                  <div className="text-caption font-bold uppercase tracking-[0.22em] text-t-tertiary mb-2">{stat.label}</div>
                  <div className="text-h3 font-black tracking-tight text-t-primary">{stat.value}</div>
                  <div className="text-caption text-t-secondary mt-1">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="space-y-6 animate-fadeIn mt-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-t-tertiary mb-1">Detailed analysis of your performance</div>
              <p className="text-caption text-t-secondary leading-relaxed max-w-3xl">
                This is a quick snapshot of your performance measured in terms of attempts that were correct, incorrect, unattempted and questions that were not visited at all. The individual subject-wise analysis will help you gauge your performance on a subject level.
              </p>
            </div>
            <div className="overflow-x-auto rounded-[10px] border border-s-stroke2">
              <table className="rayum-table">
                <thead>
                  <tr>
                    <th>SUBJECT</th>
                    <th>SCORE</th>
                    <th>CORRECT</th>
                    <th>INCORRECT</th>
                    <th>UNATTEMPTED</th>
                    <th>NOT VISITED</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const overall = getSubjectStats(a, null);
                    return (
                      <tr className="font-bold bg-b-surface1/30">
                        <td>Overall</td>
                        <td>{overall.score}/{overall.maxScore}</td>
                        <td>{overall.correct}/75</td>
                        <td>{overall.incorrect}/75</td>
                        <td>{overall.unattempted}/75</td>
                        <td>{overall.notVisited}/75</td>
                      </tr>
                    );
                  })()}
                  {strategySubjects.map((subj: string) => {
                    const stats = getSubjectStats(a, subj);
                    return (
                      <tr key={subj}>
                        <td className="font-semibold">{subj}</td>
                        <td>{stats.score}/{stats.maxScore}</td>
                        <td>{stats.correct}/25</td>
                        <td>{stats.incorrect}/25</td>
                        <td>{stats.unattempted}/25</td>
                        <td>{stats.notVisited}/25</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "time" && (
          <div className="space-y-6 animate-fadeIn mt-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-t-tertiary mb-1">Time and Accuracy</div>
              <p className="text-caption text-t-secondary leading-relaxed max-w-3xl">
                Time is the most important resource in any competitive exam. And one major element of any test analysis is to check the time spent on an individual subject. This section will not only give you insight on the time spent but also the percentage attempt and accuracy at the subject level.
              </p>
            </div>
            <div className="overflow-x-auto rounded-[10px] border border-s-stroke2">
              <table className="rayum-table">
                <thead>
                  <tr>
                    <th>SUBJECT</th>
                    <th>TIME SPENT</th>
                    <th>ATTEMPT (IN %)</th>
                    <th>ACCURACY (IN %)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const spent = Object.values(a.attemptStrategy?.timePerSubjectSec || {}).reduce((sum: number, val: any) => sum + val, 0);
                    const attempted = a.scoring.correctCount + a.scoring.incorrectCount;
                    const attemptPct = Math.round((attempted / 75) * 100);
                    const accuracyPct = attempted > 0 ? Math.round((a.scoring.correctCount / attempted) * 100) : 0;
                    return (
                      <tr className="font-bold bg-b-surface1/30">
                        <td>Overall</td>
                        <td>{formatTimeSpent(spent)}</td>
                        <td>{attemptPct}%</td>
                        <td>{accuracyPct}%</td>
                      </tr>
                    );
                  })()}
                  {strategySubjects.map((subj: string) => {
                    const spent = a.attemptStrategy?.timePerSubjectSec?.[subj] || 0;
                    const stats = getSubjectStats(a, subj);
                    const attempted = stats.correct + stats.incorrect;
                    const attemptPct = Math.round((attempted / 30) * 100);
                    const accuracyPct = attempted > 0 ? Math.round((stats.correct / attempted) * 100) : 0;
                    return (
                      <tr key={subj}>
                        <td className="font-semibold">{subj}</td>
                        <td>{formatTimeSpent(spent)}</td>
                        <td>{attemptPct}%</td>
                        <td>{accuracyPct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "missed" && (
          <div className="space-y-6 animate-fadeIn mt-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-t-tertiary mb-1">Missed Concepts</div>
              <p className="text-caption text-t-secondary leading-relaxed max-w-3xl">
                This section lists all the concepts you got wrong in the exam on an individual subject level. This information becomes relevant for you as you will now need to spend some time brushing up these concepts.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {["Physics", "Chemistry", "Mathematics"].map((subj) => {
                const missed = a.classified
                  .filter((ans: any) => ans.question.subject === subj && ans.selected_answer && !ans.is_correct)
                  .map((ans: any) => ans.question.topic);
                const uniqueMissed = Array.from(new Set(missed));
                return (
                  <div key={subj} className="rounded-[10px] border border-s-stroke2 bg-b-surface1 p-5">
                    <h3 className="text-body-2 font-bold text-t-primary mb-3 pb-2 border-b border-s-stroke2">{subj}</h3>
                    {uniqueMissed.length > 0 ? (
                      <ol className="list-decimal pl-5 space-y-2 text-caption text-t-secondary">
                        {uniqueMissed.map((topic: any, idx) => (
                          <li key={idx} className="leading-relaxed">{topic}</li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-caption text-t-tertiary italic">Great! You did not miss any concept.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "complete" && (
          <div className="space-y-6 animate-fadeIn mt-4">
            <div className="overflow-x-auto rounded-[10px] border border-s-stroke2">
              <table className="rayum-table">
                <thead>
                  <tr>
                    <th>QNO</th>
                    <th>CHAPTER</th>
                    <th>TOPIC</th>
                    <th>DIFFICULTY</th>
                    <th>ALLOTTED</th>
                    <th>SPENT</th>
                    <th>ATTEMPTED</th>
                    <th>ANSWER</th>
                    <th>OVERVIEW</th>
                  </tr>
                </thead>
                <tbody>
                  {a.classified.map((ans: any) => {
                    const qNum = ans.question.question_number;
                    const chapter = ans.question.chapter;
                    const topic = ans.question.topic;
                    const difficulty = ans.question.difficulty === "easy" ? "Easy" : ans.question.difficulty === "medium" ? "Moderate" : "Difficult";
                    const allotted = ans.question.difficulty === "easy" ? "90 s" : ans.question.difficulty === "medium" ? "120 s" : "210 s";
                    const spent = `${ans.time_taken_sec || 0} s`;
                    const attempted = ans.selected_answer ? "Yes" : "No";
                    
                    let ansLabel = "- Skipped";
                    let ansColor = "text-t-tertiary";
                    if (ans.selected_answer) {
                      if (ans.is_correct) {
                        ansLabel = "✓ Correct";
                        ansColor = "text-primary-02 font-bold";
                      } else {
                        ansLabel = "✗ Incorrect";
                        ansColor = "text-primary-03 font-bold";
                      }
                    }

                    const classification = ans.classification;
                    const isExpanded = expandedRow === ans.id;
                    
                    const fallbackOverview = getOverviewLabel(ans);
                    const typeLabel = classification?.type ? classification.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : fallbackOverview;
                    let typeColor = "text-t-tertiary";
                    if (classification?.type === "correct" || classification?.type === "strategic_skip") typeColor = "text-primary-02 font-bold";
                    else if (classification?.type === "silly" || classification?.type === "wasted_time" || classification?.type === "ran_out_of_time") typeColor = "text-primary-03 font-bold";
                    else if (classification?.type) typeColor = "text-primary-05 font-bold";
                    else if (fallbackOverview === "Perfect") typeColor = "text-primary-02 font-bold";
                    else if (fallbackOverview === "Wasted") typeColor = "text-primary-03 font-bold";
                    else if (fallbackOverview === "Confused") typeColor = "text-primary-05 font-bold";

                    return (
                      <React.Fragment key={ans.id}>
                        <tr onClick={() => classification?.detail && setExpandedRow(isExpanded ? null : ans.id)} className={classification?.detail ? "cursor-pointer hover:bg-b-surface1/50 transition-colors" : ""}>
                          <td>{qNum}</td>
                          <td>{chapter}</td>
                          <td>{topic}</td>
                          <td>{difficulty}</td>
                          <td>{allotted}</td>
                          <td>{spent}</td>
                          <td>{attempted}</td>
                          <td className={ansColor}>{ansLabel}</td>
                          <td className={typeColor}>
                            <div className="flex items-center justify-between">
                              <span>{typeLabel}</span>
                              {classification?.detail && (
                                isExpanded ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && classification?.detail && (
                          <tr className="bg-[rgba(55,101,246,0.02)] border-b border-s-stroke2">
                            <td colSpan={9} className="p-4">
                              <div className="flex flex-col gap-2 text-[12px] text-t-primary dark:text-t-primary">
                                <div className="flex items-start gap-2">
                                  <RiSearchLine size={16} className="text-primary-01 mt-0.5 shrink-0" />
                                  <p><strong className="text-primary-01">Analysis:</strong> {classification.detail}</p>
                                </div>
                                {classification.tip && (
                                  <div className="flex items-start gap-2">
                                    <RiLightbulbFlashLine size={16} className="text-primary-05 mt-0.5 shrink-0" />
                                    <p><strong className="text-primary-05">Actionable Tip:</strong> {classification.tip}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
