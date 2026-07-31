"use client";

import Navbar from "@/components/layout/Navbar";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { Modal } from "@/components/shared/Modal";
import { 
  RiSearchLine, 
  RiFilter3Line, 
  RiCustomerService2Fill, 
  RiTimeLine,
  RiArrowDownSLine,
  RiArrowRightUpLine,
  RiMailLine,
  RiLoader4Line
} from "@remixicon/react";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api.client";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { useAuth } from "@/lib/auth-context";

export default function SupportPage() {
  const { session } = useAuth();
  const token = session?.access_token;

  const queryClient = useQueryClient();
  const TICKETS_PATH = "/api/v1/superadmin/tickets";
  const { data: tickets = [], isPending: loading } = useApiQuery<any[]>(TICKETS_PATH);

  // Filters
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal / Conversation details
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  // Replies are per-ticket and disabled until one is open, so opening a ticket
  // you have already looked at renders its thread straight from cache.
  const repliesPath = selectedTicket ? `/api/v1/superadmin/tickets/${selectedTicket.id}/replies` : null;
  const { data: ticketReplies = [], isLoading: loadingReplies } = useApiQuery<any[]>(repliesPath);
  const [replyMessage, setReplyMessage] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [ticketStatus, setTicketStatus] = useState("");
  const [ticketPriority, setTicketPriority] = useState("");

  // Replying or changing status alters the ticket row, so the list is dropped
  // rather than patched — status and priority are derived server-side.
  const fetchTickets = () => queryClient.invalidateQueries({ queryKey: [TICKETS_PATH] });
  const loadReplies = (ticketId: string) =>
    queryClient.invalidateQueries({ queryKey: [`/api/v1/superadmin/tickets/${ticketId}/replies`] });

  const handleOpenTicketDetails = (ticket: any) => {
    setSelectedTicket(ticket);
    setTicketStatus(ticket.status);
    setTicketPriority(ticket.priority);
    setReplyMessage("");
  };

  const handleUpdateTicket = async (status: string, priority: string) => {
    if (!selectedTicket || !token) return;
    try {
      const res = await apiClient.patch<{ success: boolean; data: any }>(
        `/api/v1/superadmin/tickets/${selectedTicket.id}`,
        { status, priority },
        token
      );
      if (res.success) {
        setTicketStatus(res.data.status);
        setTicketPriority(res.data.priority);
        // Refresh the main tickets list
        await fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim() || !token) return;
    setSubmittingReply(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: any }>(
        `/api/v1/superadmin/tickets/${selectedTicket.id}/replies`,
        { message: replyMessage },
        token
      );
      if (res.success) {
        setReplyMessage("");
        setTicketStatus("in_progress"); // Auto updates status on backend
        await loadReplies(selectedTicket.id);
        await fetchTickets();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReply(false);
    }
  };

  // Filtered lists
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = !search || 
      ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
      (ticket.institute?.name && ticket.institute.name.toLowerCase().includes(search.toLowerCase())) ||
      ticket.id.toLowerCase().includes(search.toLowerCase());
      
    const matchesPriority = !priorityFilter || ticket.priority.toLowerCase() === priorityFilter.toLowerCase();
    const matchesStatus = !statusFilter || ticket.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Dynamically calculate KPIs
  const openCount = tickets.filter(t => t.status.toLowerCase() === "open" || t.status.toLowerCase() === "in_progress" || t.status.toLowerCase() === "in progress").length;
  const resolvedCount = tickets.filter(t => t.status.toLowerCase() === "resolved").length;

  return (
    <>
      <Navbar title="Support & Escalations" subtitle="Manage B2B tickets, API issues, and platform escalations." />
      
      <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6">
        
        {/* KPI Cards */}
        <MetricGrid cols={3} className="mb-3">
          <MetricCard
            icon={<RiCustomerService2Fill size={20} />}
            label="Open Escalations"
            value={openCount}
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
            label="Resolved Escalations"
            value={resolvedCount}
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 bg-b-surface1 border border-s-stroke2/40 rounded-[10px] text-[14px] text-t-primary placeholder:text-t-secondary focus:border-t-primary outline-none transition-colors"
                />
              </div>
              
              <div className="relative">
                <select 
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="h-11 pl-4 pr-10 appearance-none rounded-[10px] bg-b-surface1 border border-s-stroke2/40 text-[14px] font-medium text-t-primary hover:bg-s-stroke2/30 transition-colors outline-none cursor-pointer"
                >
                  <option value="">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
                <RiArrowDownSLine size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
              </div>
              
              <div className="relative">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 pl-4 pr-10 appearance-none rounded-[10px] bg-b-surface1 border border-s-stroke2/40 text-[14px] font-medium text-t-primary hover:bg-s-stroke2/30 transition-colors outline-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
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
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-10 text-t-secondary">
                <RiLoader4Line size={22} className="animate-spin text-primary-01" />
                <span className="font-sans font-semibold text-[14px]">Loading tickets...</span>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-10 text-center text-t-secondary font-sans text-sm">
                No support tickets found.
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleOpenTicketDetails(ticket)}
                  className="group/item relative flex flex-row items-center p-2.5 sm:p-3 gap-3 sm:gap-4 w-full bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all cursor-pointer overflow-hidden h-[76px] sm:h-[88px]"
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
                      ticket.priority.toLowerCase() === "high" 
                        ? "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] text-primary-03" 
                        : ticket.priority.toLowerCase() === "medium"
                        ? "bg-[rgba(255,159,10,0.08)] border-[rgba(255,159,10,0.2)] text-[#FF9F0A]"
                        : "bg-b-surface1 border-s-stroke2/40 text-t-secondary"
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-[10px] text-[9px] sm:text-[11px] font-bold uppercase tracking-wider border ${
                      ticket.status.toLowerCase() === "open" 
                        ? "bg-[rgba(10,132,255,0.08)] border-[rgba(10,132,255,0.2)] text-[#0A84FF]" 
                        : ticket.status.toLowerCase() === "in_progress" || ticket.status.toLowerCase() === "in progress"
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
              ))
            )}
          </div>
          
          {/* Pagination */}
          <div className="mt-4 pt-4 border-t border-s-stroke2/30 flex justify-between items-center text-sm font-medium text-t-secondary px-2">
            <div>
              Showing <span className="font-bold text-t-primary">{filteredTickets.length > 0 ? 1 : 0}</span> to <span className="font-bold text-t-primary">{filteredTickets.length}</span> of {filteredTickets.length} tickets
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

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <Modal
          open={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={`Ticket Detail: #${selectedTicket.id.split('-')[0]}`}
          maxWidth="max-w-[700px]"
        >
          <div className="flex flex-col gap-3">
            
            {/* Meta status modifiers */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-b-surface2 dark:bg-b-surface2/30 rounded-[12px] border border-s-stroke2/40">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-t-secondary mb-1">Institute Origin</span>
                <span className="text-[14px] font-bold text-t-primary">{selectedTicket.institute?.name || "Global / Standard User"}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <span className="block text-[10px] font-bold uppercase text-t-secondary mb-0.5">Status</span>
                  <select 
                    value={ticketStatus}
                    onChange={(e) => handleUpdateTicket(e.target.value, ticketPriority)}
                    className="h-9 px-3 pr-8 appearance-none rounded-[8px] bg-b-surface1 border border-s-stroke2/40 text-xs font-semibold text-t-primary outline-none cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <RiArrowDownSLine size={14} className="absolute right-2.5 top-[23px] text-t-secondary pointer-events-none" />
                </div>

                <div className="relative">
                  <span className="block text-[10px] font-bold uppercase text-t-secondary mb-0.5">Priority</span>
                  <select 
                    value={ticketPriority}
                    onChange={(e) => handleUpdateTicket(ticketStatus, e.target.value)}
                    className="h-9 px-3 pr-8 appearance-none rounded-[8px] bg-b-surface1 border border-s-stroke2/40 text-xs font-semibold text-t-primary outline-none cursor-pointer"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <RiArrowDownSLine size={14} className="absolute right-2.5 top-[23px] text-t-secondary pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Original message */}
            <div className="flex flex-col gap-2 p-5 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px]">
              <div className="flex justify-between items-center text-xs text-t-secondary font-semibold border-b border-s-stroke2/20 pb-2">
                <span>Subject: {selectedTicket.subject}</span>
                <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[14px] text-t-primary leading-relaxed font-medium mt-2 whitespace-pre-wrap">
                {selectedTicket.message}
              </p>
            </div>

            {/* Replies Thread */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-t-secondary">Conversation Thread</h3>
              
              {loadingReplies ? (
                <div className="flex items-center gap-2 py-4 text-t-secondary text-xs font-medium justify-center">
                  <RiLoader4Line size={16} className="animate-spin text-primary-01" />
                  <span>Loading messages...</span>
                </div>
              ) : ticketReplies.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-s-stroke2/40 rounded-[12px] text-t-secondary text-xs font-semibold">
                  No replies posted yet. Use the message input below to respond.
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                  {ticketReplies.map((reply) => {
                    const isAdmin = reply.author?.email !== selectedTicket.author?.email;
                    return (
                      <div 
                        key={reply.id}
                        className={`flex flex-col gap-1 p-3 rounded-[12px] border max-w-[85%] ${
                          isAdmin 
                            ? 'bg-b-surface1 border-s-stroke2/30 self-end text-right ml-auto' 
                            : 'bg-b-surface2 dark:bg-[#161616] border-s-stroke2/40 self-start text-left'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-[10px] text-t-secondary font-bold justify-between">
                          <span>{reply.author?.name || (isAdmin ? "Super Admin" : "User")}</span>
                          <span>{new Date(reply.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[13px] text-t-primary font-medium mt-1 whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form Response */}
            <form onSubmit={handlePostReply} className="flex flex-col gap-3 border-t border-s-stroke2/30 pt-4">
              <textarea
                rows={3}
                placeholder="Write reply message to the institute admin..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="w-full p-4 bg-b-surface1 border border-s-stroke2/40 rounded-[12px] text-[14px] text-t-primary focus:border-t-primary outline-none transition-colors resize-none placeholder:text-t-secondary"
              />
              <button
                type="submit"
                disabled={submittingReply || !replyMessage.trim()}
                className="flex items-center justify-center gap-2 h-11 rounded-[10px] border border-[#161616] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white text-[13px] font-bold shadow-[0px_4px_4px_-1px_rgba(0,0,0,0.16)] cursor-pointer disabled:opacity-50 transition-transform active:scale-[0.99] self-end px-6"
              >
                {submittingReply ? (
                  <RiLoader4Line size={16} className="animate-spin" />
                ) : (
                  <RiMailLine size={16} />
                )}
                Send Response
              </button>
            </form>

          </div>
        </Modal>
      )}
    </>
  );
}
