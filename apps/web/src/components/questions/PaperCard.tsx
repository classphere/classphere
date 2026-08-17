"use client";

import Link from "next/link";
import { RiQuestionLine, RiTimeLine, RiBarChartBoxLine, RiFileTextLine } from "@remixicon/react";

export interface PaperCardBadge {
  label: string;
  /** Tailwind bg/text classes — callers own their own status→color mapping. */
  className: string;
}

export interface PaperCardProps {
  href: string;
  title: string;
  badges?: PaperCardBadge[];
  subtitle?: string;
  totalQuestions?: number;
  durationMin?: number;
  totalMarks?: number;
  ctaLabel?: string;
  /** Small controls in the top-right corner — archive/restore, edit, delete.
   *  Kept as a free slot rather than named props: the two current callers
   *  (Test Department, Superadmin) need entirely different actions there, and
   *  neither belongs baked into a component that's about card layout, not
   *  workflow. */
  cornerAction?: React.ReactNode;
  /** Left edge, outside the card's own click target — a bulk-select checkbox
   *  in Superadmin's question bank. Test Department has nothing here. */
  leadingAccessory?: React.ReactNode;
}

/**
 * One paper card, shared by every screen that lists test papers to review or
 * manage — Test Department (and Institute Admin, same route), and the
 * Superadmin Global Question Bank.
 *
 * Styled to match the student Tests Hub (TestCard in
 * app/[domain]/student/tests/page.tsx): a bold dark CTA button rather than a
 * muted outline one, a subtitle line under the title, and questions/duration/
 * marks all shown rather than just the first two. Before this, Test
 * Department had its own plainer card and Superadmin didn't use cards at
 * all — it was a table — so a style fix here used to mean redoing two
 * different layouts by hand, and usually only got done to one of them.
 */
export function PaperCard({
  href, title, badges = [], subtitle, totalQuestions, durationMin, totalMarks,
  ctaLabel = "Open", cornerAction, leadingAccessory,
}: PaperCardProps) {
  return (
    <div className="relative flex">
      {leadingAccessory && <div className="absolute left-3 top-3 z-20">{leadingAccessory}</div>}

      <div className="group relative flex w-full flex-col justify-between overflow-hidden rounded-[20px] border border-s-stroke2/40 bg-b-surface2 p-5 transition-all duration-300 hover:border-t-secondary/30">
        <Link href={href} className="absolute inset-0 z-0" aria-label={title} />
        <div className="pointer-events-none absolute inset-0 rounded-[20px] bg-gradient-to-br from-violet-500/[0.03] to-blue-500/[0.03] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {cornerAction && (
          <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5">{cornerAction}</div>
        )}

        {/* Every conditional row below reserves its own height whether or not
            it has content — badges, subtitle, and stats each vary per caller
            (Test Department's 2 badges vs Superadmin's 3, a subtitle that's
            sometimes absent), and a grid of these cards used to render at
            visibly different heights depending which of those a given card
            happened to have. */}
        <div className="relative z-10 pointer-events-none">
          <div className="mb-3 flex min-h-[26px] flex-wrap items-center gap-2 pr-8">
            {badges.map((badge, index) => (
              <span
                key={index}
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${badge.className}`}
              >
                {badge.label}
              </span>
            ))}
          </div>

          <h3 className="mb-1 line-clamp-2 text-[16px] font-bold leading-[1.35] tracking-[-0.01em] text-t-primary">
            {title}
          </h3>
          <p className="min-h-[18px] text-[13px] font-medium text-t-secondary">{subtitle}</p>

          <div className="mt-3 flex min-h-[18px] flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-t-secondary">
            {totalQuestions !== undefined && (
              <span className="flex items-center gap-1.5">
                <RiQuestionLine size={13} className="opacity-70" />
                {totalQuestions} Qs
              </span>
            )}
            {!!durationMin && (
              <span className="flex items-center gap-1.5">
                <RiTimeLine size={13} className="opacity-70" />
                {durationMin} Min
              </span>
            )}
            {!!totalMarks && (
              <span className="flex items-center gap-1.5">
                <RiBarChartBoxLine size={13} className="opacity-70" />
                {totalMarks} Marks
              </span>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-4 border-t border-s-stroke2 pt-4 pointer-events-none">
          <span className="btn btn-primary flex h-10 w-full gap-1.5 px-3 text-[13px] group-hover:scale-[1.01]">
            <RiFileTextLine size={14} />
            {ctaLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
