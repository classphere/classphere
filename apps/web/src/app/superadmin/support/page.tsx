"use client";

import Navbar from "@/components/layout/Navbar";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { 
  RiSearchLine, 
  RiFilter3Line, 
  RiCustomerService2Fill, 
  RiTimeLine,
  RiArrowDownSLine,
  RiArrowRightUpLine
} from "@remixicon/react";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";

export default function SupportPage() {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTickets() {
      if (!session?.access_token) return;
      try {
        const res = await apiClient.get("/api/v1/superadmin/tickets", session.access_token);
        if (res.success) {
          setTickets(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, [session?.access_token]);

  return (
    <>
      <Navbar title="Support & Escalations" subtitle="Manage B2B tickets, API issues, and platform escalations." />
      
      <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6">
        
        {/* KPI Cards */}
        <MetricGrid cols={3} className="mb-8">
          <MetricCard
            icon={<RiCustomerService2Fill size={20} />}
            label="Open Escalations"
            value={14}
            badge="+3"
            badgeLabel="since yesterday"
          />
          <MetricCard
            icon={<RiTimeLine size={20} />}
            label="Avg First Response"
            value={<>45<span className="text-2xl font-bold text-t-secondary ml-1">m</span></>}
            badge="-12m"
            badgeLabel="vs target"
          />
          <MetricCard
            icon={<RiCustomerService2Fill size={20} className="text-primary-02" />}
            label="Resolved This Week"
            value={86}
            badge="100%"
            badgeLabel="cleared"
          />
        </MetricGrid>

        {/* Tickets List */}
        <SectionCard 
          title="Support Tickets"
          headerRight={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-[350px]">
                <RiSearchLine size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-t-secondary" />
                <input 
                  type="text" 
                  placeholder="Search tickets by ID, Institute..." 
                  className="w-full h-11 pl-11 pr-4 bg-b-surface1 border border-s-stroke2/40 rounded-[10px] text-[14px] text-t-primary placeholder:text-t-secondary focus:border-t-primary outline-none transition-colors"
                />
              </div>
              
              <div className="relative">
                <select className="h-11 pl-4 pr-10 appearance-none rounded-[10px] bg-b-surface1 border border-s-stroke2/40 text-[14px] font-medium text-t-primary hover:bg-s-stroke2/30 transition-colors outline-none cursor-pointer">
                  <option value="">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
                <RiArrowDownSLine size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
              </div>
              
              <div className="relative">
                <select className="h-11 pl-4 pr-10 appearance-none rounded-[10px] bg-b-surface1 border border-s-stroke2/40 text-[14px] font-medium text-t-primary hover:bg-s-stroke2/30 transition-colors outline-none cursor-pointer">
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <RiArrowDownSLine size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-3 mt-4">
            
            {/* Header row (hidden on mobile, visible md+) */}
            <div className="hidden md:flex flex-row items-center w-full px-6 py-2 text-xs font-semibold uppercase tracking-wider text-t-secondary">
              <div className="w-[100px]">Ticket ID</div>
              <div className="w-[200px]">Institute</div>
              <div className="flex-1">Subject</div>
              <div className="w-[120px]">Priority</div>
              <div className="w-[120px]">Status</div>
              <div className="w-[120px] text-right">Opened</div>
            </div>

            {/* Data rows */}
            {tickets.length === 0 && !loading && (
              <div className="py-10 text-center text-t-secondary font-sans text-sm">
                No support tickets found.
              </div>
            )}
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="group/item relative flex flex-row items-center p-3 sm:p-4 gap-3 sm:gap-6 w-full bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all cursor-pointer overflow-hidden h-[76px] sm:h-[88px]"
              >
                
                {/* ID & Institute */}
                <div className="flex flex-col justify-center shrink-0 w-[100px] sm:w-[150px]">
                  <div className="font-sans text-[12px] sm:text-[14px] font-bold text-t-primary group-hover/item:text-[#0A84FF] transition-colors truncate">
                    {ticket.id.split('-')[0]}
                  </div>
                  <div className="font-sans text-[11px] sm:text-[13px] text-t-secondary truncate">
                    {ticket.institute?.name || "Global"}
                  </div>
                </div>
                
                {/* Subject */}
                <div className="flex-1 min-w-0 font-sans text-[13px] sm:text-[14px] font-medium text-t-primary truncate pr-1 sm:pr-2">
                  {ticket.subject}
                </div>
                
                {/* Priority & Status */}
                <div className="flex flex-col md:flex-row items-end md:items-center justify-center gap-1 md:gap-4 shrink-0 md:w-[240px]">
                  <span className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-[10px] text-[9px] sm:text-[11px] font-bold uppercase tracking-wider border ${
                    ticket.priority === "High" 
                      ? "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] text-primary-03" 
                      : ticket.priority === "Medium"
                      ? "bg-[rgba(255,159,10,0.08)] border-[rgba(255,159,10,0.2)] text-[#FF9F0A]"
                      : "bg-b-surface1 border-s-stroke2/40 text-t-secondary"
                  }`}>
                    {ticket.priority}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-[10px] text-[9px] sm:text-[11px] font-bold uppercase tracking-wider border ${
                    ticket.status === "Open" 
                      ? "bg-[rgba(10,132,255,0.08)] border-[rgba(10,132,255,0.2)] text-[#0A84FF]" 
                      : ticket.status === "In Progress"
                      ? "bg-[rgba(255,159,10,0.08)] border-[rgba(255,159,10,0.2)] text-[#FF9F0A]"
                      : "bg-[rgba(0,166,86,0.08)] border-[rgba(0,166,86,0.2)] text-primary-02"
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                
                {/* Time */}
                <div className="hidden md:flex md:w-[100px] text-right justify-end font-sans text-[13px] text-t-secondary truncate shrink-0 pl-2">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </div>

              </div>
            ))}
          </div>
          
          {/* Pagination */}
          <div className="mt-4 pt-4 border-t border-s-stroke2/30 flex justify-between items-center text-sm font-medium text-t-secondary px-2">
            <div>
              Showing <span className="font-bold text-t-primary">{tickets.length > 0 ? 1 : 0}</span> to <span className="font-bold text-t-primary">{tickets.length}</span> of {tickets.length} tickets
            </div>
            
            <div className="flex items-center gap-2">
              <button className="flex items-center justify-center h-8 px-3 rounded-[10px] text-t-secondary hover:bg-b-surface1 hover:text-t-primary transition-colors text-[13px] font-semibold opacity-50 cursor-not-allowed">
                Previous
              </button>
              <button className="flex items-center justify-center h-8 px-3 rounded-[10px] text-t-secondary hover:bg-b-surface1 hover:text-t-primary transition-colors text-[13px] font-semibold border border-s-stroke2/40">
                Next
              </button>
            </div>
          </div>
        </SectionCard>

      </main>
    </>
  );
}
