"use client";

import Navbar from "@/components/layout/Navbar";
import { StatCard, StatCardGrid } from "@/components/shared/StatCard";
import { 
  RiSearchLine, 
  RiFilter3Line, 
  RiCustomerService2Fill, 
  RiTimeLine,
  RiArrowDownSLine,
  RiArrowRightUpLine
} from "@remixicon/react";

const mockTickets = [
  { id: "TCK-4829", institute: "Vibrant Academy", subject: "API Integration Failing for New Batch", priority: "High", status: "Open", time: "2 hours ago" },
  { id: "TCK-4828", institute: "Allen Career Institute", subject: "Missing Chemistry Questions in Bank", priority: "Medium", status: "In Progress", time: "5 hours ago" },
  { id: "TCK-4827", institute: "Future Point Classes", subject: "Billing issue: Double charged for June", priority: "High", status: "Open", time: "1 day ago" },
  { id: "TCK-4826", institute: "Narayana Group", subject: "Leaderboard not syncing correctly", priority: "Low", status: "Resolved", time: "2 days ago" },
];

export default function SupportPage() {
  return (
    <>
      <Navbar title="Support & Escalations" subtitle="Manage B2B tickets, API issues, and platform escalations." />
      
      <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6">
        
        {/* KPI Cards */}
        <StatCardGrid cols={3} className="mb-8">
          <StatCard
            icon={<RiCustomerService2Fill size={20} />}
            title="Open Escalations"
            value={14}
            badge="+3"
            badgeVariant="red"
            subtext="since yesterday"
          />
          <StatCard
            icon={<RiTimeLine size={20} />}
            title="Avg First Response"
            value={<>45<span className="text-2xl font-bold text-t-secondary ml-1">m</span></>}
            badge="-12m"
            subtext="vs target"
          />
          <StatCard
            icon={<RiCustomerService2Fill size={20} className="text-primary-02" />}
            title="Resolved This Week"
            value={86}
            badge="100%"
            subtext="cleared"
          />
        </StatCardGrid>

        {/* Tickets Table */}
        <div className="group relative card flex flex-col rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 overflow-hidden">
          <div className="box-hover" />
          
          {/* Table Header Controls */}
          <div className="relative z-10 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between border-b border-s-stroke2/30">
            <div className="relative w-full max-w-md flex items-center">
              <RiSearchLine size={18} className="absolute left-4 text-t-secondary" />
              <input 
                type="text" 
                placeholder="Search tickets by ID, Institute, or Subject..." 
                className="w-full h-11 pl-11 pr-4 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg text-[14px] text-t-primary dark:text-t-primary placeholder:text-t-secondary focus:border-t-primary dark:focus:border-t-primary outline-none transition-colors shadow-inner"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select className="h-11 pl-4 pr-10 appearance-none rounded-lg bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 text-[14px] font-medium text-t-primary dark:text-t-primary hover:bg-s-stroke2 dark:hover:bg-s-stroke2/30 transition-colors shadow-sm outline-none cursor-pointer">
                  <option value="">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
                <RiArrowDownSLine size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
              </div>
              
              <div className="relative">
                <select className="h-11 pl-4 pr-10 appearance-none rounded-lg bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 text-[14px] font-medium text-t-primary dark:text-t-primary hover:bg-s-stroke2 dark:hover:bg-s-stroke2/30 transition-colors shadow-sm outline-none cursor-pointer">
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <RiArrowDownSLine size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
              </div>

              <button className="flex items-center gap-2 h-11 px-5 rounded-lg bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 text-[14px] font-semibold text-t-primary dark:text-t-primary hover:bg-s-stroke2 dark:hover:bg-s-stroke2/30 transition-colors shadow-sm">
                <RiFilter3Line size={16} className="text-t-secondary" /> More
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="relative z-10 overflow-x-auto">
            <table className="w-full text-left text-[14px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-s-stroke2/30 text-t-secondary text-[12px] uppercase tracking-[0.05em]">
                  <th className="px-6 py-4 font-semibold">Ticket ID</th>
                  <th className="px-6 py-4 font-semibold">Institute</th>
                  <th className="px-6 py-4 font-semibold">Subject</th>
                  <th className="px-6 py-4 font-semibold">Priority</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Opened</th>
                </tr>
              </thead>
              <tbody className="text-t-primary dark:text-t-primary font-medium">
                {mockTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-s-stroke2/20 hover:bg-b-surface1 dark:hover:bg-b-surface1/60 transition-colors cursor-pointer group/row">
                    <td className="px-6 py-4 font-bold text-t-primary dark:text-t-primary group-hover/row:text-[#0A84FF] transition-colors">{ticket.id}</td>
                    <td className="px-6 py-4 font-bold">{ticket.institute}</td>
                    <td className="px-6 py-4 text-t-secondary font-medium max-w-[300px] truncate">{ticket.subject}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[12px] font-bold uppercase tracking-wider ${
                        ticket.priority === "High" 
                          ? "bg-[rgba(239,68,68,0.08)] text-primary-03" 
                          : ticket.priority === "Medium"
                          ? "bg-[rgba(255,159,10,0.08)] text-[#FF9F0A]"
                          : "bg-b-surface1 dark:bg-b-surface1 text-t-secondary"
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[12px] font-bold uppercase tracking-wider ${
                        ticket.status === "Open" 
                          ? "bg-[rgba(10,132,255,0.08)] text-[#0A84FF]" 
                          : ticket.status === "In Progress"
                          ? "bg-[rgba(255,159,10,0.08)] text-[#FF9F0A]"
                          : "bg-[rgba(0,166,86,0.08)] text-primary-02"
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-t-secondary">{ticket.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="relative z-10 flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between bg-b-surface2 dark:bg-b-surface2 rounded-b-[32px]">
            <div className="text-[13px] text-t-secondary font-medium">
              Showing <span className="font-bold text-t-primary dark:text-t-primary">1</span> to <span className="font-bold text-t-primary dark:text-t-primary">4</span> of 42 tickets
            </div>
            
            <div className="flex items-center gap-2">
              <button className="flex items-center justify-center h-8 px-3 rounded-lg text-t-secondary hover:bg-b-surface1 dark:hover:bg-b-surface1 hover:text-t-primary dark:hover:text-t-primary transition-colors text-[13px] font-semibold opacity-50 cursor-not-allowed">
                Previous
              </button>
              <button className="flex items-center justify-center h-8 px-3 rounded-lg text-t-secondary hover:bg-b-surface1 dark:hover:bg-b-surface1 hover:text-t-primary dark:hover:text-t-primary transition-colors text-[13px] font-semibold">
                Next
              </button>
            </div>
          </div>

        </div>

      </main>
    </>
  );
}
