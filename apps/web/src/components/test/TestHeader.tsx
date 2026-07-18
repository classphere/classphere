import React from "react";
import { RiTimerLine } from "@remixicon/react";
import { TestMeta } from "./TestTypes";

interface TestHeaderProps {
  meta: TestMeta | null;
  questionsLength: number;
  timeLeft: number | null;
  timeWarning: boolean;
  setShowSubmitModal: (show: boolean) => void;
  formatTime: (secs: number) => string;
}

export function TestHeader({ meta, questionsLength, timeLeft, timeWarning, setShowSubmitModal, formatTime }: TestHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-s-stroke2/70 bg-b-surface1/95 backdrop-blur-0">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-h6 font-bold tracking-tight text-t-primary">
            <span>Exam</span>
            <span className="text-primary-01">Prep</span>
          </div>
          {meta && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-t-secondary">
              {meta.exam && <span className="label label-gray">{meta.exam} {meta.year}</span>}
              {meta.shift && <span className="label label-gray">{meta.shift}</span>}
              <span className="label label-gray">{questionsLength} Questions</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {meta?.test_type !== "ncert" ? (
            <div className={`flex items-center gap-3 rounded-[10px] border px-4 py-2.5 shadow-widget ${timeWarning ? "border-s-stroke2/40 bg-[rgba(255,106,85,0.05)]" : "border-s-stroke2 bg-b-surface2"}`}>
              <span className={`${timeWarning ? "text-primary-03" : "text-t-primary"}`}>
                <RiTimerLine size={18} />
              </span>
              <span className={`text-body-2 font-bold tabular-nums ${timeWarning ? "text-primary-03" : "text-t-primary"}`}>
                {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-2.5 shadow-widget">
              <span className="text-t-primary font-bold text-sm tracking-wide">PRACTICE MODE</span>
            </div>
          )}

          <button
            id="submit-test-btn"
            className="flex flex-row justify-center items-center py-3 px-7 h-12 rounded-[10px] text-sm font-sans font-semibold tracking-[0.0125em] text-t-light transition-all active:scale-98 cursor-pointer relative overflow-hidden bg-linear-to-b from-[#2C2C2C] to-[#282828] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)]"
            onClick={() => setShowSubmitModal(true)}
          >
            <span className="relative z-10">Submit Test</span>
          </button>
        </div>
      </div>
    </header>
  );
}
