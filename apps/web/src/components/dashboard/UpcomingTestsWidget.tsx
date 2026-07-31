"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { RiArrowRightLine, RiLoader4Line, RiCalendarEventLine } from "@remixicon/react";
import { apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";

type AssignedTest = {
  id: string;
  title: string;
  test_type?: string;
  total_questions?: number;
  duration_min?: number;
  scheduled_at: string | null;
};

/** Human countdown to a scheduled test — the reason a student opens the app. */
function countdown(scheduledAt: string): { label: string; live: boolean; soon: boolean } {
  const ms = new Date(scheduledAt).getTime() - Date.now();
  if (ms <= 0) return { label: "Available now", live: true, soon: false };
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return { label: `in ${minutes} min`, live: false, soon: true };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { label: `in ${hours} hr${hours === 1 ? "" : "s"}`, live: false, soon: true };
  const days = Math.round(hours / 24);
  return { label: `in ${days} day${days === 1 ? "" : "s"}`, live: false, soon: days <= 2 };
}

export function UpcomingTestsWidget() {
  const { session } = useAuth();
  const [tests, setTests] = useState<AssignedTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    apiClient
      .get<{ success: boolean; data: { tests: AssignedTest[] } }>("/api/v1/tests/assigned", session.access_token)
      .then((response) => {
        if (!response.success) return;
        // Anything already open stays at the top; scheduled ones follow in date
        // order. A test that opened days ago is still actionable, so it is kept
        // rather than filtered out for being in the past.
        const sorted = [...(response.data.tests ?? [])]
          .filter((test) => test.scheduled_at)
          .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
        const now = Date.now();
        const open = sorted.filter((t) => new Date(t.scheduled_at!).getTime() <= now).reverse();
        const future = sorted.filter((t) => new Date(t.scheduled_at!).getTime() > now);
        setTests([...future, ...open]);
      })
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  return (
    <SectionCard
      title="Upcoming Tests"
      subtitle={tests.length ? "Scheduled by your institute" : "Nothing scheduled"}
      headerRight={
        <Link
          href="/student/tests"
          className="inline-flex h-9 items-center gap-1 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-[12px] font-semibold text-t-secondary transition-colors hover:text-t-primary"
        >
          View all <RiArrowRightLine size={14} />
        </Link>
      }
    >
      {loading ? (
        <div className="flex h-24 items-center justify-center text-t-secondary">
          <RiLoader4Line className="animate-spin" size={20} />
        </div>
      ) : tests.length ? (
        <div className="mt-1 space-y-3">
          {tests.slice(0, 3).map((test) => {
            const when = countdown(test.scheduled_at!);
            return (
              <Link
                key={test.id}
                href={when.live ? `/test/${test.id}` : "/student/tests"}
                className="group flex items-center justify-between gap-3 rounded-[12px] border border-s-stroke2/40 bg-b-surface1 p-3.5 transition-colors hover:border-s-highlight"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-t-primary">{test.title}</p>
                  <p className="mt-1 truncate text-[11px] text-t-secondary">
                    {[
                      test.total_questions ? `${test.total_questions} questions` : null,
                      test.duration_min ? `${test.duration_min} min` : null,
                      new Date(test.scheduled_at!).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-[8px] border px-2 py-0.5 text-[10px] font-semibold ${
                    when.live
                      ? "border-s-stroke2/40 bg-[rgba(0,166,86,0.05)] text-primary-02"
                      : when.soon
                        ? "border-s-stroke2/40 bg-[rgba(239,157,14,0.05)] text-primary-05"
                        : "border-s-stroke2 bg-b-surface2 text-t-secondary"
                  }`}
                >
                  {when.label}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-5 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-black/[0.03] text-t-secondary dark:bg-white/[0.03]">
            <RiCalendarEventLine size={18} />
          </div>
          <p className="text-[13px] font-semibold text-t-primary">No tests scheduled.</p>
          <p className="mt-1 text-[12px] text-t-secondary">
            Practice from the Tests Hub while you wait for your institute to assign one.
          </p>
        </div>
      )}
    </SectionCard>
  );
}
