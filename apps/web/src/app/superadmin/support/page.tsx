"use client";

import Navbar from "@/components/layout/Navbar";
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
        
        {/* KPI Cards (Row of 3 active highlighted boxes) */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-lg mb-8">
          
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-[#101010] dark:text-t-primary"><RiCustomerService2Fill size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Open Escalations
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[48px] lg:text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                14
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.05)] rounded-lg">
                  <span className="text-[#EF4444] text-[12px] font-semibold leading-none">+3</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  since yesterday
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-[#101010] dark:text-t-primary"><RiTimeLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Avg First Response
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[48px] lg:text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                45<span className="text-[24px] font-bold text-[#7B7B7B] ml-1">m</span>
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                  <span className="text-[#00A656] text-[12px] font-semibold leading-none">-12m</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  vs target
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-[#00A656]"><RiCustomerService2Fill size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Resolved This Week
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[48px] lg:text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                86
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                  <RiArrowRightUpLine size={12} className="text-[#00A656]" />
                  <span className="text-[#00A656] text-[12px] font-semibold leading-none">100%</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  cleared
                </span>
              </div>
            </div>
          </div>
          
        </div>

        {/* Tickets Table */}
        <div className="group relative card flex flex-col rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 overflow-hidden">
          <div className="box-hover" />
          
          {/* Table Header Controls */}
          <div className="relative z-10 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between border-b border-s-stroke2/30">
            <div className="relative w-full max-w-md flex items-center">
              <RiSearchLine size={18} className="absolute left-4 text-[#7B7B7B]" />
              <input 
                type="text" 
                placeholder="Search tickets by ID, Institute, or Subject..." 
                className="w-full h-11 pl-11 pr-4 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg text-[14px] text-[#101010] dark:text-t-primary placeholder:text-[#7B7B7B] focus:border-[#101010] dark:focus:border-t-primary outline-none transition-colors shadow-inner"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select className="h-11 pl-4 pr-10 appearance-none rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 text-[14px] font-medium text-[#101010] dark:text-t-primary hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 transition-colors shadow-sm outline-none cursor-pointer">
                  <option value="">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
                <RiArrowDownSLine size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7B7B7B] pointer-events-none" />
              </div>
              
              <div className="relative">
                <select className="h-11 pl-4 pr-10 appearance-none rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 text-[14px] font-medium text-[#101010] dark:text-t-primary hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 transition-colors shadow-sm outline-none cursor-pointer">
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <RiArrowDownSLine size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7B7B7B] pointer-events-none" />
              </div>

              <button className="flex items-center gap-2 h-11 px-5 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 text-[14px] font-semibold text-[#101010] dark:text-t-primary hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 transition-colors shadow-sm">
                <RiFilter3Line size={16} className="text-[#7B7B7B]" /> More
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="relative z-10 overflow-x-auto">
            <table className="w-full text-left text-[14px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-s-stroke2/30 text-[#7B7B7B] text-[12px] uppercase tracking-[0.05em]">
                  <th className="px-6 py-4 font-semibold">Ticket ID</th>
                  <th className="px-6 py-4 font-semibold">Institute</th>
                  <th className="px-6 py-4 font-semibold">Subject</th>
                  <th className="px-6 py-4 font-semibold">Priority</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Opened</th>
                </tr>
              </thead>
              <tbody className="text-[#101010] dark:text-t-primary font-medium">
                {mockTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-s-stroke2/20 hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/60 transition-colors cursor-pointer group/row">
                    <td className="px-6 py-4 font-bold text-[#101010] dark:text-t-primary group-hover/row:text-[#0A84FF] transition-colors">{ticket.id}</td>
                    <td className="px-6 py-4 font-bold">{ticket.institute}</td>
                    <td className="px-6 py-4 text-[#7B7B7B] font-medium max-w-[300px] truncate">{ticket.subject}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[12px] font-bold uppercase tracking-wider ${
                        ticket.priority === "High" 
                          ? "bg-[rgba(239,68,68,0.08)] text-[#EF4444]" 
                          : ticket.priority === "Medium"
                          ? "bg-[rgba(255,159,10,0.08)] text-[#FF9F0A]"
                          : "bg-[#F4F4F4] dark:bg-b-surface1 text-[#7B7B7B]"
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
                          : "bg-[rgba(0,166,86,0.08)] text-[#00A656]"
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-[#7B7B7B]">{ticket.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="relative z-10 flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between bg-[#FDFDFD] dark:bg-b-surface2 rounded-b-[32px]">
            <div className="text-[13px] text-[#7B7B7B] font-medium">
              Showing <span className="font-bold text-[#101010] dark:text-t-primary">1</span> to <span className="font-bold text-[#101010] dark:text-t-primary">4</span> of 42 tickets
            </div>
            
            <div className="flex items-center gap-2">
              <button className="flex items-center justify-center h-8 px-3 rounded-lg text-[#7B7B7B] hover:bg-[#F9F9F9] dark:hover:bg-b-surface1 hover:text-[#101010] dark:hover:text-t-primary transition-colors text-[13px] font-semibold opacity-50 cursor-not-allowed">
                Previous
              </button>
              <button className="flex items-center justify-center h-8 px-3 rounded-lg text-[#7B7B7B] hover:bg-[#F9F9F9] dark:hover:bg-b-surface1 hover:text-[#101010] dark:hover:text-t-primary transition-colors text-[13px] font-semibold">
                Next
              </button>
            </div>
          </div>

        </div>

      </main>
    </>
  );
}
