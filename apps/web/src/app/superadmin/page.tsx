"use client";

import { useState, useEffect } from "react";
import { 
  RiBuilding4Line, 
  RiUserStarLine, 
  RiBrainLine,
  RiShieldCheckLine,
  RiAlertLine, 
  RiCheckFill, 
  RiTimeLine,
  RiArrowDownSLine,
  RiArrowRightLine,
  RiArrowRightUpLine
} from "@remixicon/react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { API_URL } from "@/lib/api.client";

interface PlatformStats {
  totalInstitutes: number;
  totalStudents: number;
  totalAttempts: number;
  newInstitutesThisWeek: number;
  newStudentsThisWeek: number;
  systemUptime: string;
}

const auditLogs = [
  { id: 1, action: "Question Bank Sync", detail: "NEET 2025 questions added", time: "1h ago", type: "info" },
  { id: 2, action: "Super Admin Login", detail: "harsh@examphere.com", time: "2h ago", type: "success" },
  { id: 3, action: "Question Bank Sync", detail: "JEE Main 2024 questions added", time: "3h ago", type: "info" },
  { id: 4, action: "System Started", detail: "API server & workers online", time: "5h ago", type: "success" },
];

const systemResources = [
  { label: "API", fullName: "API Server", score: 85, load: "Normal", trend: "+2.4%" },
  { label: "DB", fullName: "Database", score: 65, load: "Normal", trend: "-1.2%" },
  { label: "Storage", fullName: "Storage Array", score: 92, load: "High", trend: "+14.5%" },
  { label: "Cache", fullName: "Redis Cache", score: 35, load: "Low", trend: "-5.0%" },
  { label: "Workers", fullName: "Background Workers", score: 78, load: "Normal", trend: "+8.1%" },
  { label: "CDN", fullName: "CDN Edge", score: 45, load: "Normal", trend: "+0.5%" },
];

const mockTickets: any[] = [];

