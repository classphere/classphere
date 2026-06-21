"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { mockHistory } from "@/lib/mock-data";
import {
  RiFlashlightFill,
  RiCheckboxCircleFill
} from "@remixicon/react";

type HistoryItem = {
  id: string;
  title: string;
  date: string;
  score: number;
  percentage: number;
  questions: number;
  mastered?: boolean;
  boosters: HistoryItem[];
};

function TestChainItem({ item, depth = 0 }: { item: HistoryItem; depth?: number }) {
  const pct = item.percentage;
  const isBooster = depth > 0;
  const isMastered = item.mastered;
  const accentClass = isMastered ? "border-primary-02/30" : isBooster ? "border-[#EF9D0E]/25" : "border-s-stroke2";
  const bodyClass = isBooster ? "bg-b-surface2/80" : "bg-b-surface1";

  return (
    <div className="relative">
      {!isBooster && <div className="absolute left-6 top-16 bottom-0 w-px bg-s-stroke2 md:left-7" />}

      <div className={`group relative overflow-hidden rounded-4xl border p-6 transition-all hover:border-transparent ${accentClass} ${bodyClass}`}>
        <div className="box-hover" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {isBooster && (
                <span className="label label-yellow flex items-center gap-0.5">
                  <RiFlashlightFill size={12} /> Booster {depth}
                </span>
              )}
              {isMastered && (
                <span className="label label-green flex items-center gap-0.5">
                  <RiCheckboxCircleFill size={12} /> Mastered
                </span>
              )}
              <span className="text-caption font-semibold text-t-secondary">{item.date}</span>
            </div>

            <h3 className="text-body-2 font-bold text-t-primary">{item.title}</h3>
            <p className="mt-1 text-caption text-t-secondary">{item.questions} questions</p>

            <div className="mt-5 flex flex-wrap gap-2 text-caption text-t-secondary">
              <span className="label label-gray">Review</span>
              <span className="label label-gray">Topic chain</span>
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-4 lg:flex-col lg:items-end lg:text-right">
            <div>
              <div className={`text-h5 font-bold tracking-tight ${
                pct >= 70
                  ? "text-[#00A656]"
                  : pct >= 50
                    ? "text-[#EF9D0E]"
                    : "text-[#FF6A55]"
              }`}>{pct}%</div>
              <div className="text-caption text-t-secondary font-semibold">Score</div>
            </div>
            <Link href={`/results/${item.id}`} className="btn btn-sm btn-outline whitespace-nowrap">
              View Analysis
            </Link>
          </div>
        </div>

        {item.boosters && item.boosters.length > 0 && (
          <div className="relative z-10 mt-6 space-y-4 border-t border-s-stroke2 pt-5">
            <div className="text-caption font-semibold uppercase tracking-wider text-t-tertiary">Boosters</div>
            <div className="space-y-4 pl-4 md:pl-6">
              {item.boosters.map((booster) => (
                <div key={booster.id} className="relative">
                  <div className="absolute -left-4 top-8 h-px w-4 bg-s-stroke2 md:-left-6 md:w-6" />
                  <TestChainItem item={booster} depth={depth + 1} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const historyItems = mockHistory as unknown as HistoryItem[];

  const countMastered = (items: HistoryItem[]): number => {
    let count = 0;
    for (const item of items) {
      if (item.mastered) count++;
      if (item.boosters) count += countMastered(item.boosters);
    }
    return count;
  };

  return (
    <>
      <Navbar title="Test History" />
      
      <main className="mx-auto w-full max-w-screen-lg px-6 pb-10 pt-6 md:px-8">
        
        {/* Summary */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="card p-5">
            <div className="text-caption font-semibold uppercase tracking-wider text-t-tertiary">Attempts</div>
            <div className="mt-2 text-h5 font-semibold tracking-tight text-t-primary">{historyItems.length}</div>
            <div className="mt-1 text-caption text-t-secondary">Test chains in your history</div>
          </div>
          <div className="card p-5">
            <div className="text-caption font-semibold uppercase tracking-wider text-t-tertiary">Boosters</div>
            <div className="mt-2 text-h5 font-semibold tracking-tight text-t-primary">
              {historyItems.reduce((count, item) => count + item.boosters.length, 0)}
            </div>
            <div className="mt-1 text-caption text-t-secondary">Follow-up review loops</div>
          </div>
          <div className="card p-5">
            <div className="text-caption font-semibold uppercase tracking-wider text-t-tertiary">Mastered</div>
            <div className="mt-2 text-h5 font-semibold tracking-tight text-primary-02">
              {countMastered(historyItems)}
            </div>
            <div className="mt-1 text-caption text-t-secondary">Chains marked complete</div>
          </div>
        </div>

        {/* Legend */}
        <div className="card mb-6 flex flex-wrap items-center gap-3 border border-s-stroke2 bg-b-surface1 p-4">
          <span className="text-caption font-bold uppercase tracking-wider text-t-secondary">Legend</span>
          <div className="h-5 w-px bg-s-stroke2" />
          {[
            { label: "Original Test", color: "bg-s-stroke2" },
            { label: "Booster Test", color: "bg-[#EF9D0E]" },
            { label: "Mastered", icon: <RiCheckboxCircleFill size={16} className="text-[#00A656]" /> },
          ].map((l, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-full bg-b-surface2 px-3 py-1.5">
              {l.icon ? l.icon : <div className={`h-3 w-3 rounded-full ${l.color}`} />}
              <span className="text-caption font-semibold text-t-secondary">{l.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          {mockHistory.map((item) => (
            <div key={item.id}>
              <TestChainItem item={item} />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
