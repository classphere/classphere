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
  activeTrials: number;
  systemUptime: string | null;
}

export default function SuperAdminDashboardPage() {
  const { user, session } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isOverviewDropdownOpen, setIsOverviewDropdownOpen] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  const [liveResources, setLiveResources] = useState<any[]>([]);
  const [liveAuditLogs, setLiveAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.access_token) return;
      try {
        const res = await fetch(`${API_URL}/api/v1/superadmin/stats`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.success) setStats(data.data);

        // Fetch tickets for the widget
        const tRes = await fetch(`${API_URL}/api/v1/superadmin/tickets`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const tData = await tRes.json();
        if (tData.success) setTickets(tData.data.slice(0, 4)); // Only top 4
      } catch {
        // non-fatal
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) return;
    
    // Fetch real audit logs
    fetch(`${API_URL}/api/v1/superadmin/audit-logs?limit=4`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && data.data.length > 0) {
          const mappedLogs = data.data.map((log: any) => ({
            id: log.id,
            action: log.action,
            detail: log.detail,
            time: new Date(log.created_at).toLocaleTimeString() + " (" + new Date(log.created_at).toLocaleDateString() + ")",
            type: log.type
          }));
          setLiveAuditLogs(mappedLogs);
        }
      })
      .catch(() => {});
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) return;
    
    const fetchTelemetry = () => {
      if (document.visibilityState !== "visible") return;
      fetch(`${API_URL}/api/v1/superadmin/telemetry`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const mappedResources = [
              { label: "API", fullName: "API Server", score: data.data.api.score, load: data.data.api.load, trend: data.data.api.trend },
              { label: "DB", fullName: "Database", score: data.data.db.score, load: data.data.db.load, trend: data.data.db.trend },
              { label: "Storage", fullName: "Storage Array", score: data.data.storage.score, load: data.data.storage.load, trend: data.data.storage.trend },
              { label: "Cache", fullName: "Redis Cache", score: data.data.cache.score, load: data.data.cache.load, trend: data.data.cache.trend },
              { label: "Workers", fullName: "Background Workers", score: data.data.workers.score, load: data.data.workers.load, trend: data.data.workers.trend },
              { label: "CDN", fullName: "CDN Edge", score: data.data.cdn.score, load: data.data.cdn.load, trend: data.data.cdn.trend },
            ];
            setLiveResources(mappedResources);
          }
        })
        .catch(() => setLiveResources([]));
    };
    
    fetchTelemetry();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchTelemetry();
    };
    const interval = setInterval(fetchTelemetry, 60000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
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

              {/* Metric 4: Active Trials */}
              <MetricCard
                icon={<RiTimeLine size={20} className="text-primary-02" />}
                label="Active Trials"
                value={stats?.activeTrials ?? 0}
                badge="Phase 3"
                badgeLabel="trial accounts"
              />

            </MetricGrid>
          </div>

          {/* Middle Row: 2-column layout for Resources and Tickets */}
          <div className="flex flex-col xl:flex-row items-start gap-6 w-full">
            
            {/* Left Column (System Resources) */}
            <SectionCard title="System Resources" className="flex-1 min-w-0">
              <div className="relative z-10 flex flex-col gap-2 w-full mt-2">
                {liveResources.length === 0 ? (
                  <div className="py-10 text-center font-sans text-sm text-t-secondary">Live resource telemetry is unavailable. The API is not substituting estimated health values.</div>
                ) : liveResources.map((bar, idx) => (
                  <div key={idx} className="group/item relative flex flex-row items-center justify-between p-3 sm:p-4 gap-3 sm:gap-4 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all h-[72px] sm:h-[80px] cursor-pointer overflow-hidden">
                    <div className="w-1/3 sm:w-[140px] md:w-[160px] flex flex-col justify-center shrink-0 min-w-0">
                      <span className="font-sans font-semibold text-[13px] sm:text-sm text-t-primary truncate">{bar.fullName}</span>
                      <span className="text-[10px] sm:text-xs text-t-tertiary truncate">{bar.load}</span>
                    </div>
                    
                    <div className="flex-1 h-2 mx-2 sm:mx-4 bg-b-surface1 border border-s-stroke2/40 rounded-full overflow-hidden shrink min-w-0">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 bg-linear-to-r ${
                          bar.score >= 85 ? 'from-[#FF6A55] to-[#FF453A]' :
                          bar.score >= 65 ? 'from-[#EF9D0E] to-[#D98A00]' :
                          'from-primary-02 to-[#00934c]'
                        }`}
                        style={{ width: `${bar.score}%` }}
                      />
                    </div>
                    
                    <div className="flex flex-col items-end justify-center gap-1 shrink-0">
                      <span className="text-[13px] sm:text-base font-bold text-t-primary text-right">
                        {bar.score}%
                      </span>
                      <span className={`label h-[22px] sm:h-6 text-[9px] sm:text-[11px] px-1.5 ${bar.trend.startsWith('+') ? (bar.score >= 85 ? 'label-red' : 'label-green') : 'label-green'}`}>
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
                {tickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 py-10 text-center">
                    <span className="text-sm font-sans text-t-secondary">No recent tickets found.</span>
                  </div>
                ) : tickets.map((ticket, index) => (
                  <div key={ticket.id} className="group/item relative flex flex-row items-center p-3 sm:p-4 gap-3 sm:gap-4 w-full bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all h-[72px] sm:h-[80px] cursor-pointer overflow-hidden">
                    <div className="size-10 bg-primary-01/10 text-primary-01 rounded-full shrink-0 flex items-center justify-center font-bold">
                      {(ticket.author?.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 truncate w-full">
                        <span className="font-sans font-semibold text-[13px] sm:text-sm text-t-primary truncate shrink">{ticket.author?.name || "Unknown"}</span>
                        <span className="text-[11px] sm:text-[13px] text-t-tertiary shrink-0">from</span>
                        <span className="font-sans font-semibold text-[12px] sm:text-sm text-t-primary truncate shrink-0 max-w-[80px] sm:max-w-[120px]">{ticket.institute?.name || "Global"}</span>
                      </div>
                      <span className="text-[12px] sm:text-sm text-t-primary truncate w-full">"{ticket.subject}"</span>
                    </div>
                    <div className="shrink-0 flex items-center justify-end">
                      <span className="text-[10px] sm:text-[12px] text-t-tertiary">{new Date(ticket.created_at).toLocaleDateString()}</span>
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
              {liveAuditLogs.map((log) => {
                const statusClass = log.type === 'success' ? 'bg-primary-02/10 text-primary-02 border-primary-02/20' : 
                                  log.type === 'error' ? 'bg-primary-03/10 text-primary-03 border-primary-03/20' :
                                  'bg-primary-01/10 text-primary-01 border-primary-01/20';
                
                return (
                  <div key={log.id} className="group/item relative flex flex-row items-center p-3 sm:p-4 gap-3 sm:gap-6 w-full bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all h-[72px] sm:h-[80px] cursor-pointer overflow-hidden">
                    
                    <div className="flex flex-row items-center gap-3 sm:gap-4 flex-1 min-w-0 h-full">
                      <div className={`flex items-center justify-center size-10 rounded-[10px] shrink-0 border ${statusClass}`}>
                        {log.type === 'success' ? <RiCheckFill size={18} /> : log.type === 'error' ? <RiAlertLine size={18} /> : <RiTimeLine size={18} />}
                      </div>
                      <div className="flex flex-col justify-center min-w-0 flex-1 md:flex-none md:w-[400px]">
                        <span className="font-sans font-semibold text-[13px] sm:text-sm text-t-primary truncate">{log.action}</span>
                        <span className="text-[11px] sm:text-[13px] text-t-secondary truncate">{log.detail}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center items-end sm:items-center gap-1 sm:gap-6 shrink-0 h-full">
                      <span className="text-[11px] sm:text-[13px] font-medium text-t-tertiary">
                        {log.time}
                      </span>
                      <span className={`label sm:w-20 justify-center h-[22px] sm:h-6 text-[9px] sm:text-[11px] px-2 ${log.type === 'success' ? 'label-green' : log.type === 'error' ? 'label-red' : 'label-gray'}`}>
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
