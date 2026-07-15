import React from "react";
import { Question, AnswerMap, StatusMap } from "./TestTypes";

interface QuestionNavigatorProps {
  questions: Question[];
  current: number;
  status: StatusMap;
  answers: AnswerMap;
  visitedQs: Record<string, boolean>;
  navigateTo: (idx: number) => void;
  notVisitedCount: number;
  notAnsweredCount: number;
  answeredCount: number;
  markedCount: number;
  answeredMarkedCount: number;
}

export function QuestionNavigator({
  questions,
  current,
  status,
  answers,
  visitedQs,
  navigateTo,
  notVisitedCount,
  notAnsweredCount,
  answeredCount,
  markedCount,
  answeredMarkedCount,
}: QuestionNavigatorProps) {
  const subjects = [...new Set(questions.map((q) => q.subject))];

  return (
    <aside className="group relative card flex flex-col overflow-hidden min-w-0 p-6 md:p-8 card select-none xl:sticky xl:top-[7.5rem] xl:h-[calc(100vh-9rem)] xl:overflow-y-auto">
      <div className="relative z-10 mb-6 grid grid-cols-2 gap-y-3 gap-x-2 text-[13px] font-sans text-t-primary font-medium">
        {/* 1. Not Visited */}
        <div className="flex items-center gap-2 col-span-2 xl:col-span-1">
          <div className="w-8 h-8 flex items-center justify-center rounded-[4px] border border-t-secondary bg-gradient-to-br from-shade-10 to-[#E0E0E0] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(0,0,0,0.1)] text-black font-semibold text-xs shrink-0">
            {notVisitedCount}
          </div>
          <span className="leading-tight">Not Visited</span>
        </div>
        {/* 2. Not Answered */}
        <div className="flex items-center gap-2 col-span-2 xl:col-span-1">
          <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-[#E64125] to-[#C7270D] text-white font-semibold text-xs [clip-path:polygon(0%_0%,_100%_15%,_100%_85%,_0%_100%)] shadow-sm shrink-0">
            {notAnsweredCount}
          </div>
          <span className="leading-tight">Not Answered</span>
        </div>
        {/* 3. Answered */}
        <div className="flex items-center gap-2 col-span-2 xl:col-span-1">
          <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] text-white font-semibold text-xs [clip-path:polygon(0%_0%,_100%_15%,_100%_85%,_0%_100%)] shadow-sm shrink-0">
            {answeredCount}
          </div>
          <span className="leading-tight">Answered</span>
        </div>
        {/* 4. Marked for Review */}
        <div className="flex items-center gap-2 col-span-2 xl:col-span-1">
          <div className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6A1B9A] to-[#4A148C] text-white font-semibold text-xs shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)] shrink-0">
            {markedCount}
          </div>
          <span className="leading-tight">Marked for Review</span>
        </div>
        {/* 5. Answered & Marked */}
        <div className="flex items-center gap-2 col-span-2">
          <div className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6A1B9A] to-[#4A148C] text-white font-semibold text-xs shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)] relative shrink-0">
            {answeredMarkedCount}
            <div className="absolute -bottom-0.5 -right-0.5 size-[12px] bg-[#4CAF50] rounded-full border border-white flex items-center justify-center">
              <svg viewBox="0 0 10 10" className="w-2 h-2 text-white" fill="none">
                <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <span className="leading-tight text-[11px] xl:text-[12px]">Answered & Marked (evaluated)</span>
        </div>
      </div>

      <div className="relative z-10">
        {subjects.map((subj) => {
          const subjQs = questions.filter((item) => item.subject === subj);
          return (
            <div key={subj} className="mb-6 last:mb-0">
              <div className="mb-4 text-overline font-bold uppercase tracking-[0.05em] text-t-tertiary">
                {subj}
              </div>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5">
                {subjQs.map((sq) => {
                  const globalIdx = questions.findIndex((gq) => gq.id === sq.id);
                  const s = status[sq.id];
                  const hasAns = !!answers[sq.id];
                  const visited = !!visitedQs[sq.id];
                  const isCurrent = globalIdx === current;

                  let btnClass = "w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-[15px] font-bold transition-all hover:scale-[1.05] active:scale-95 cursor-pointer shrink-0 ";
                  let content: React.ReactNode = sq.question_number;

                  if (s === "answered") {
                    btnClass += "bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] text-white [clip-path:polygon(0%_0%,_100%_15%,_100%_85%,_0%_100%)] shadow-sm";
                  } else if (s === "review") {
                    if (hasAns) {
                      btnClass += "rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#4A148C] text-white shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)] relative";
                      content = (
                        <>
                          {sq.question_number}
                          <div className="absolute -bottom-0.5 -right-0.5 size-[14px] bg-[#4CAF50] rounded-full border-[1.5px] border-white flex items-center justify-center">
                            <svg viewBox="0 0 10 10" className="w-2 h-2 text-white" fill="none">
                              <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </>
                      );
                    } else {
                      btnClass += "rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#4A148C] text-white shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)]";
                    }
                  } else {
                    if (visited) {
                      btnClass += "bg-gradient-to-br from-[#E64125] to-[#C7270D] text-white [clip-path:polygon(0%_0%,_100%_15%,_100%_85%,_0%_100%)] shadow-sm";
                    } else {
                      btnClass += "rounded-[4px] border border-t-secondary bg-gradient-to-br from-shade-10 to-[#E0E0E0] text-black shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(0,0,0,0.1)]";
                    }
                  }

                  const wrapperClass = "p-0.5";

                  return (
                    <div key={sq.id} className={`flex items-center justify-center ${wrapperClass}`}>
                      <button
                        id={`nav-q-${sq.question_number}`}
                        className={btnClass}
                        onClick={() => navigateTo(globalIdx)}
                      >
                        {content}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
