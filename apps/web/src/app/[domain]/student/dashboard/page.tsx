"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { PageWrapper } from "@/components/ui";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid } from "@/components/premium-ui";
import { Button } from "@/components/landing/ui/Button";
import {
  RiBarChartBoxLine,
  RiArrowRightUpLine,
  RiRulerLine,
  RiAlertFill,
  RiArrowDownSLine,
  RiLoader4Line
} from "@remixicon/react";

import { ScorePerformanceWidget } from "@/components/dashboard/ScorePerformanceWidget";
import { PendingDPPsWidget } from "@/components/dashboard/PendingDPPsWidget";
import { RecentTestsWidget } from "@/components/dashboard/RecentTestsWidget";
import { AIRiskAlertWidget } from "@/components/dashboard/AIRiskAlertWidget";
import { ActionRequiredWidget } from "@/components/dashboard/ActionRequiredWidget";
import { LeaderboardWidget } from "@/components/dashboard/LeaderboardWidget";
import { apiClient } from "@/lib/api.client";

export default function Dashboard() {
  const { user, session } = useAuth();
  const [isOverviewDropdownOpen, setIsOverviewDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!session?.access_token) return;

    Promise.all([
      apiClient.get("/api/v1/dashboard/student", session.access_token),
      apiClient.get("/api/v1/dashboard/student/history?limit=3", session.access_token)
    ])
      .then(([statsRes, historyRes]) => {
        if (statsRes.success) setStats(statsRes.data);
        if (historyRes.success) setHistory(historyRes.data.attempts || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.access_token]);

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

  const { metrics, chartData, examTarget } = stats || {};
  const isNEET = examTarget === "neet";

  return (
    <>
      <Navbar title={getGreeting()} subtitle="Welcome back! Ready to level up your score?">
        <div className="relative mt-2">
          <Button
            variant="secondary"
            onClick={() => setIsOverviewDropdownOpen(!isOverviewDropdownOpen)}
            className="!px-4 !py-2 text-[12px] h-9"
          >
            <span className="relative">This Week</span>
            <RiArrowDownSLine size={16} className="relative ml-1 text-[#525252] dark:text-t-secondary" />
          </Button>

          {isOverviewDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOverviewDropdownOpen(false)} />
              <ul className="absolute right-0 top-11 z-50 w-[140px] rounded-[16px] border border-black/5 dark:border-white/5 bg-[#FAFAFA] dark:bg-[#161616] p-1.5 shadow-dropdown animate-in fade-in slide-in-from-top-1 duration-150">
                <li>
                  <button
                    onClick={() => setIsOverviewDropdownOpen(false)}
                    className="w-full rounded-[10px] px-3 py-2 text-left text-[13px] font-semibold bg-black/5 dark:bg-white/5 text-t-primary"
                  >
                    This Week
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setIsOverviewDropdownOpen(false)}
                    className="w-full rounded-[10px] px-3 py-2 text-left text-[13px] font-semibold bg-transparent text-[#838383] hover:bg-black/5 dark:hover:bg-white/5 hover:text-t-primary transition-colors"
                  >
                    Last Week
                  </button>
                </li>
              </ul>
            </>
          )}
        </div>
      </Navbar>

      <PageWrapper>
        <MetricGrid cols={4}>
          <MetricCard icon={<RiBarChartBoxLine size={18} />} label="Tests Taken" value={metrics?.totalTests ?? 0} />
          <MetricCard icon={<RiArrowRightUpLine size={18} />} label="Accuracy Rate" value={`${metrics?.accuracyPct ?? 0}%`} />
          <MetricCard icon={<RiRulerLine size={18} />} label="Average Score" value={metrics?.avgScore ?? 0} />
          <MetricCard icon={<RiAlertFill size={18} className="text-primary-05" />} label="Booster Queue" value={metrics?.pendingDPPs ?? 0} badge={metrics?.pendingDPPs > 0 ? "High Risk" : undefined} badgeLabel={metrics?.pendingDPPs > 0 ? "pending" : undefined} />
        </MetricGrid>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-start overflow-x-hidden">
          <div className="grid gap-6 min-w-0 overflow-x-hidden">
            <ScorePerformanceWidget data={chartData || []} isNEET={isNEET} />
            <PendingDPPsWidget />
          </div>
          <div className="grid gap-6 min-w-0 overflow-x-hidden">
            <RecentTestsWidget history={history} />
            <AIRiskAlertWidget />
            <LeaderboardWidget />
            <ActionRequiredWidget />
          </div>
        </div>
      </PageWrapper>
    </>
  );
}
