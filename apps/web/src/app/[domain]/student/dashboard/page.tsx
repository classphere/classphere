"use client";

import { useState, useEffect } from "react";
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
import { apiClient } from "@/lib/api.client";
import { scheduleDppReminder } from "@/lib/notifications/local-reminders";

export default function Dashboard() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [dpps, setDpps] = useState<any[]>([]);
  const [notificationVersion, setNotificationVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setNotificationVersion((version) => version + 1);
    window.addEventListener("classphere:notification", refresh);
    return () => window.removeEventListener("classphere:notification", refresh);
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;

    Promise.all([
      apiClient.get("/api/v1/dashboard/student", session.access_token),
      apiClient.get("/api/v1/dashboard/student/history?limit=3", session.access_token),
      apiClient.get("/api/v1/dpps/student", session.access_token),
    ])
      .then(([statsRes, historyRes, dppsRes]) => {
        if (statsRes.success) {
          setStats(statsRes.data);
          // Best-effort — no-ops on web / when permission isn't granted.
          void scheduleDppReminder(statsRes.data?.metrics?.pendingDPPs ?? 0);
        }
        if (historyRes.success) setHistory(historyRes.data.history || []);
        if (dppsRes.success) setDpps(dppsRes.data.dpps || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.access_token, notificationVersion]);

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
  const isNEET = examTarget === "neet";

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
            <ScorePerformanceWidget data={chartData || []} isNEET={isNEET} latestAttempt={history[0]} />
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
