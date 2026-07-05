"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

import {
  RiFlashlightFill,
  RiCheckboxCircleFill,
  RiPlayLine,
  RiGitMergeLine,
  RiLineChartLine,
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
  
  // Custom nesting styles: main is white, nested booster is light grey
  const bodyClass = isBooster 
    ? "bg-b-surface1 dark:bg-b-surface1/60 border-s-stroke2/30" 
    : "bg-b-surface2 dark:bg-b-surface2 border-s-stroke2/40";

  return (
    <div className="relative">
      {/* Visual connecting line for booster chains */}
      {!isBooster && <div className="absolute left-6 top-16 bottom-0 w-px bg-s-stroke2/40 md:left-7" />}

      <div 
        className={`group relative overflow-hidden rounded-lg border p-6 transition-all hover:-translate-y-0.5 hover:shadow-[0px_10px_20px_-8px_rgba(0,0,0,0.06)] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] ${bodyClass} select-none`}
      >
        <div className="box-hover" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {isBooster && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 border border-s-stroke2/20 bg-transparent text-t-secondary rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  <RiFlashlightFill size={10} /> Booster {depth}
                </span>
              )}
              {isMastered && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 border border-s-stroke2/20 bg-transparent text-t-secondary rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  <RiCheckboxCircleFill size={10} /> Mastered
                </span>
              )}
              <span className="text-[12px] font-sans font-semibold text-t-secondary">{item.date}</span>
            </div>

            <h3 className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
              {item.title}
            </h3>
            <p className="text-[12px] font-sans text-t-secondary mt-0.5">{item.questions} questions</p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="text-[10px] font-sans font-semibold px-2 py-0.5 border border-s-stroke2/20 bg-b-surface1 dark:bg-b-surface1/60 text-t-secondary rounded-lg uppercase tracking-wider">
                Review
              </span>
              <span className="text-[10px] font-sans font-semibold px-2 py-0.5 border border-s-stroke2/20 bg-b-surface1 dark:bg-b-surface1/60 text-t-secondary rounded-lg uppercase tracking-wider">
                Topic chain
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-4 lg:flex-col lg:items-end lg:text-right">
            <div>
              <div className="font-sans text-[24px] font-semibold text-t-primary dark:text-t-primary tracking-[-0.01em] leading-none">
                {pct}%
              </div>
              <div className="text-[10px] font-sans font-semibold text-t-secondary uppercase tracking-wider mt-1">Score</div>
            </div>
            <Link 
              href={`/results/${item.id}`} 
              className="flex flex-row justify-center items-center h-8 px-3.5 border border-s-stroke2 dark:border-s-stroke2 rounded-lg bg-transparent text-t-secondary hover:text-t-primary dark:hover:text-t-primary text-[12px] font-sans font-semibold transition-all active:scale-95 cursor-pointer"
            >
              View Analysis
            </Link>
          </div>
        </div>

        {item.boosters && item.boosters.length > 0 && (
          <div className="relative z-10 mt-6 space-y-4 border-t border-s-stroke2/30 pt-5">
            <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-t-secondary">
              Boosters
            </div>
            <div className="space-y-4 pl-4 md:pl-6">
              {item.boosters.map((booster) => (
                <div key={booster.id} className="relative">
                  {/* Visual branch connecting line */}
                  <div className="absolute -left-4 top-8 h-px w-4 bg-s-stroke2/30 md:-left-6 md:w-6" />
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
  const historyItems: HistoryItem[] = [];

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
      <Navbar title="Test History" subtitle="Your completed test sessions, progress, and review loops." breadcrumbs="Dashboard > Test History" />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-6 md:px-6 overflow-x-hidden">
        
        {/* Stats Row Wrapper */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 p-2 gap-4 w-full bg-b-surface1 dark:bg-b-surface1/60 border border-s-stroke2/40 dark:border-s-stroke2/40 rounded-lg mb-8 select-none">
          
          {/* Metric 1: Attempts */}
          <div className="flex flex-col items-start p-6 gap-2 bg-b-surface2 dark:bg-b-surface2 border border-s-border dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-t-primary dark:text-t-primary"><RiPlayLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Attempts
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-4xl font-medium tracking-[-0.005em] text-t-primary dark:text-t-primary leading-none">
                {historyItems.length}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-t-secondary text-[12px] font-semibold leading-none">Total</span>
                </div>
                <span className="text-[12px] font-sans text-t-secondary">
                  test chains
                </span>
              </div>
            </div>
          </div>

          {/* Metric 2: Boosters */}
          <div className="flex flex-col items-start p-6 gap-2 bg-b-surface2 dark:bg-b-surface2 border border-s-border dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-t-primary dark:text-t-primary"><RiGitMergeLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Boosters
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-4xl font-medium tracking-[-0.005em] text-t-primary dark:text-t-primary leading-none">
                {historyItems.reduce((count, item) => count + item.boosters.length, 0)}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-t-secondary text-[12px] font-semibold leading-none">Follow-up</span>
                </div>
                <span className="text-[12px] font-sans text-t-secondary">
                  review loops
                </span>
              </div>
            </div>
          </div>

          {/* Metric 3: Mastered */}
          <div className="flex flex-col items-start p-6 gap-2 bg-b-surface2 dark:bg-b-surface2 border border-s-border dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-t-primary dark:text-t-primary"><RiLineChartLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Mastered
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-4xl font-medium tracking-[-0.005em] text-t-primary dark:text-t-primary leading-none">
                {countMastered(historyItems)}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-t-secondary text-[12px] font-semibold leading-none">Complete</span>
                </div>
                <span className="text-[12px] font-sans text-t-secondary">
                  chains finalized
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Legend bar */}
        <div className="flex flex-wrap items-center gap-3 border border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 p-4 rounded-lg shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] select-none mb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-t-secondary pl-1">
            Legend
          </span>
          <div className="h-5 w-px bg-s-stroke2/30" />
          {[
            { label: "Original Test", color: "bg-s-stroke2/50" },
            { label: "Booster Test", color: "bg-primary-05/20 border border-primary-05/30" },
            { label: "Mastered", icon: <RiCheckboxCircleFill size={16} className="text-t-secondary" /> },
          ].map((l, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg border border-s-stroke2/20 px-3.5 py-1 text-xs font-sans font-semibold text-t-secondary">
              {l.icon ? l.icon : <div className={`h-2.5 w-2.5 rounded-full ${l.color}`} />}
              <span>{l.label}</span>
            </div>
          ))}
        </div>

        {/* List of Test Chains */}
        <div className="flex flex-col gap-6">
          {historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-[14px] font-sans text-t-secondary">No history available yet.</p>
            </div>
          ) : (
            historyItems.map((item) => (
              <div key={item.id}>
                <TestChainItem item={item} />
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
