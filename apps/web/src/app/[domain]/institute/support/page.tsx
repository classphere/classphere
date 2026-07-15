"use client";

import { useState, useEffect } from "react";
import { 
  RiAddLine, 
  RiTicketLine, 
  RiTimeLine, 
  RiSearchLine, 
  RiNotification3Line, 
  RiMailLine,
  RiCloseLine,
  RiLoader4Line
} from "@remixicon/react";
import { apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";
import { PremiumSectionCard, PremiumCard } from "@/components/premium-ui";

export default function InstituteSupportPage() {
  const { session } = useAuth();
  const [showNewTicket, setShowNewTicket] = useState(false);
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [issueType, setIssueType] = useState("Technical Support");
  
  // Computed Priority based on issue type for simple logic
  const getPriority = (type: string) => {
    if (type === "Technical Support" || type === "Billing & Upgrades") return "High";
    return "Medium";
  };

  const fetchTickets = async () => {
    if (!session?.access_token) return;
    try {
      const res = await apiClient.get("/api/v1/support/tickets", session.access_token);
      if (res.success) {
        setTickets(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [session?.access_token]);

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !message.trim()) return;
    if (!session?.access_token) return;
    
    setSubmitting(true);
    try {
      const res = await apiClient.post("/api/v1/support/tickets", {
        subject: `[${issueType}] ${subject}`,
        message,
        priority: getPriority(issueType)
      }, session.access_token);
      
      if (res.success) {
        setShowNewTicket(false);
        setSubject("");
        setMessage("");
        setIssueType("Technical Support");
        await fetchTickets();
      } else {
        alert("Failed to submit ticket.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">
        
        {/* ── Top Navigation Row (Figma Style) ── */}
        <div className="flex flex-col md:flex-row justify-start md:justify-between items-start md:items-center w-full h-auto md:h-12 gap-4 md:gap-6">
          {/* Title */}
          <h1 className="font-sans font-semibold text-[24px] md:text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary dark:text-t-primary">
            Platform Support & Helpdesk
          </h1>

          {/* Navigation Items (Right Side) */}
          <div className="flex flex-row flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Box */}
            <div className="flex flex-row items-center bg-b-surface2 border border-s-stroke2 rounded-[10px] px-3 py-2 flex-1 md:flex-none md:w-[315px] h-12 gap-2 shadow-xs">
              <RiSearchLine size={20} className="text-t-secondary dark:text-t-tertiary shrink-0" />
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent border-none outline-none text-sm text-t-primary dark:text-t-primary placeholder-t-secondary w-full"
              />
            </div>

            {/* Bell Button */}
            <button className="btn btn-outline w-12 h-12 !px-0 rounded-[10px] flex items-center justify-center relative shrink-0 cursor-pointer">
              <RiNotification3Line size={20} />
              <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-primary-03" />
            </button>

            {/* Mail Button */}
            <button className="btn btn-outline w-12 h-12 !px-0 rounded-[10px] flex items-center justify-center shrink-0 cursor-pointer">
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-2 w-full gap-4 md:gap-0">
          <p className="text-sm text-t-secondary dark:text-t-tertiary max-w-[600px] leading-relaxed m-0">
            Facing technical issues or need to discuss your billing plan? Open a ticket to communicate directly with the Classphere Super Admin team.
          </p>
          <button 
            className="w-full md:w-auto justify-center btn btn-primary h-12 px-6 rounded-[10px] text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-[0px_4px_12px_rgba(42,133,255,0.25)]" 
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
          <PremiumCard className="w-full mt-4 animate-in slide-in-from-top-4 fade-in !p-0">
            
            <div className="relative z-10 flex flex-col p-8 bg-b-surface2 dark:bg-b-surface2 border-t-4 border-t-[#2A85FF] border-x border-b border-x-s-stroke2/40 border-b-s-stroke2/40">
              <h2 className="font-sans font-bold text-[24px] text-t-primary dark:text-t-primary mb-6 mt-0">Submit a Request</h2>
              
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-t-primary dark:text-t-primary">Issue Type</label>
                  <select 
                    className="bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 rounded-[10px] h-12 px-4 text-sm text-t-primary dark:text-t-primary outline-none focus:border-primary-01 focus:ring-1 focus:ring-[#2A85FF] w-full md:max-w-[300px] cursor-pointer appearance-none"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                  >
                    <option value="Technical Support">Technical Support</option>
                    <option value="Billing & Upgrades">Billing & Upgrades</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-t-primary dark:text-t-primary">Subject</label>
                  <input 
                    type="text" 
                    className="bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 rounded-[10px] h-12 px-4 text-sm text-t-primary dark:text-t-primary outline-none focus:border-primary-01 focus:ring-1 focus:ring-[#2A85FF] w-full placeholder:text-t-secondary" 
                    placeholder="Brief summary of the issue..." 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-t-primary dark:text-t-primary">Description</label>
                  <textarea 
                    className="bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 rounded-[10px] py-3 px-4 text-sm text-t-primary dark:text-t-primary outline-none focus:border-primary-01 focus:ring-1 focus:ring-[#2A85FF] w-full min-h-[120px] resize-y placeholder:text-t-secondary" 
                    placeholder="Please provide as much detail as possible..." 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end mt-2">
                  <button 
                    className="btn btn-primary h-10 px-6 rounded-[10px] text-sm font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-2" 
                    onClick={handleSubmitTicket}
                    disabled={submitting || !subject.trim() || !message.trim()}
                  >
                    {submitting && <RiLoader4Line size={16} className="animate-spin" />}
                    Submit Ticket
                  </button>
                </div>
              </div>
            </div>
          </PremiumCard>
        )}

        {/* Tickets List Container */}
        <PremiumSectionCard title="Your Tickets" className="mt-2 w-full">
          <div className="relative z-10 flex flex-col gap-2 w-full min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-t-secondary gap-2">
                <RiLoader4Line size={24} className="animate-spin text-primary-01" />
                <span className="font-sans text-sm font-medium">Loading tickets...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <RiTicketLine size={48} className="text-s-stroke2 mb-4" />
                <span className="font-sans text-[15px] font-semibold text-t-primary">No Tickets Open</span>
                <span className="font-sans text-sm text-t-secondary mt-1">If you need help, feel free to create a new ticket above.</span>
              </div>
            ) : tickets.map((ticket) => {
              // Map DB status 'open' or 'Open' appropriately
              const isOpen = ticket.status?.toLowerCase() === "open" || ticket.status?.toLowerCase() === "in progress";
              const statusDisplay = ticket.status ? (ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)) : "Open";
              
              const iconBgClass = isOpen ? "bg-primary-01/10 text-primary-01" : "bg-primary-02/10 text-primary-02";
              const statusBadgeClass = isOpen 
                ? "bg-primary-01/5 border-primary-01/15 text-primary-01" 
                : "bg-primary-02/5 border-primary-02/15 text-primary-02";
              const priorityBadgeClass = ticket.priority?.toLowerCase() === "high"
                ? "bg-primary-03/5 border-primary-03/15 text-primary-03"
                : "bg-t-secondary/10 border-t-secondary/20 text-t-secondary";

              return (
                <div 
                  key={ticket.id}
                  className="group/item relative flex flex-row items-center p-3 sm:p-4 gap-3 sm:gap-6 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all h-[76px] sm:h-[88px] cursor-pointer w-full overflow-hidden"
                >
                  {/* Left: Icon & Details */}
                  <div className="flex flex-row items-center gap-3 sm:gap-5 flex-1 min-w-0">
                    <div className={`flex size-10 sm:w-12 sm:h-12 items-center justify-center rounded-[12px] shrink-0 ${iconBgClass}`}>
                      <RiTicketLine size={24} className="scale-75 sm:scale-100" />
                    </div>
                    
                    <div className="min-w-0 flex flex-col justify-center">
                      <div className="flex flex-row items-center gap-2 sm:gap-3">
                        <span className="font-sans font-semibold text-[13px] sm:text-[16px] text-t-primary dark:text-t-primary truncate">
                          {ticket.subject}
                        </span>
                        <span className={`hidden sm:inline-flex px-2 py-0.5 border rounded-md text-[10px] font-bold leading-none ${statusBadgeClass}`}>
                          {statusDisplay}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                        <span className="text-[11px] sm:text-xs font-semibold text-t-primary dark:text-t-primary truncate max-w-[80px] sm:max-w-[120px]">
                          {ticket.id.split('-')[0]}
                        </span>
                        <span className="text-[11px] sm:text-xs text-s-stroke2 dark:text-s-stroke2">•</span>
                        <span className="text-[11px] sm:text-xs text-t-secondary dark:text-t-tertiary flex items-center gap-1">
                          <RiTimeLine size={12} className="hidden sm:block" /> {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Priority & Status (Mobile fallback) */}
                  <div className="flex flex-col items-end justify-center gap-1 shrink-0">
                    <span className={`px-2 py-0.5 sm:py-1 border rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${priorityBadgeClass}`}>
                      {ticket.priority || "Medium"} <span className="hidden sm:inline">Priority</span>
                    </span>
                    <span className={`sm:hidden px-2 py-0.5 border rounded-md text-[9px] font-bold uppercase tracking-wider ${statusBadgeClass}`}>
                      {statusDisplay}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        </PremiumSectionCard>

      </main>
    </>
  );
}
