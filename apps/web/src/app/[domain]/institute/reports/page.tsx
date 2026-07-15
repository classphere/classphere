"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiBarChartBoxLine,
  RiLineChartLine,
  RiPieChart2Line,
  RiArrowDownSLine,
  RiDownload2Line,
  RiTeamLine,
  RiGroupLine,
  RiStarFill,
  RiGraduationCapLine,
  RiRulerLine,
  RiTestTubeLine,
  RiArrowRightLine
} from "@remixicon/react";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid } from "@/components/premium-ui";
import { useBatches } from "@/lib/hooks/useBatches";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { PerformanceChart } from "@/components/institute/PerformanceChart";
import { SubjectMasteryRadar } from "@/components/institute/SubjectMasteryRadar";
import { RecentTestReports } from "@/components/institute/RecentTestReports";
import { CohortBatchComparison } from "@/components/institute/CohortBatchComparison";
import { TopPerformingStudents } from "@/components/institute/TopPerformingStudents";

export default function ReportsPage() {
  const { session } = useAuth();
  const { batches, loading: batchesLoading } = useBatches();
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState("Last 30 Days");
  const [activeTab, setActiveTab] = useState<"Overview" | "Batch Performance" | "Student Performance">("Overview");

  const [realStats, setRealStats] = useState<{
    avgScore: string;
    testsCount: number;
    activeStudents: number;
    trendData: any[];
    masteryData: any[];
    topStudents: any[];
    batchLeaderboard: any[];
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!session?.access_token) return;
    setStatsLoading(true);
    try {
      // Fetch teacher dashboard data reused for institute-level aggregate
      const res = await apiClient.get("/api/v1/dashboard/teacher", session.access_token);
      let avgScore = "—";
      let totalStudents = 0;
      if (res.success) {
        const m = res.data.metrics;
        avgScore = m.avgBatchScore ? `${m.avgBatchScore}%` : "—";
        totalStudents = m.totalStudents ?? 0;
      }
      
      // Fetch institute reports data
      const idRes = await apiClient.get("/api/v1/institutes/me", session.access_token);
      let trendData: any[] = [];
      let masteryData: any[] = [];
      let topStudents: any[] = [];
      let batchLeaderboard: any[] = [];
      
      if (idRes.success && idRes.data?.institute?.id) {
        const instId = idRes.data.institute.id;
        const repRes = await apiClient.get(`/api/v1/institutes/${instId}/reports`, session.access_token);
        if (repRes.success) {
          trendData = repRes.data.trendData || [];
          masteryData = repRes.data.masteryData || [];
          topStudents = repRes.data.topStudents || [];
          batchLeaderboard = repRes.data.batchLeaderboard || [];
        }
      }

      setRealStats({
        avgScore,
        testsCount: 0, // future: from attempts aggregate
        activeStudents: totalStudents,
        trendData,
        masteryData,
        topStudents,
        batchLeaderboard,
      });

    } catch (e) {
      console.error("[Reports] stats error", e);
    } finally {
      setStatsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    setMounted(true);
    fetchStats();
  }, [fetchStats]);

  return (
    <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">

      {/* ── Top Navigation Row (Figma Style) ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center w-full gap-4 lg:gap-6 mb-2">
        {/* Title */}
        <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary dark:text-t-primary">
          Reports & Analytics
        </h1>

        {/* Navigation Items (Right Side) */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Search Box */}
          <div className="flex flex-row items-center bg-b-surface2 border border-s-stroke2 rounded-[10px] px-3 py-2 w-full sm:w-[315px] h-12 gap-2 shadow-xs shrink-0 lg:shrink">
            <RiSearchLine size={20} className="text-t-secondary dark:text-t-tertiary" />
            <input
              type="text"
              placeholder="Search"
              className="bg-transparent border-none outline-none text-sm text-t-primary dark:text-t-primary placeholder-t-secondary w-full"
            />
          </div>

          {/* Export PDF Button (Gradient) */}
          <button className="btn btn-primary w-full sm:w-[100px] h-12 rounded-[10px] cursor-pointer whitespace-nowrap shrink-0">
            Export
          </button>

          {/* Bell Button */}
          <button className="btn btn-outline w-12 h-12 !px-0 rounded-[10px] flex items-center justify-center relative shrink-0">
            <RiNotification3Line size={20} />
            <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-primary-03" />
          </button>

          {/* Mail Button */}
          <button className="btn btn-outline w-12 h-12 !px-0 rounded-[10px] flex items-center justify-center shrink-0">
            <RiMailLine size={20} />
          </button>

          {/* Avatar Profile */}
          <div className="flex items-center justify-center size-12 rounded-full border border-s-stroke2 bg-b-surface2 shrink-0 cursor-pointer shadow-xs">
            <div className="size-9 rounded-full bg-b-depth text-t-primary flex items-center justify-center text-xs font-bold">
              AA
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mt-6 gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-sans font-semibold text-[20px] leading-[145%] text-t-primary dark:text-t-primary">Performance Analytics</h2>
          <p className="text-xs text-t-secondary dark:text-t-tertiary">Track general average test outcomes, monthly progress trends, and syllabus area coverage.</p>
        </div>

        {/* Filter Controls (Tabs) */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full lg:w-auto min-w-0 overflow-hidden">
          {/* Tab buttons */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none whitespace-nowrap pb-1 sm:pb-0 w-full sm:w-auto">
            {["Overview", "Batch Performance", "Student Performance"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`btn h-10 px-5 rounded-[10px] text-xs font-semibold font-sans transition-all active:scale-95 shadow-xs cursor-pointer ${activeTab === tab
                    ? "btn-primary"
                    : "btn-outline"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <span className="text-s-stroke2 dark:text-s-stroke2/30 mx-2 hidden sm:inline">|</span>

          {/* Time Selector Dropdown */}
          <div className="relative shrink-0">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none pl-4.5 pr-10 h-10 w-full sm:w-auto border border-s-stroke2 rounded-[10px] bg-b-surface2 text-xs font-sans font-semibold text-t-secondary hover:border-s-highlight transition-all outline-none cursor-pointer"
            >
              <option>Last 30 Days</option>
              <option>Last 3 Months</option>
              <option>This Year</option>
            </select>
            <RiArrowDownSLine size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Active Tab content: Overview ── */}
      {activeTab === "Overview" && (
        <>
          {/* KPI Cards Row */}
          <MetricGrid cols={3} className="relative z-10 mt-4">
            {[
              { label: "Average Test Score", value: statsLoading ? "..." : (realStats?.avgScore ?? "—"), desc: "+1.8%", descSuffix: "vs last month", icon: <RiBarChartBoxLine size={20} />, iconColor: "text-primary-01" },
              { label: "Tests Conducted", value: statsLoading ? "..." : (realStats?.testsCount ?? "—"), desc: "12 tests", descSuffix: "scheduled this week", icon: <RiLineChartLine size={20} />, iconColor: "text-primary-02" },
              { label: "Active Students", value: statsLoading ? "..." : (realStats?.activeStudents ?? "—"), desc: "+34", descSuffix: "new enrollments", icon: <RiPieChart2Line size={20} />, iconColor: "text-primary-05" },
            ].map((card, idx) => (
              <MetricCard
                key={idx}
                label={card.label}
                value={card.value}
                badge={card.desc}
                badgeLabel={card.descSuffix}
                icon={<div className={card.iconColor}>{card.icon}</div>}
              />
            ))}
          </MetricGrid>

          {/* Visual Chart Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full mt-4 items-stretch">
            {/* Batch Performance Area Chart Card (ColSpan 2) */}
            <PerformanceChart
              title="Batch Performance Trend"
              subtitle="Subject performance index over consecutive cycles"
              data={realStats?.trendData || []}
              mounted={mounted}
            />

            {/* Subject Mastery Radar Chart Card (ColSpan 1) */}
            <SubjectMasteryRadar
              title="Subject Mastery"
              subtitle="Overall core module accuracy index"
              data={realStats?.masteryData || []}
              mounted={mounted}
            />
          </div>

          {/* Recent Test Reports List */}
          <RecentTestReports reports={[
            { id: "T-101", title: "JEE Full Mock Test 12", exam: "JEE", batch: "JEE 2026 Morning", accuracy: 78, high: 96, date: "2026-06-22" },
            { id: "T-102", title: "NEET Physics Unit 4", exam: "NEET", batch: "NEET 2026 Droppers", accuracy: 82, high: 98, date: "2026-06-20" },
            { id: "T-103", title: "JEE Maths Chapterwise 2", exam: "JEE", batch: "Class 11 - JEE Advanced", accuracy: 68, high: 88, date: "2026-06-18" },
            { id: "T-104", title: "Chemistry Periodic Table", exam: "NEET", batch: "Class 12 - NEET", accuracy: 89, high: 100, date: "2026-06-15" },
          ]} />

        </>
      )}

      {/* ── Active Tab content: Batch Performance ── */}
      {activeTab === "Batch Performance" && (
        <>
          {/* Full-width Trend Chart */}
          <PerformanceChart
            title="Cross-Batch Accuracy Over Time"
            subtitle="Longitudinal performance trend for the active coaching batches"
            data={realStats?.trendData || []}
            mounted={mounted}
          />

          {/* Batch Metrics Rows */}
          <CohortBatchComparison batchLeaderboard={realStats?.batchLeaderboard || []} />
        </>
      )}

      {/* ── Active Tab content: Student Performance ── */}
      {activeTab === "Student Performance" && (
        <>
          {/* Radar Chart */}
          <SubjectMasteryRadar
            title="Student Weakness & Strength Index"
            subtitle="Comparative review of syllabus mastery averages"
            data={realStats?.masteryData || []}
            mounted={mounted}
          />

          {/* Student list rows */}
          <TopPerformingStudents topStudents={realStats?.topStudents || []} />
        </>
      )}

    </main>
  );
}
