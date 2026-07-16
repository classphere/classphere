"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import {
  RiTeamLine,
  RiFileChartLine,
  RiCalendarEventLine,
  RiArrowRightUpLine,
  RiSettings4Line,
  RiFileListLine,
  RiArrowDownSLine
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

export default function TeacherDashboardPage() {
  const { user, session } = useAuth();
  const [isOverviewDropdownOpen, setIsOverviewDropdownOpen] = useState(false);

  // ── Real dashboard data ──────────────────────────────────────────────────
  const [metrics, setMetrics] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [recentDPPs, setRecentDPPs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/api/v1/dashboard/teacher", session.access_token);
        if (res.success) {
          setMetrics(res.data.metrics);
          setBatches(res.data.batches ?? []);
          setRecentDPPs(res.data.recentDPPs ?? []);
        }
      } catch (e) { console.error("[TeacherDashboard]", e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [session?.access_token]);

  const pendingDPPs = recentDPPs.filter((d) => d.pendingCount > 0);
  const completedDPPs = recentDPPs.filter((d) => d.pendingCount === 0 && d.submittedCount > 0);

  const flags: any[] = []; // AI flags — future feature

  // Time-based greeting title
  const getGreeting = () => {
    const hours = new Date().getHours();
    const nameParts = (user?.name || "Teacher").split(" ");
    const displayName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` : (user?.name || "Teacher");
    
    if (hours < 12) {
      return `Good morning, ${displayName}`;
    } else if (hours < 17) {
      return `Good afternoon, ${displayName}`;
    } else {
      return `Good evening, ${displayName}`;
    }
  };

  const greetingTitle = getGreeting();

  return (
    <>
      <Navbar 
        title={greetingTitle} 
        subtitle={`Here's the latest from your assigned batches.`} 
        breadcrumbs="Dashboard" 
      />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-4 md:px-8 overflow-x-hidden">
        
        {/* Stats Section Wrapper */}
        <MetricGrid cols={3}>
          <MetricCard
            icon={<RiTeamLine size={20} />}
            label="Total Students"
            value={loading ? "—" : String(metrics?.totalStudents ?? 0)}
            badgeLabel={`across ${metrics?.batchCount ?? 0} batches`}
          />
          <MetricCard
            icon={<RiFileChartLine size={20} />}
            label="Avg Batch Score"
            value={loading ? "—" : `${metrics?.avgBatchScore ?? 0}%`}
            badge={metrics?.avgBatchScore ? (metrics.avgBatchScore >= 60 ? "Good" : "Needs Work") : "—"}
            badgeLabel="batch average"
          />
          <MetricCard
            icon={<RiCalendarEventLine size={20} />}
            label="Active DPPs"
            value={loading ? "—" : String(pendingDPPs.length)}
            badgeLabel={`${completedDPPs.length} completed`}
          />
        </MetricGrid>

        {/* Main Content Grid — Batches (left) + AI Flags (right) */}
        <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">

          {/* Batches Card */}
          <SectionCard
            title="Your Active Batches"
            className="h-full"
            headerRight={
              <Link
                href="/teacher/analytics"
                className="flex items-center justify-center h-9 px-4 rounded-[10px] text-xs font-semibold border-[1.5px] border-s-stroke2 dark:border-s-stroke2/50 text-t-secondary hover:text-t-primary hover:border-t-secondary transition-all active:scale-95 cursor-pointer"
              >
                View All
              </Link>
            }
          >

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1 w-full">
              {batches.length === 0 ? (
                <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center p-8 w-full text-center">
                  <p className="text-[14px] font-sans text-t-secondary">No batches assigned yet.</p>
                </div>
              ) : (
                batches.map((batch, i) => {
                  const iconMeta = [
                    { iconContainerClass: "bg-primary-01/10 border border-primary-01/20 text-primary-01" },
                    { iconContainerClass: "bg-primary-02/10 border border-primary-02/20 text-primary-02" },
                    { iconContainerClass: "bg-primary-05/10 border border-primary-05/20 text-primary-05" },
                  ][i % 3];
  
                  return (
                    <div
                      key={batch.id}
                      className="group/card relative flex min-h-[10.5rem] flex-col justify-between p-[22px] bg-white dark:bg-white/[0.02] rounded-[24px] overflow-hidden transition-all hover:scale-[1.005]"
                    >
                      
                      <div className="min-w-0 flex-1 relative z-10">
                        {/* Header Status Badge Row */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[12px] font-sans font-semibold text-t-secondary uppercase tracking-wider">
                            {batch.exam}
                          </span>
                          <div className={`size-8 rounded-[10px] flex items-center justify-center shrink-0 ${iconMeta.iconContainerClass}`}>
                            <RiTeamLine size={16} />
                          </div>
                        </div>
                        
                        <div className="truncate font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                          {batch.name}
                        </div>
                        <div className="text-[12px] font-sans text-t-secondary mt-1">
                          {batch.studentCount ?? 0} students · 3 active DPPs
                        </div>
  
                        {/* Progress Bar representing Avg Score */}
                        <div className="w-full h-1 bg-[rgba(123,123,123,0.15)] dark:bg-[rgba(229,229,229,0.08)] rounded-full overflow-hidden mt-3">
                          <div
                            className="h-full rounded-full bg-primary-02"
                            style={{ width: `${batch.avgScore}%` }}
                          />
                        </div>
                      </div>
  
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-s-stroke2/30 relative z-10">
                        <span className="text-[12px] font-sans font-semibold text-t-secondary">
                          Avg: {batch.avgScore}%
                        </span>
                        <Link
                          href={`/teacher/batch/${batch.id}`}
                          className="btn btn-sm btn-dark w-fit"
                        >
                          Analysis
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>

          {/* AI Attention Flags Card */}
          <SectionCard
            title="AI Attention Flags"
            className="w-full xl:w-[368px] xl:h-[624px] shrink-0 box-sizing:border-box"
            headerRight={
              <button className="flex items-center justify-center size-8 rounded-full text-t-secondary hover:text-t-primary dark:hover:text-t-primary hover:bg-b-surface1 dark:hover:bg-b-surface3 border border-s-stroke2/30 bg-b-surface2 dark:bg-b-surface2 transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
                <RiSettings4Line size={18} />
              </button>
            }
          >
            
            {/* Container (Product List) */}
            <div className="flex flex-col items-start p-0 gap-3 w-full">

              {/* Product List */}
              <div className="flex flex-col items-start p-0 gap-1 w-full">
                {flags.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 w-full text-center">
                    <p className="text-[14px] font-sans text-t-secondary">No flags to review.</p>
                  </div>
                ) : (
                  flags.map((flag, idx) => (
                    <div 
                      key={idx} 
                      className={`group/item relative flex flex-row items-center p-2 sm:p-3 gap-2 sm:gap-4 w-full h-[64px] sm:h-[76px] rounded-[16px] transition-all overflow-hidden ${
                        flag.highlighted 
                          ? "bg-b-surface1 dark:bg-b-surface1 shadow-[inset_0_0_0_3px_#FFFFFF] dark:shadow-[inset_0_0_0_3px_rgba(255,255,255,0.05)] border border-s-stroke2/20" 
                          : "bg-transparent border border-transparent hover:bg-b-surface1/30"
                      }`}
                    >
                      {/* Left: Image + Title/Batch */}
                      <div className="flex flex-row items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <img 
                          src={flag.avatar} 
                          alt={flag.name}
                          className="size-10 sm:size-12 rounded-[10px] shrink-0 object-cover border border-s-stroke2/20"
                        />
  
                        <div className="flex flex-col justify-center flex-1 min-w-0">
                          <span className="font-sans font-semibold text-[13px] sm:text-[15px] leading-tight text-t-primary dark:text-t-primary truncate w-full">
                            {flag.name}
                          </span>
                          <span className="font-sans text-[11px] sm:text-[12px] text-t-secondary truncate w-full mt-0.5">
                            {flag.batch}
                          </span>
                        </div>
                      </div>
  
                      {/* Right: Metric + Status */}
                      <div className="flex flex-col justify-center items-end gap-1 shrink-0">
                        <span className="font-sans font-semibold text-[13px] sm:text-[15px] text-t-primary dark:text-t-primary">
                          {flag.metric}
                        </span>
                        
                        <div className={`label h-5 px-1.5 sm:px-2 flex items-center justify-center rounded-[6px] ${
                          flag.statusType === "green"
                            ? "label-green"
                            : flag.statusType === "yellow"
                              ? "label-yellow"
                              : "label-red"
                        }`}>
                          <span className="font-sans text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                            {flag.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Footer / All Products Button */}
            <div className="flex flex-col items-start p-0 px-3 gap-2 w-full mt-6">
              <button className="flex flex-row justify-center items-center p-3.5 px-7 gap-2 w-full h-12 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-transparent text-t-secondary dark:text-t-secondary font-sans font-semibold text-[14px] leading-none tracking-[0.0125em] transition-all hover:border-t-secondary hover:text-t-primary dark:hover:text-t-primary active:scale-98 cursor-pointer">
                View All Flags
              </button>
            </div>

          </SectionCard>

        </div>

        {/* DPP Activity — full width row below the main grid */}
        <SectionCard
          title="DPP Activity"
          subtitle={`${pendingDPPs.length} active · ${completedDPPs.length} completed across all batches`}
          headerRight={
            <Link 
              href="/teacher/dpps" 
              className="h-9 px-4 rounded-[10px] text-xs font-semibold relative overflow-hidden border border-[#161616] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white hover:scale-[1.02] shadow-[0px_6.8656px_6.8656px_-2.33333px_rgba(0,0,0,0.16),inset_0px_1px_0px_rgba(255,255,255,0.16),inset_0px_-2px_0px_#191919] transition-transform active:scale-[0.98] shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <RiFileListLine size={16} /> Manage DPPs
            </Link>
          }
        >

          {/* DPPs Grid Wrapper */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {recentDPPs.length === 0 ? (
              <div className="col-span-1 md:col-span-3 flex flex-col items-center justify-center p-8 w-full text-center">
                <p className="text-[14px] font-sans text-t-secondary">No DPP activity yet.</p>
              </div>
            ) : (
              recentDPPs.map(dpp => {
                const completion = dpp.totalStudents ? Math.round((dpp.submittedCount / dpp.totalStudents) * 100) : 0;
                const isComplete = dpp.status === "completed";
                const isUpcoming = dpp.status === "upcoming";
                
                return (
                  <div
                    key={dpp.id}
                    className="group/card relative flex min-h-[10.5rem] flex-col justify-between p-[22px] bg-white dark:bg-white/[0.02] rounded-[24px] overflow-hidden transition-all hover:scale-[1.005]"
                  >
                    
                    <div className="min-w-0 flex-1 relative z-10">
                      {/* Header Status Badge Row */}
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[12px] font-sans font-semibold text-t-secondary uppercase tracking-wider">
                          {dpp.subject}
                        </span>
                        <span className="text-[12px] font-sans font-medium text-t-secondary">
                          {isComplete ? "Completed" : isUpcoming ? "Upcoming" : "Pending"}
                        </span>
                      </div>
                      
                      <div className="truncate font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                        {dpp.title}
                      </div>
                      <div className="text-[12px] font-sans text-t-secondary mt-1">
                        {dpp.batchName} · {dpp.submittedCount}/{dpp.totalStudents} Submitted ({completion}%)
                      </div>
  
                      {/* Progress Bar in between */}
                      <div className="w-full h-1 bg-[rgba(123,123,123,0.15)] dark:bg-[rgba(229,229,229,0.08)] rounded-full overflow-hidden mt-3">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isComplete 
                              ? "bg-primary-02" 
                              : isUpcoming 
                                ? "bg-t-secondary" 
                                : "bg-gradient-to-r from-[#EF9D0E] to-[#F1C40F]"
                          }`}
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                    </div>
  
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-s-stroke2/30 relative z-10">
                      <span className="text-[12px] font-sans font-semibold text-t-secondary">
                        Due: {dpp.dueDate}
                      </span>
                      <button className="btn btn-sm btn-dark w-fit">
                        {isComplete ? "Reports" : isUpcoming ? "Edit" : "Stats"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

      </main>
    </>
  );
}
