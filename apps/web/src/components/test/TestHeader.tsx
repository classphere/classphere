"use client";

import React from "react";
import Image from "next/image";
import { RiTimerLine } from "@remixicon/react";
import { TestMeta } from "./TestTypes";
import { useTenant } from "@/lib/tenant-context";

interface TestHeaderProps {
  meta: TestMeta | null;
  questionsLength: number;
  timeLeft: number | null;
  timeWarning: boolean;
  isTimed: boolean;
  candidateName?: string | null;
  setShowSubmitModal: (show: boolean) => void;
  formatTime: (secs: number) => string;
}

export function TestHeader({ meta, questionsLength, timeLeft, timeWarning, isTimed, candidateName, setShowSubmitModal, formatTime }: TestHeaderProps) {
  const tenant = useTenant();
  const displayName = tenant.instituteName ?? "Classphere";

  return (
    <header className="sticky top-0 z-50 border-b border-s-stroke2 bg-b-surface1/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-4 py-3.5 md:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <Image src={tenant.logoUrl ?? "/logoC.png"} alt={displayName} width={44} height={44} className="size-11 shrink-0 rounded-[10px] border border-s-stroke2 bg-b-pop object-contain p-1.5" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="truncate text-body-1 font-bold tracking-tight text-t-primary">{displayName}</span>
              <span className="hidden h-4 w-px bg-s-stroke2 sm:block" />
              <span className="hidden truncate text-caption font-medium text-t-secondary sm:block">{meta?.title ?? "Computer-based test"}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-t-secondary">
              {meta?.exam && <span>{meta.exam}{meta.year ? ` ${meta.year}` : ""}</span>}
              {meta?.shift && <span className="before:mr-3 before:text-t-tertiary before:content-['•']">{meta.shift}</span>}
              <span className="before:mr-3 before:text-t-tertiary before:content-['•']">{questionsLength} questions</span>
              {candidateName && <span className="hidden before:mr-3 before:text-t-tertiary before:content-['•'] md:inline">Candidate: {candidateName}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isTimed ? (
            <div className={`flex min-w-[126px] items-center gap-2.5 rounded-[10px] border px-3.5 py-2 ${timeWarning ? "border-primary-03/35 bg-primary-03/5" : "border-s-stroke2 bg-b-surface2"}`}>
              <span className={`${timeWarning ? "text-primary-03" : "text-primary-01"}`}>
                <RiTimerLine size={18} />
              </span>
              <div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-t-tertiary">Time left</p><span className={`text-body-2 font-bold tabular-nums ${timeWarning ? "text-primary-03" : "text-t-primary"}`}>{timeLeft !== null ? formatTime(timeLeft) : "--:--"}</span></div>
            </div>
          ) : null}

          <button
            id="submit-test-btn"
            className="flex h-11 items-center justify-center rounded-[10px] border border-[#171717] bg-[#1d1d1d] px-6 text-sm font-semibold tracking-[0.0125em] text-white transition-colors hover:bg-[#303030] active:scale-[0.98]"
            onClick={() => setShowSubmitModal(true)}
          >
            <span className="relative z-10">Submit Test</span>
          </button>
        </div>
      </div>
    </header>
  );
}