export default function SuperAdminDashboardPage() {
  const { user, session } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isOverviewDropdownOpen, setIsOverviewDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.access_token) return;
      try {
        const res = await fetch(`${API_URL}/api/v1/superadmin/stats`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.success) setStats(data.data);
      } catch {
        // non-fatal
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [session?.access_token]);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <>
      <Navbar 
        title="Platform Health" 
        subtitle="Superadmin overview and system analytics." 
      />
      
      <main className="mx-auto w-full max-w-[1560px] flex flex-col items-center pb-12 pt-6 gap-6 px-6 bg-transparent">

        {/* ── Main Layout: All widgets ── */}
        <div className="flex flex-col gap-6 w-full">
          
          {/* Top Row: Dashboard Overview (Full Width) */}
          <div className="flex flex-col gap-4 w-full">
            <div className="flex justify-between items-end w-full px-2">
              <h3 className="font-sans text-[20px] font-semibold tracking-[-0.02em] text-t-primary leading-snug">
                Dashboard overview
              </h3>
              <div className="flex flex-row justify-between items-center px-4 py-2 gap-2 h-10 border border-s-stroke2 rounded-[10px] cursor-pointer bg-b-surface1 hover:bg-b-surface3 transition-colors">
                <span className="t-body-base text-t-secondary">This Week</span>
                <RiArrowDownSLine size={20} className="text-t-secondary" />
              </div>
            </div>
            <MetricGrid cols={4}>
              
              {/* Metric 1: Total Institutes */}
              <MetricCard
                icon={<RiBuilding4Line size={20} />}
                label="Total Institutes"
                value={stats?.totalInstitutes ?? 0}
                badge={`+${stats?.newInstitutesThisWeek ?? 0}`}
                badgeLabel="this week"
              />

              {/* Metric 2: Total Students */}
              <MetricCard
                icon={<RiUserStarLine size={20} />}
                label="Total Students"
                value={fmt(stats?.totalStudents ?? 0)}
                badge={`+${stats?.newStudentsThisWeek ?? 0}`}
                badgeLabel="this week"
              />

              {/* Metric 3: Total Attempts */}
              <MetricCard
                icon={<RiBrainLine size={20} />}
                label="Total Attempts"
                value={fmt(stats?.totalAttempts ?? 0)}
                badge="Live"
                badgeLabel="all time"
              />

              {/* Metric 4: System Uptime */}
              <MetricCard
                icon={<RiShieldCheckLine size={20} className="text-primary-02" />}
                label="System Uptime"
                value={stats?.systemUptime ?? "99.98%"}
                badge="Stable"
                badgeLabel="all clear"
              />

            </MetricGrid>
          </div>

          {/* Middle Row: 2-column layout for Resources and Tickets */}
          <div className="flex flex-col xl:flex-row items-start gap-6 w-full">
            
            {/* Left Column (System Resources) */}
            <SectionCard title="System Resources" className="flex-1 min-w-0">
              <div className="relative z-10 flex flex-col gap-2 w-full mt-2">
                {systemResources.map((bar, idx) => (
                  <div key={idx} className="group/item relative flex flex-row items-center justify-between p-4 gap-4 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all h-[72px] cursor-pointer">
                    <div className="w-[140px] md:w-[160px] flex flex-col shrink-0">
                      <span className="font-sans font-semibold text-sm text-t-primary truncate">{bar.fullName}</span>
                      <span className="text-xs text-t-tertiary">{bar.load} Load</span>
                    </div>
                    
                    <div className="flex-1 h-2 mx-4 bg-b-surface1 border border-s-stroke2/40 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 bg-linear-to-r ${
                          bar.score >= 85 ? 'from-[#FF6A55] to-[#FF453A]' :
                          bar.score >= 65 ? 'from-[#EF9D0E] to-[#D98A00]' :
                          'from-primary-02 to-[#00934c]'
                        }`}
                        style={{ width: `${bar.score}%` }}
                      />
                    </div>
                    
                    <div className="w-[120px] flex flex-row items-center justify-end gap-3 shrink-0">
                      <span className="text-base font-bold text-t-primary w-[44px] text-right">
                        {bar.score}%
                      </span>
                      <span className={`label h-6 text-[11px] px-1.5 ${bar.trend.startsWith('+') ? (bar.score >= 85 ? 'label-red' : 'label-green') : 'label-green'}`}>
                        <RiArrowRightUpLine size={12} className={`mr-0.5 ${bar.trend.startsWith('-') ? 'rotate-[90deg]' : ''}`} />
                        {bar.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Right Column (Support Tickets) */}
            <SectionCard title="Recent Tickets" className="w-full xl:w-[420px] shrink-0">
              <div className="flex flex-col gap-2 w-full flex-1 mt-2">
                {mockTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 py-10 text-center">
                    <span className="text-sm font-sans text-t-secondary">No recent tickets found.</span>
                  </div>
                ) : mockTickets.map((ticket, index) => (
                  <div key={ticket.id} className="group/item relative flex flex-row p-4 gap-4 w-full bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all cursor-pointer">
                    <div className="w-10 h-10 bg-primary-01/10 text-primary-01 rounded-full shrink-0 flex items-center justify-center font-bold">
                      {ticket.name.charAt(0)}
                    </div>
                    <div className="flex flex-col gap-2 flex-1 min-w-0 mt-0.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-sans font-semibold text-sm text-t-primary">{ticket.name}</span>
                          <span className="text-[13px] text-t-tertiary">on</span>
                          <span className="font-sans font-semibold text-sm text-t-primary truncate max-w-[120px]">{ticket.project}</span>
                        </div>
                        <span className="text-[12px] text-t-tertiary">{ticket.time}</span>
                      </div>
                      <span className="text-sm text-t-primary line-clamp-2">"{ticket.text}"</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-4">
                <button className="btn btn-outline w-full rounded-[10px] h-12">
                  Go to Helpdesk
                </button>
              </div>
            </SectionCard>
          </div>

          {/* Bottom Row: Audit Logs */}
          <SectionCard title="Audit Log" className="w-full">
            <div className="flex flex-col gap-2 w-full mt-2">
              {auditLogs.slice(0,4).map((log) => {
                const statusClass = log.type === 'success' ? 'bg-primary-02/10 text-primary-02 border-primary-02/20' : 
                                  log.type === 'error' ? 'bg-primary-03/10 text-primary-03 border-primary-03/20' :
                                  'bg-primary-01/10 text-primary-01 border-primary-01/20';
                
                return (
                  <div key={log.id} className="group/item relative flex flex-row items-center p-4 gap-6 w-full bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all cursor-pointer">
                    
                    <div className="flex flex-row items-center gap-4 flex-1 min-w-0">
                      <div className={`flex items-center justify-center size-10 rounded-[10px] shrink-0 border ${statusClass}`}>
                        {log.type === 'success' ? <RiCheckFill size={18} /> : log.type === 'error' ? <RiAlertLine size={18} /> : <RiTimeLine size={18} />}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0 w-[400px]">
                        <span className="font-sans font-semibold text-sm text-t-primary truncate">{log.action}</span>
                        <span className="text-[13px] text-t-secondary truncate">{log.detail}</span>
                      </div>
                    </div>

                    <div className="flex flex-row justify-end items-center gap-6 shrink-0 min-w-[160px]">
                      <span className="text-[13px] font-medium text-t-tertiary">
                        {log.time}
                      </span>
                      <span className={`label w-20 justify-center ${log.type === 'success' ? 'label-green' : log.type === 'error' ? 'label-red' : 'label-gray'}`}>
                        {log.type === 'success' ? 'Resolved' : log.type === 'error' ? 'Failed' : 'Info'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-2">
              <button className="btn btn-ghost px-4 h-10 rounded-[10px] text-sm">
                View full audit log <RiArrowRightLine size={18} className="ml-1" />
              </button>
            </div>
          </SectionCard>
        </div>
      </main>
    </>
  );
}
