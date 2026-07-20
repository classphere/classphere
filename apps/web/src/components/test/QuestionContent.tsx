import React from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Question, AnswerMap, StatusMap } from "./TestTypes";

interface QuestionContentProps {
  question: Question;
  current: number;
  questionsLength: number;
  answers: AnswerMap;
  setAnswers: React.Dispatch<React.SetStateAction<AnswerMap>>;
  setStatus: React.Dispatch<React.SetStateAction<StatusMap>>;
  onAttemptChanged: () => void;
  selectAnswer: (qId: string, optId: string) => void;
  navigateTo: (idx: number) => void;
  setShowSubmitModal: (show: boolean) => void;
  answered: number;
  markedCount: number;
  isSectionBLimitReached: (q: Question) => boolean;
}

export function QuestionContent({
  question: q,
  current,
  questionsLength,
  answers,
  setAnswers,
  setStatus,
  onAttemptChanged,
  selectAnswer,
  navigateTo,
  setShowSubmitModal,
  answered,
  markedCount,
  isSectionBLimitReached,
}: QuestionContentProps) {
  // Imports made before media normalisation may carry the same diagram both
  // inline in markdown and in image_url. Preserve distinct multi-figure
  // questions while avoiding a duplicate figure for legacy records.
  const hasInlineQuestionImage = Boolean(q.image_url && q.question_text?.includes(`](${q.image_url})`));
  return (
    <section className="group relative card flex flex-col overflow-hidden min-w-0 p-4 sm:p-6 md:p-8 card select-none lg:sticky lg:top-[7.5rem] lg:h-[calc(100dvh-9rem)] lg:overflow-y-auto">
      <div className="relative z-10 mb-5 flex flex-wrap items-center gap-2">
        <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2 bg-b-surface1 text-t-secondary text-[12px] font-sans font-semibold rounded-[10px] tracking-[0.004em]">{q.subject}</span>
        <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2 bg-b-surface1 text-t-secondary text-[12px] font-sans font-semibold rounded-[10px] tracking-[0.004em]">{q.chapter}</span>
        {q.topic && <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2 bg-b-surface1 text-t-secondary text-[12px] font-sans font-semibold rounded-[10px] tracking-[0.004em]">{q.topic}</span>}
        <span className={`flex flex-row justify-center items-center px-2 py-0.5 border text-[12px] font-sans font-semibold rounded-[10px] tracking-[0.004em] ${q.difficulty === "easy" ? "border-s-stroke2/40 bg-[rgba(0,166,86,0.05)] text-primary-02" : q.difficulty === "hard" ? "border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] text-primary-03" : "border-s-stroke2/40 bg-[rgba(239,157,14,0.05)] text-primary-05"}`}>
          {q.difficulty}
        </span>
      </div>

      <div className="relative z-10 mb-6 flex items-start justify-between gap-4 border-b border-s-stroke2 pb-5">
        <div className="min-w-0">
          <div className="text-overline font-bold uppercase tracking-wider text-t-tertiary">
            Question {current + 1} of {questionsLength}
          </div>
          <div className="mt-2 text-sub-title-1 leading-relaxed text-t-primary">
            <MarkdownRenderer>{q.question_text}</MarkdownRenderer>
          </div>
        </div>
        <div className="hidden shrink-0 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-2 text-right sm:block">
          <div className="text-caption text-t-secondary">Progress</div>
          <div className="text-body-2 font-bold text-t-primary">{answered + markedCount}/{questionsLength}</div>
        </div>
      </div>

      {/* Question images */}
      {q.image_url && !hasInlineQuestionImage && (
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={q.image_url} alt="Figure" className="max-h-[420px] max-w-full rounded-[10px] border border-s-stroke2 object-contain" referrerPolicy="no-referrer" />
        </div>
      )}

      {/* Options or Text Input */}
      <div className="relative z-10 space-y-3">
        {isSectionBLimitReached(q) && (
          <div className="rounded-[10px] border border-amber-200/50 bg-amber-50/50 p-4 text-amber-950">
            <p className="text-caption font-bold uppercase tracking-wider text-amber-800">⚠️ Section B limit reached</p>
            <p className="mt-1 text-caption font-semibold">
              You have already answered 5 numerical questions in {q.subject}. To attempt this question, please clear your answer on another numerical question in this subject first.
            </p>
          </div>
        )}

        {!q.options || q.options.length === 0 ? (
          <div className="max-w-xl">
            <label className="mb-2 block text-caption font-bold uppercase tracking-wider text-t-tertiary">
              Enter numerical answer
            </label>
            <input
              type="text"
              className="input h-12 rounded-[10px] px-4 text-body-1 font-semibold disabled:bg-b-surface2 disabled:cursor-not-allowed disabled:text-t-tertiary"
              placeholder={isSectionBLimitReached(q) ? "Section B limit of 5 reached" : "Type your answer..."}
              disabled={isSectionBLimitReached(q)}
              value={answers[q.id] || ""}
              onChange={(e) => {
                const val = e.target.value;
                onAttemptChanged();
                setAnswers((a) => ({ ...a, [q.id]: val }));
                setStatus((s) => ({ ...s, [q.id]: val ? "answered" : "unanswered" }));
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.id;
              const disabled = isSectionBLimitReached(q) && !selected;
              const hasText = opt.text && opt.text.trim().length > 0;
              const hasImage = !!opt.image_url && !opt.text?.includes(`](${opt.image_url})`);
              const isEmpty = !hasText && !hasImage;

              return (
                <button
                  key={opt.id}
                  id={`option-${opt.id}`}
                  disabled={disabled || isEmpty}
                  className={`group/opt flex items-center gap-4 rounded-[10px] border p-4 text-left transition-all relative overflow-hidden ${
                    isEmpty
                      ? "border-dashed border-s-stroke2 bg-b-surface2/30 opacity-50 cursor-not-allowed"
                      : selected
                        ? "border-primary-01 bg-primary-01/5 shadow-widget"
                        : disabled
                          ? "border-s-stroke2 bg-b-surface2/50 cursor-not-allowed opacity-50"
                          : "border-s-stroke2 bg-b-surface2 hover:border-s-highlight shadow-sm"
                  }`}
                  onClick={() => !isEmpty && selectAnswer(q.id, opt.id)}
                >
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-colors ${
                    selected
                      ? "bg-primary-01 text-t-light"
                      : "bg-b-surface1 text-t-primary border border-s-stroke2 group-hover/opt:border-s-highlight"
                  }`}>
                    {opt.id}
                  </div>
                  <div className="min-w-0 flex-1 text-body-2 font-medium text-t-primary">
                    {isEmpty ? (
                      <span className="text-caption text-t-tertiary italic">Option not available</span>
                    ) : (
                      <>
                        {hasText && <MarkdownRenderer>{opt.text}</MarkdownRenderer>}
                        {hasImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={opt.image_url!}
                            alt={`Option ${opt.id}`}
                            className="mt-2 max-h-36 max-w-full object-contain rounded-[10px] bg-white p-2 border border-s-stroke2/50 shadow-sm"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector(".img-error")) {
                                const err = document.createElement("span");
                                err.className = "img-error text-caption text-t-tertiary italic";
                                err.textContent = "⚠ Image unavailable";
                                parent.appendChild(err);
                              }
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="relative z-10 mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 border-t border-s-stroke2 pt-6">
        <button
          className="flex min-h-12 flex-row items-center justify-center px-2 py-2 rounded-[10px] text-[10px] sm:text-[11px] xl:text-xs font-sans font-bold tracking-[0.025em] text-t-light transition-all active:scale-98 relative overflow-hidden bg-linear-to-b from-[#00A656] to-[#008A47] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] uppercase w-full"
          onClick={() => {
            onAttemptChanged();
            if (answers[q.id]) setStatus((s) => ({ ...s, [q.id]: "answered" }));
            else setStatus((s) => ({ ...s, [q.id]: "unanswered" }));
            if (current < questionsLength - 1) navigateTo(current + 1);
            else setShowSubmitModal(true);
          }}
        >
          <span className="relative z-10 text-center">{current < questionsLength - 1 ? "Save & Next" : "Save & Submit"}</span>
        </button>

        <button
          className="flex min-h-12 flex-row items-center justify-center px-2 py-2 border border-s-stroke2 dark:border-s-stroke2 bg-transparent text-t-secondary dark:text-t-secondary hover:bg-b-surface1/60 hover:text-t-primary rounded-[10px] text-[10px] sm:text-[11px] xl:text-xs font-sans font-bold tracking-[0.025em] transition-all active:scale-98 uppercase w-full"
          onClick={() => {
            onAttemptChanged();
            setAnswers((a) => {
              const newA = { ...a };
              delete newA[q.id];
              return newA;
            });
            setStatus((s) => ({ ...s, [q.id]: "unanswered" }));
          }}
        >
          Clear
        </button>

        <button
          className="flex min-h-12 flex-row items-center justify-center px-2 py-2 rounded-[10px] text-[10px] sm:text-[11px] xl:text-xs font-sans font-bold tracking-[0.025em] text-t-light transition-all active:scale-98 relative overflow-hidden bg-linear-to-b from-[#EF9D0E] to-[#D98500] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] uppercase w-full"
          onClick={() => {
            onAttemptChanged();
            setStatus((s) => ({ ...s, [q.id]: "review" }));
            if (current < questionsLength - 1) navigateTo(current + 1);
            else setShowSubmitModal(true);
          }}
        >
          <span className="relative z-10 text-center">Save & Mark for Review</span>
        </button>

        <button
          className="flex min-h-12 flex-row items-center justify-center px-2 py-2 rounded-[10px] text-[10px] sm:text-[11px] xl:text-xs font-sans font-bold tracking-[0.025em] text-t-light transition-all active:scale-98 relative overflow-hidden bg-linear-to-b from-[#2563EB] to-[#1D4ED8] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] uppercase w-full"
          onClick={() => {
            onAttemptChanged();
            setStatus((s) => ({ ...s, [q.id]: "review" }));
            if (current < questionsLength - 1) navigateTo(current + 1);
            else setShowSubmitModal(true);
          }}
        >
          <span className="relative z-10 text-center">Mark for Review & Next</span>
        </button>
      </div>
    </section>
  );
}
