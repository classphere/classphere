import React from "react";
import { RiFlag2Fill } from "@remixicon/react";

interface SubmitModalProps {
  show: boolean;
  answered: number;
  questionsLength: number;
  unanswered: number;
  onClose: () => void;
  onSubmit: () => void;
}

export function SubmitModal({ show, answered, questionsLength, unanswered, onClose, onSubmit }: SubmitModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="card w-full max-w-lg p-6 text-center md:p-8 animate-in zoom-in-95 duration-200 bg-b-surface1">
        <div className="mb-5 flex justify-center text-t-primary">
          <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-b from-s-stroke2 to-[#C2C2C2] dark:from-[#3A3A3A] dark:to-[#222]">
            <RiFlag2Fill size={40} className="text-t-primary dark:text-white" />
          </div>
        </div>
        <h2 className="text-[24px] font-sans font-semibold tracking-[0.0015em] text-t-primary dark:text-t-primary">Ready to Submit?</h2>
        <p className="mt-4 text-[14px] font-sans text-t-secondary dark:text-t-secondary leading-[150%]">
          You&apos;ve answered <strong className="text-t-primary dark:text-t-primary">{answered}</strong> of{" "}
          <strong className="text-t-primary dark:text-t-primary">{questionsLength}</strong> questions.
          {unanswered > 0 && ` ${unanswered} questions are still unanswered.`}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            className="flex flex-row justify-center items-center py-3 px-7 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans font-semibold transition-all hover:border-t-secondary active:scale-98 flex-1 h-12"
            onClick={onClose}
          >
            Keep Working
          </button>
          <button
            id="confirm-submit-btn"
            className="flex flex-row justify-center items-center py-3 px-7 h-12 rounded-[10px] text-sm font-sans font-semibold tracking-[0.0125em] text-t-light transition-all active:scale-98 relative overflow-hidden bg-linear-to-b from-[#2C2C2C] to-[#282828] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] flex-1"
            onClick={onSubmit}
          >
            <span className="relative z-10">Submit Test</span>
          </button>
        </div>
      </div>
    </div>
  );
}
