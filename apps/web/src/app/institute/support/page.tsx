"use client";

import { useState } from "react";
import { 
  RiAddLine, 
  RiTicketLine, 
  RiTimeLine, 
  RiSearchLine, 
  RiNotification3Line, 
  RiMailLine,
  RiCloseLine
} from "@remixicon/react";

const mockTickets = [
  { id: "TCK-4829", subject: "API Integration Failing for New Batch", priority: "High", status: "Open", time: "2 hours ago" },
  { id: "TCK-4712", subject: "Requesting additional 500 student capacity", priority: "Medium", status: "Resolved", time: "1 week ago" }
];

export default function InstituteSupportPage() {
  const [showNewTicket, setShowNewTicket] = useState(false);

  return (
    <>
      <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">
        
        {/* ── Top Navigation Row (Figma Style) ── */}
        <div className="flex flex-row justify-between items-center w-full h-12 gap-6">
          {/* Title */}
          <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary dark:text-t-primary">
            Platform Support & Helpdesk
          </h1>

          {/* Navigation Items (Right Side) */}
          <div className="flex flex-row items-center gap-3">
            {/* Search Box */}
            <div className="flex flex-row items-center bg-b-surface2 border border-s-stroke2 rounded-lg px-3 py-2 w-[315px] h-12 gap-2 shadow-xs">
              <RiSearchLine size={20} className="text-t-secondary dark:text-t-tertiary" />
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent border-none outline-none text-sm text-t-primary dark:text-t-primary placeholder-t-secondary w-full"
              />
            </div>

            {/* Bell Button */}
            <button className="btn btn-outline w-12 h-12 !px-0 rounded-lg flex items-center justify-center relative shrink-0 cursor-pointer">
              <RiNotification3Line size={20} />
              <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-primary-03" />
            </button>

            {/* Mail Button */}
            <button className="btn btn-outline w-12 h-12 !px-0 rounded-lg flex items-center justify-center shrink-0 cursor-pointer">
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

        {/* Header Description & Action */}
        <div className="flex flex-row justify-between items-center mt-2 w-full">
          <p className="text-sm text-t-secondary dark:text-t-tertiary max-w-[600px] leading-relaxed m-0">
            Facing technical issues or need to discuss your billing plan? Open a ticket to communicate directly with the Classphere Super Admin team.
          </p>
          <button 
            className="btn btn-primary h-12 px-6 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-[0px_4px_12px_rgba(42,133,255,0.25)]" 
            onClick={() => setShowNewTicket(!showNewTicket)}
          >
            {showNewTicket ? (
              <>
                <RiCloseLine size={18} /> Cancel Ticket
              </>
            ) : (
              <>
                <RiAddLine size={18} /> Create New Ticket
              </>
            )}
          </button>
        </div>

        {/* New Ticket Form (Inline Expand) */}
        {showNewTicket && (
          <div className="group relative w-full rounded-lg overflow-hidden mt-4 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] transition-all duration-300 hover:shadow-[0px_12px_24px_-8px_rgba(0,0,0,0.06),0px_6px_10px_-4px_rgba(8,8,8,0.04)] hover:-translate-y-0.5 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-col p-8 bg-b-surface2 dark:bg-b-surface2 border-t-4 border-t-[#2A85FF] border-x border-b border-x-s-stroke2/40 border-b-s-stroke2/40">
              <h2 className="font-sans font-bold text-[24px] text-t-primary dark:text-t-primary mb-6 mt-0">Submit a Request</h2>
              
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-t-primary dark:text-t-primary">Issue Type</label>
                  <select className="bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 rounded-lg h-12 px-4 text-sm text-t-primary dark:text-t-primary outline-none focus:border-primary-01 focus:ring-1 focus:ring-[#2A85FF] max-w-[300px] cursor-pointer appearance-none">
                    <option>Technical Support</option>
                    <option>Billing & Upgrades</option>
                    <option>Feature Request</option>
                    <option>Other</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-t-primary dark:text-t-primary">Subject</label>
                  <input 
                    type="text" 
                    className="bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 rounded-lg h-12 px-4 text-sm text-t-primary dark:text-t-primary outline-none focus:border-primary-01 focus:ring-1 focus:ring-[#2A85FF] w-full placeholder:text-t-secondary" 
                    placeholder="Brief summary of the issue..." 
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-t-primary dark:text-t-primary">Description</label>
                  <textarea 
                    className="bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 rounded-lg py-3 px-4 text-sm text-t-primary dark:text-t-primary outline-none focus:border-primary-01 focus:ring-1 focus:ring-[#2A85FF] w-full min-h-[120px] resize-y placeholder:text-t-secondary" 
                    placeholder="Please provide as much detail as possible..." 
                  />
                </div>
                
                <div className="flex justify-end mt-2">
                  <button 
                    className="btn btn-primary h-10 px-6 rounded-lg text-sm font-semibold cursor-pointer" 
                    onClick={() => setShowNewTicket(false)}
                  >
                    Submit Ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tickets List Container */}
        <div className="group relative flex flex-col p-6 md:p-8 gap-6 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full min-w-0 overflow-hidden select-none mt-2 transition-all duration-300 hover:shadow-[0px_12px_24px_-8px_rgba(0,0,0,0.06),0px_6px_10px_-4px_rgba(8,8,8,0.04)] hover:-translate-y-0.5">
          <div className="box-hover" />
          
          <div className="relative z-10 flex flex-row items-center justify-between w-full h-10">
            <h3 className="font-sans font-bold text-[20px] text-t-primary dark:text-t-primary">Your Tickets</h3>
          </div>

          <div className="relative z-10 flex flex-col gap-2 w-full min-w-0">
            {mockTickets.map((ticket, index) => {
              const isOpen = ticket.status === "Open";
              const iconBgClass = isOpen ? "bg-primary-01/10 text-primary-01" : "bg-primary-02/10 text-primary-02";
              const statusBadgeClass = isOpen 
                ? "bg-primary-01/5 border-primary-01/15 text-primary-01" 
                : "bg-primary-02/5 border-primary-02/15 text-primary-02";
              const priorityBadgeClass = ticket.priority === "High"
                ? "bg-primary-03/5 border-primary-03/15 text-primary-03"
                : "bg-t-secondary/10 border-t-secondary/20 text-t-secondary";

              return (
                <div 
                  key={ticket.id}
                  className="flex flex-row items-center justify-between p-3 gap-8 rounded-lg transition-all w-full h-[88px] min-w-0 overflow-hidden bg-transparent hover:bg-b-surface1 dark:hover:bg-b-surface1/30 border border-transparent hover:border-s-stroke2/10 cursor-pointer"
                >
                  {/* Left: Icon & Details */}
                  <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden">
                    <div className={`flex w-16 h-16 items-center justify-center rounded-lg shrink-0 ${iconBgClass}`}>
                      <RiTicketLine size={24} />
                    </div>
                    
                    <div className="min-w-0 flex-1 flex flex-col">
                      <div className="flex items-center gap-3">
                        <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary truncate">
                          {ticket.subject}
                        </span>
                        <span className={`px-2 py-0.5 border rounded-md text-[10px] font-bold leading-none ${statusBadgeClass}`}>
                          {ticket.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-t-primary dark:text-t-primary">
                          {ticket.id}
                        </span>
                        <span className="text-xs text-s-stroke2 dark:text-s-stroke2">•</span>
                        <span className="text-xs text-t-secondary dark:text-t-tertiary flex items-center gap-1">
                          <RiTimeLine size={12} /> Updated {ticket.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Priority */}
                  <div className="flex flex-row items-center justify-end shrink-0 min-w-[100px]">
                    <span className={`px-2 py-1 border rounded-md text-[10px] font-bold uppercase tracking-wider ${priorityBadgeClass}`}>
                      {ticket.priority} Priority
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </main>
    </>
  );
}
