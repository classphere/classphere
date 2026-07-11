"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import {
  SectionCard,
  MetricCard,
  MetricGrid,
  EmptyState,
  PageWrapper,
  SecondaryButton,
  Card,
} from "@/components/ui";

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
  
  // VADL: Main cards get surface2, nested ones get surface1 to show depth
  const variant = isBooster ? "light" : "default";

  return (
    <div className="relative">
      {/* Visual connecting line for booster chains */}
      {!isBooster && <div className="absolute left-6 top-16 bottom-0 w-px bg-[#ebebeb] dark:bg-[#282828] md:left-7" />}

      <Card 
        variant={variant}
        padding="default"
        className={`group relative overflow-hidden hover:-translate-y-1 hover:shadow-depth transition-all duration-300 select-none`}
      >

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {isBooster && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/60 text-t-secondary rounded-[6px] text-[10px] font-bold uppercase tracking-wider">
                  <RiFlashlightFill size={10} /> Booster {depth}
                </span>
              )}
              {isMastered && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/60 text-t-secondary rounded-[6px] text-[10px] font-bold uppercase tracking-wider">
                  <RiCheckboxCircleFill size={10} /> Mastered
                </span>
              )}
              <span className="text-[12px] font-sans font-semibold text-t-secondary tracking-wide">{item.date}</span>
            </div>

            <h3 className="font-sans font-semibold text-[17px] leading-snug tracking-[-0.02em] text-t-primary">
              {item.title}
            </h3>
            <p className="text-[13px] font-sans text-t-secondary mt-0.5">{item.questions} questions</p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="text-[10px] font-sans font-bold px-2 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/40 text-t-secondary rounded-[6px] uppercase tracking-wider">
                Review
              </span>
              <span className="text-[10px] font-sans font-bold px-2 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/40 text-t-secondary rounded-[6px] uppercase tracking-wider">
                Topic chain
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-4 lg:flex-col lg:items-end lg:text-right">
            <div>
              <div className="font-sans text-[24px] font-semibold tracking-[-0.01em] text-t-primary leading-none">
                {pct}%
              </div>
              <div className="text-[11px] font-sans font-bold text-t-secondary uppercase tracking-widest mt-1">Score</div>
            </div>
            <Link href={`/results/${item.id}`} className="block">
              <SecondaryButton>View Analysis</SecondaryButton>
            </Link>
          </div>
        </div>

        {item.boosters && item.boosters.length > 0 && (
          <div className="relative z-10 mt-6 space-y-4 border-t border-[#ebebeb] dark:border-[#282828] pt-5">
            <div className="text-[11px] font-sans font-bold uppercase tracking-widest text-t-secondary">
              Boosters
            </div>
            <div className="space-y-4 pl-4 md:pl-6">
              {item.boosters.map((booster) => (
                <div key={booster.id} className="relative">
                  {/* Visual branch connecting line */}
                  <div className="absolute -left-4 top-8 h-px w-4 bg-[#ebebeb] dark:bg-[#282828] md:-left-6 md:w-6" />
                  <TestChainItem item={booster} depth={depth + 1} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
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
      
      <PageWrapper>
        {/* Stats Row Wrapper */}
        <MetricGrid cols={3}>
          <MetricCard
            icon={<RiPlayLine size={18} />}
            label="Attempts"
            value={historyItems.length}
            badge="Total"
            badgeLabel="test chains"
          />
          <MetricCard
            icon={<RiGitMergeLine size={18} />}
            label="Boosters"
            value={historyItems.reduce((count, item) => count + item.boosters.length, 0)}
            badge="Follow-up"
            badgeLabel="review loops"
          />
          <MetricCard
            icon={<RiLineChartLine size={18} />}
            label="Mastered"
            value={countMastered(historyItems)}
            badge="Complete"
            badgeLabel="chains finalized"
          />
        </MetricGrid>

        {/* Legend bar */}
        <Card variant="default" padding="default" className="flex flex-wrap items-center gap-3 mb-6 !p-4">
          <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-t-secondary pl-1">
            Legend
          </span>
          <div className="h-5 w-px bg-[#ebebeb] dark:bg-[#282828]" />
          {[
            { label: "Original Test", color: "bg-t-secondary/20" },
            { label: "Booster Test", color: "bg-primary-05/20 border border-primary-05/30" },
            { label: "Mastered", icon: <RiCheckboxCircleFill size={16} className="text-t-secondary" /> },
          ].map((l, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-[8px] border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/40 px-3.5 py-1 text-[12px] font-sans font-semibold text-t-secondary">
              {l.icon ? l.icon : <div className={`h-2.5 w-2.5 rounded-full ${l.color}`} />}
              <span>{l.label}</span>
            </div>
          ))}
        </Card>

        {/* List of Test Chains */}
        <div className="flex flex-col gap-6">
          {historyItems.length === 0 ? (
            <SectionCard padding="none">
              <EmptyState
                icon={<RiLineChartLine size={48} />}
                title="No history available yet."
                description="Once you complete a test, it will appear here along with your performance analysis and booster loops."
              />
            </SectionCard>
          ) : (
            historyItems.map((item) => (
              <div key={item.id}>
                <TestChainItem item={item} />
              </div>
            ))
          )}
        </div>
      </PageWrapper>
    </>
  );
}
