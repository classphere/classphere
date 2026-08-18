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
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image src={tenant.logoUrl ?? "/logoC.png"} alt={displayName} width={40} height={40} className="size-9 shrink-0 rounded-md border border-s-stroke2 bg-b-pop object-contain p-1 sm:size-10" />
            <div className="min-w-0">
              <span className="block truncate text-body-2 font-bold tracking-tight text-t-primary sm:text-body-1">{displayName}</span>
              <span className="hidden truncate text-caption font-medium text-t-secondary sm:block">{meta?.title ?? "Computer-based test"}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isTimed ? (
              <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 sm:gap-2 sm:px-3.5 sm:py-2 ${timeWarning ? "border-primary-03/35 bg-primary-03/5" : "border-s-stroke2 bg-b-surface2"}`}>
                <span className={`${timeWarning ? "text-primary-03" : "text-primary-01"}`}>
                  <RiTimerLine size={16} />
                </span>
                <span className={`text-caption font-bold tabular-nums sm:text-body-2 ${timeWarning ? "text-primary-03" : "text-t-primary"}`}>{timeLeft !== null ? formatTime(timeLeft) : "--:--"}</span>
              </div>
            ) : null}

            <button
              id="submit-test-btn"
              className="flex h-9 shrink-0 items-center justify-center rounded-md px-3.5 text-[13px] font-semibold transition-transform active:scale-[0.98] sm:h-10 sm:px-5 sm:text-sm"
              style={{ backgroundColor: "var(--primary-institute, #161616)", color: "var(--primary-institute-fg, #ffffff)" }}
              onClick={() => setShowSubmitModal(true)}
            >
              Submit Test
            </button>
          </div>
        </div>

        <div className="mt-1.5 hidden flex-wrap items-center gap-x-3 gap-y-1 text-caption text-t-secondary sm:flex">
          {meta?.exam && <span>{meta.exam}{meta.year ? ` ${meta.year}` : ""}</span>}
          {meta?.shift && <span className="before:mr-3 before:text-t-tertiary before:content-['•']">{meta.shift}</span>}
          <span className="before:mr-3 before:text-t-tertiary before:content-['•']">{questionsLength} questions</span>
          {candidateName && <span className="hidden before:mr-3 before:text-t-tertiary before:content-['•'] md:inline">Candidate: {candidateName}</span>}
        </div>
      </div>
    </header>
  );
}
