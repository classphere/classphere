"use client";

import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { useRouter } from "next/navigation";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { RiArrowRightLine, RiLoader4Line, RiRepeat2Line } from "@remixicon/react";

type DueTopic = {
  reviewId: string;
  subject: string;
  chapter: string;
  topic: string;
  lastAccuracy: number | null;
  overdueDays: number;
  lapses: number;
};

/**
 * Today's spaced revision.
 *
 * Reads the spaced-repetition schedule (student_topic_reviews) rather than the
 * legacy student_revision_tasks queue, which nothing ever wrote to — this card
 * was permanently empty as a result.
 */
export function ActionRequiredWidget() {
  const router = useRouter();
  const { data, isPending: loading } = useApiQuery<{ topics: DueTopic[]; nextDueAt?: string | null }>(
    "/api/v1/revision/daily",
  );
  const topics = data?.topics ?? [];
  const nextDueAt = data?.nextDueAt ?? null;

  const daysUntilNext = nextDueAt
    ? Math.max(0, Math.ceil((new Date(nextDueAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <SectionCard
      title="Today's Revision"
      subtitle="Topics returning before you forget them"
      headerRight={
        topics.length > 0 ? (
          <span className="inline-flex h-[26px] items-center rounded-[8px] bg-primary-01/10 px-3 text-[11px] font-semibold uppercase tracking-wider text-primary-01">
            {topics.length} due
          </span>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex h-24 items-center justify-center text-t-secondary">
          <RiLoader4Line className="animate-spin" size={20} />
        </div>
      ) : topics.length ? (
        <div className="mt-1 space-y-3">
          {topics.slice(0, 3).map((topic) => (
            <button
              key={topic.reviewId}
              onClick={() => router.push("/student/revision/daily")}
              className="group flex w-full items-center justify-between gap-3 rounded-[12px] border border-s-stroke2/40 bg-b-surface1 p-3 text-left transition-colors hover:border-s-highlight"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-t-primary">
                  {topic.topic || topic.chapter}
                </p>
                <p className="mt-1 truncate text-[11px] text-t-secondary">
                  {[topic.subject, topic.chapter].filter(Boolean).join(" · ")}
                  {topic.lastAccuracy !== null && ` · last ${topic.lastAccuracy}%`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {topic.overdueDays > 0 && (
                  <span className="rounded-[8px] border border-s-stroke2/40 bg-[rgba(239,157,14,0.05)] px-2 py-0.5 text-[10px] font-semibold text-primary-05">
                    {topic.overdueDays}d late
                  </span>
                )}
                <RiArrowRightLine size={15} className="text-t-secondary transition-colors group-hover:text-t-primary" />
              </div>
            </button>
          ))}
          <button
            onClick={() => router.push("/student/revision/daily")}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-s-stroke2 text-[12px] font-semibold text-t-secondary transition-colors hover:text-t-primary"
          >
            <RiRepeat2Line size={15} /> Start revision
          </button>
        </div>
      ) : (
        <div className="py-5 text-center">
          <p className="text-[13px] font-semibold text-t-primary">
            {daysUntilNext === null ? "No revision scheduled yet." : "You're all caught up."}
          </p>
          <p className="mt-1 text-[12px] text-t-secondary">
            {daysUntilNext === null
              ? "Take a test and topics will start scheduling themselves."
              : daysUntilNext === 0
                ? "Your next topic is due later today."
                : `Next topic returns in ${daysUntilNext} day${daysUntilNext === 1 ? "" : "s"}.`}
          </p>
        </div>
      )}
    </SectionCard>
  );
}
