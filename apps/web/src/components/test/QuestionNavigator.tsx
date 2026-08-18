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
  variant?: "desktop" | "drawer";
  onNavigate?: () => void;
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
  variant = "desktop",
  onNavigate,
}: QuestionNavigatorProps) {
  const subjects = [...new Set(questions.map((q) => q.subject))];
  const paletteCellSize = "size-8";

  return (
    <aside className={`relative min-w-0 select-none border border-s-stroke2 bg-b-surface2/80 shadow-widget ${
      variant === "desktop"
        ? "hidden lg:flex lg:flex-col lg:h-[calc(100dvh-9.5rem)] lg:overflow-y-auto rounded-[18px] p-5 xl:p-6"
        : "flex h-full flex-col overflow-y-auto p-5 sm:p-6"
    }`}>
      <div className="mb-3 border-b border-s-stroke2 pb-5"><p className="text-sm font-bold text-t-primary">Question palette</p><p className="mt-0.5 text-xs text-t-secondary">Use it to move between questions</p></div>
      <div className="relative z-10 mb-3 grid grid-cols-2 gap-y-3 gap-x-2 text-[13px] font-sans text-t-primary font-medium">
        {/* 1. Not Visited */}
          <div className="flex items-center gap-2 col-span-2 xl:col-span-1">
          <div className={`${paletteCellSize} flex items-center justify-center rounded-[5px] border border-s-stroke2 bg-b-pop text-t-primary font-semibold text-xs shrink-0`}>
            {notVisitedCount}
          </div>
          <span className="leading-tight">Not Visited</span>
        </div>
        {/* 2. Not Answered */}
        <div className="flex items-center gap-2 col-span-2 xl:col-span-1">
          <div className={`${paletteCellSize} flex items-center justify-center bg-gradient-to-br from-[#E64125] to-[#C7270D] text-white font-semibold text-xs [clip-path:polygon(0%_0%,_100%_15%,_100%_85%,_0%_100%)] shadow-widget shrink-0`}>
            {notAnsweredCount}
          </div>
          <span className="leading-tight">Not Answered</span>
        </div>
        {/* 3. Answered */}
        <div className="flex items-center gap-2 col-span-2 xl:col-span-1">
          <div className={`${paletteCellSize} flex items-center justify-center bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] text-white font-semibold text-xs [clip-path:polygon(0%_0%,_100%_15%,_100%_85%,_0%_100%)] shadow-widget shrink-0`}>
            {answeredCount}
          </div>
          <span className="leading-tight">Answered</span>
        </div>
        {/* 4. Marked for Review */}
        <div className="flex items-center gap-2 col-span-2 xl:col-span-1">
          <div className={`${paletteCellSize} flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6A1B9A] to-[#4A148C] text-white font-semibold text-xs shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)] shrink-0`}>
            {markedCount}
          </div>
          <span className="leading-tight">Marked for Review</span>
        </div>
        {/* 5. Answered & Marked */}
        <div className="flex items-center gap-2 col-span-2">
          <div className={`${paletteCellSize} relative flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6A1B9A] to-[#4A148C] text-white font-semibold text-xs shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)] shrink-0`}>
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
            <div key={subj} className="mb-3 last:mb-0">
              <div className="mb-3 text-overline font-bold uppercase tracking-[0.08em] text-t-tertiary">
                {subj}
              </div>
              <div className="grid grid-cols-5 gap-2 min-[390px]:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
                {subjQs.map((sq) => {
                  const globalIdx = questions.findIndex((gq) => gq.id === sq.id);
                  const s = status[sq.id];
                  const hasAns = !!answers[sq.id];
                  const visited = !!visitedQs[sq.id];
                  const isCurrent = globalIdx === current;

                  let btnClass = `${paletteCellSize} flex items-center justify-center text-xs font-bold transition-all hover:brightness-95 active:scale-95 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-01 `;
                  let content: React.ReactNode = sq.question_number;

                  if (s === "answered") {
                    btnClass += "bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] text-white [clip-path:polygon(0%_0%,_100%_15%,_100%_85%,_0%_100%)] shadow-widget";
                  } else if (s === "answered_and_marked_for_review" || (s === "review" && hasAns)) {
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
                  } else if (s === "marked_for_review" || (s === "review" && !hasAns)) {
                    btnClass += "rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#4A148C] text-white shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)]";
                  } else if (s === "not_answered" || (visited && s !== "not_visited")) {
                    btnClass += "bg-gradient-to-br from-[#E64125] to-[#C7270D] text-white [clip-path:polygon(0%_0%,_100%_15%,_100%_85%,_0%_100%)] shadow-widget";
                  } else {
                    btnClass += "rounded-[5px] border border-s-stroke2 bg-b-pop text-t-primary";
                  }

                  const wrapperClass = "p-0.5";

                  return (
                    <div key={sq.id} className={`flex items-center justify-center ${wrapperClass}`}>
                      <button
                        id={`nav-q-${sq.question_number}`}
                        className={btnClass}
                          onClick={() => {
                            navigateTo(globalIdx);
                            onNavigate?.();
                          }}
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
