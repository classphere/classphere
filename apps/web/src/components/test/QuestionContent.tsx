import React from "react";
import { QuestionBody, hasRenderableQuestionContent } from "@/components/QuestionBody";
import { RiFlag2Line } from "@remixicon/react";
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
  onReportQuestion?: () => void;
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
  onReportQuestion,
}: QuestionContentProps) {
  return (
    <section className="group relative card flex min-w-0 flex-col overflow-hidden p-4 sm:p-6 md:p-8 select-none lg:h-[calc(100dvh-9.5rem)] lg:overflow-y-auto">
      <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2 bg-b-surface1 text-t-secondary text-[12px] font-sans font-semibold rounded-[10px] tracking-[0.004em]">{q.subject}</span>
          <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2 bg-b-surface1 text-t-secondary text-[12px] font-sans font-semibold rounded-[10px] tracking-[0.004em]">{q.chapter}</span>
          {q.topic && <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2 bg-b-surface1 text-t-secondary text-[12px] font-sans font-semibold rounded-[10px] tracking-[0.004em]">{q.topic}</span>}
          <span className={`flex flex-row justify-center items-center px-2 py-0.5 border text-[12px] font-sans font-semibold rounded-[10px] tracking-[0.004em] ${q.difficulty === "easy" ? "border-s-stroke2/40 bg-[rgba(0,166,86,0.05)] text-primary-02" : q.difficulty === "hard" ? "border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] text-primary-03" : "border-s-stroke2/40 bg-[rgba(239,157,14,0.05)] text-primary-05"}`}>
            {q.difficulty}
          </span>
        </div>

        {onReportQuestion && (
          <button
            onClick={onReportQuestion}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border border-s-stroke2/60 bg-b-surface1 text-[11px] font-semibold text-t-secondary hover:text-red-500 hover:border-red-500/30 transition-colors"
            title="Report an issue or error with this question"
          >
            <RiFlag2Line size={13} />
            <span>Report Error</span>
          </button>
        )}
      </div>

      <div className="relative z-10 mb-3 flex items-start justify-between gap-4 border-b border-s-stroke2 pb-5">
        <div className="min-w-0 flex-1">
          <div className="text-overline font-bold uppercase tracking-wider text-t-tertiary">
            Question {current + 1} of {questionsLength}
          </div>
          <div className="question-stem mt-2 text-sub-title-1 leading-relaxed text-t-primary [&_.katex]:text-[1.1em] [&_.katex-display]:my-2">
            <QuestionBody
              blocks={q.content_blocks}
              legacyText={q.question_text}
              legacyImageUrl={q.image_url}
              legacyImageAlt={`Figure for question ${q.question_number}`}
              confidence={q.extraction_confidence}
              needs_review={q.needs_review ?? q._needs_review}
              review_reasons={q.review_reasons ?? q._defects}
            />
          </div>
        </div>
        <div className="hidden shrink-0 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-2 text-right sm:block">
          <div className="text-caption text-t-secondary">Progress</div>
          <div className="text-body-2 font-bold text-t-primary">{answered + markedCount}/{questionsLength}</div>
        </div>
      </div>

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
              const isEmpty = !hasRenderableQuestionContent(opt.content_blocks, opt.text, opt.image_url);

              return (
                <button
                  key={opt.id}
                  id={`option-${opt.id}`}
                  disabled={disabled || isEmpty}
                  className={`group/opt flex min-h-[72px] items-center gap-3 rounded-[10px] border p-3 text-left transition-all relative overflow-hidden ${
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
                  <div className="min-w-0 flex-1 text-[16px] font-medium leading-snug text-t-primary [&_.katex]:text-[1.1em]">
                    {isEmpty ? (
                      <span className="text-caption text-t-tertiary italic">Option not available</span>
                    ) : (
                      <QuestionBody
                        blocks={opt.content_blocks}
                        legacyText={opt.text}
                        legacyImageUrl={opt.image_url}
                        legacyImageAlt={`Option ${opt.id}`}
                        compact
                        confidence={opt.extraction_confidence}
                        needs_review={opt.needs_review}
                        review_reasons={opt.review_reasons}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="relative z-10 mt-3 grid grid-cols-2 gap-3 border-t border-s-stroke2 pt-5 lg:grid-cols-4">
        <button
          className="flex min-h-12 w-full items-center justify-center rounded-[9px] border border-[#008b49] bg-primary-02 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#008e49] active:scale-[0.98] sm:text-[11px] xl:text-xs"
          onClick={() => {
            onAttemptChanged();
            if (answers[q.id]) setStatus((s) => ({ ...s, [q.id]: "answered" }));
            else setStatus((s) => ({ ...s, [q.id]: "not_answered" }));
            if (current < questionsLength - 1) navigateTo(current + 1);
            else setShowSubmitModal(true);
          }}
        >
          <span className="text-center">{current < questionsLength - 1 ? "Save & Next" : "Save & Submit"}</span>
        </button>

        <button
          className="flex min-h-12 w-full items-center justify-center rounded-[9px] border border-s-stroke2 bg-b-surface1 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.04em] text-t-secondary transition-colors hover:bg-b-pop hover:text-t-primary active:scale-[0.98] sm:text-[11px] xl:text-xs"
          onClick={() => {
            onAttemptChanged();
            setAnswers((a) => {
              const newA = { ...a };
              delete newA[q.id];
              return newA;
            });
            setStatus((s) => ({ ...s, [q.id]: "not_answered" }));
          }}
        >
          Clear response
        </button>

        <button
          className="flex min-h-12 w-full items-center justify-center rounded-[9px] border border-[#d98700] bg-primary-05 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#e58d00] active:scale-[0.98] sm:text-[11px] xl:text-xs"
          onClick={() => {
            onAttemptChanged();
            const newStatus = answers[q.id] ? "answered_and_marked_for_review" : "marked_for_review";
            setStatus((s) => ({ ...s, [q.id]: newStatus }));
            if (current < questionsLength - 1) navigateTo(current + 1);
            else setShowSubmitModal(true);
          }}
        >
          <span className="text-center">Save & Mark for Review</span>
        </button>

        <button
          className="flex min-h-12 w-full items-center justify-center rounded-[9px] border border-[#245bd2] bg-primary-01 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#1478e9] active:scale-[0.98] sm:text-[11px] xl:text-xs"
          onClick={() => {
            onAttemptChanged();
            const newStatus = answers[q.id] ? "answered_and_marked_for_review" : "marked_for_review";
            setStatus((s) => ({ ...s, [q.id]: newStatus }));
            if (current < questionsLength - 1) navigateTo(current + 1);
            else setShowSubmitModal(true);
          }}
        >
          <span className="text-center">Mark for Review & Next</span>
        </button>
      </div>
    </section>
  );
}
