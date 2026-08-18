"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { PageWrapper } from "@/components/ui";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid } from "@/components/premium-ui";
import {
  RiBarChartBoxLine,
  RiArrowRightUpLine,
  RiRulerLine,
  RiAlertFill,
  RiLoader4Line
} from "@remixicon/react";

// Recharts is a heavy client-only dependency — keep it out of this route's
// initial bundle and only fetch it once the dashboard actually renders.
const ScorePerformanceWidget = dynamic(
  () => import("@/components/dashboard/ScorePerformanceWidget").then((m) => m.ScorePerformanceWidget),
  { ssr: false, loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-b-surface2" /> }
);
import { PendingDPPsWidget } from "@/components/dashboard/PendingDPPsWidget";
import { UpcomingTestsWidget } from "@/components/dashboard/UpcomingTestsWidget";
import { ActionRequiredWidget } from "@/components/dashboard/ActionRequiredWidget";
import { LeaderboardWidget } from "@/components/dashboard/LeaderboardWidget";
import { StudentBatchWidget } from "@/components/dashboard/StudentBatchWidget";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { scheduleDppReminder } from "@/lib/notifications/local-reminders";

export default function Dashboard() {
  const { user } = useAuth();

  // Cached: revisiting the dashboard paints instantly from memory and
  // revalidates in the background, instead of showing a spinner every time.
  const statsQuery = useApiQuery<any>("/api/v1/dashboard/student");
  const historyQuery = useApiQuery<any>("/api/v1/dashboard/student/history?limit=3");
  const dppsQuery = useApiQuery<any>("/api/v1/dpps/student");

  const stats = statsQuery.data ?? null;
  const history = historyQuery.data?.history ?? [];
  const dpps = dppsQuery.data?.dpps ?? [];
  // Only block on the first load. A background revalidation must not throw the
  // student back to a spinner on a page they can already read.
  const loading = statsQuery.isPending || historyQuery.isPending || dppsQuery.isPending;

  const pendingDPPs = stats?.metrics?.pendingDPPs;
  useEffect(() => {
    if (pendingDPPs === undefined) return;
    // Best-effort — no-ops on web / when permission isn't granted.
    void scheduleDppReminder(pendingDPPs ?? 0);
  }, [pendingDPPs]);

  const getGreeting = () => {
    const hours = new Date().getHours();
    const firstName = (user?.name ?? "there").split(" ")[0];
    if (hours < 12) return `Good morning, ${firstName}`;
    if (hours < 17) return `Good afternoon, ${firstName}`;
    return `Good evening, ${firstName}`;
  };

  if (loading) {
    return (
      <>
        <Navbar title={getGreeting()} subtitle="Loading your dashboard..." />
        <PageWrapper>
          <div className="flex justify-center items-center h-64">
            <RiLoader4Line className="animate-spin text-t-secondary" size={32} />
          </div>
        </PageWrapper>
      </>
    );
  }

  const { metrics, chartData, examTarget, batch } = stats || {};
  // The most recent submitted attempt's exam_code is the most reliable
  // signal — it is recorded when the paper is taken. Next is the student's
  // current batch: institute-assigned and always in sync with what they're
  // actually preparing for, unlike examTarget, which is a free-text field
  // that defaulted to "JEE" at registration and is only ever updated when a
  // batch-enrollment endpoint remembers to sync it. A student with no
  // submitted attempts yet and a stale examTarget — exactly the case for
  // anyone enrolled before that sync existed — would otherwise see the
  // wrong exam's totals and subjects until they sat their first real test.
  const examCode = history[0]?.exam_code ?? batch?.exam ?? examTarget;

  return (
    <>
      <Navbar title={getGreeting()} subtitle="Welcome back! Ready to level up your score?" />

      <PageWrapper>
        <MetricGrid cols={4}>
          <MetricCard icon={<RiBarChartBoxLine size={18} />} label="Tests Taken" value={metrics?.totalTests ?? 0} />
          <MetricCard icon={<RiArrowRightUpLine size={18} />} label="Accuracy Rate" value={`${metrics?.accuracyPct ?? 0}%`} />
          <MetricCard icon={<RiRulerLine size={18} />} label="Average Score" value={metrics?.avgScore ?? 0} />
          <MetricCard icon={<RiAlertFill size={18} className="text-primary-05" />} label="Pending DPPs" value={metrics?.pendingDPPs ?? 0} badge={metrics?.pendingDPPs > 0 ? "Action needed" : undefined} badgeLabel={metrics?.pendingDPPs > 0 ? "assigned" : undefined} />
        </MetricGrid>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_420px] items-start overflow-x-hidden">
          <div className="grid gap-3 min-w-0 overflow-x-hidden">
            <UpcomingTestsWidget />
            <ScorePerformanceWidget data={chartData || []} examCode={examCode} latestAttempt={history[0]} />
            <PendingDPPsWidget dpps={dpps} />
          </div>
          <div className="grid gap-3 min-w-0 overflow-x-hidden">
            <StudentBatchWidget batch={batch} />
            <LeaderboardWidget />
            <ActionRequiredWidget />
          </div>
        </div>
      </PageWrapper>
    </>
  );
}
