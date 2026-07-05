"use client";

import Navbar from "@/components/layout/Navbar";
import { useState, useRef, useEffect } from "react";
import {
  RiSendPlaneFill,
  RiImageAddLine,
  RiCheckDoubleLine,
  RiSearchLine,
  RiGroupLine,
  RiQuestionLine,
  RiArrowDownSLine,
  RiQuestionAnswerLine,
  RiCloseLine,
  RiUserLine,
  RiShieldCheckLine,
} from "@remixicon/react";

interface Message {
  id: number;
  author: string;
  studentName?: string; // real name behind Anonymous
  role: string;
  isOwn: boolean;
  text: string;
  time: string;
  isVerified: boolean;
  isDoubt?: boolean;
  upvotes: number;
}

interface ChatGroup {
  id: string;
  name: string;
  lastMessageTime: string;
  lastMessageSender: string;
  lastMessageText: string;
  membersCount: number;
  facultyCount: number;
  activeDoubts: number;
  resolvedDoubts: number;
  activeTrend: string;
  resolvedTrend: string;
}

const initialGroups: ChatGroup[] = [
  {
    id: "jee-morning",
    name: "JEE 2026 Morning",
    lastMessageTime: "11:22 AM",
    lastMessageSender: "Priya",
    lastMessageText: "PCl5 is another common example...",
    membersCount: 145,
    facultyCount: 3,
    activeDoubts: 141,
    resolvedDoubts: 135,
    activeTrend: "+12%",
    resolvedTrend: "+8%",
  },
  {
    id: "neet-droppers",
    name: "NEET 2026 Droppers",
    lastMessageTime: "Yesterday",
    lastMessageSender: "Riya",
    lastMessageText: "Does anyone have notes for Biology?",
    membersCount: 88,
    facultyCount: 2,
    activeDoubts: 42,
    resolvedDoubts: 94,
    activeTrend: "+5%",
    resolvedTrend: "+15%",
  },
];

const initialMessagesMap: Record<string, Message[]> = {
  "jee-morning": [
    { id: 1, author: "Rahul Verma", role: "student", isOwn: false, text: "Guys, how do we apply the Work-Energy Theorem in Q14 of yesterday's mock? Shouldn't friction be negative?", time: "10:30 AM", isVerified: false, isDoubt: true, upvotes: 2 },
    { id: 2, author: "Sneha Reddy", role: "student", isOwn: false, text: "Friction does negative work, yes. But if you move it to the right side of the equation (W_ext = ΔE), the sign flips.", time: "10:32 AM", isVerified: true, upvotes: 8 },
    { id: 3, author: "You", role: "teacher", isOwn: true, text: "Sneha is absolutely correct. W_c + W_nc = ΔK. Since W_nc = -f_k·d, when solving for ΔK + ΔU, it becomes positive on the other side. +10 Rep to Sneha.", time: "10:45 AM", isVerified: false, upvotes: 12 },
    { id: 4, author: "Anonymous", studentName: "Arjun Mehta", role: "student", isOwn: false, text: "Can someone explain the exceptions to the Octet rule for expanding valence shells? I'm getting confused with SF6.", time: "11:15 AM", isVerified: false, isDoubt: true, upvotes: 1 },
    { id: 5, author: "Vikram Singh", role: "student", isOwn: false, text: "Elements in the 3rd period and beyond have empty d-orbitals. Sulfur in SF6 uses its 3d orbitals to accommodate 12 electrons.", time: "11:20 AM", isVerified: false, upvotes: 3 },
    { id: 6, author: "Priya Sharma", role: "student", isOwn: false, text: "Yeah, PCl5 is another common example. Phosphorus has 10 valence electrons there.", time: "11:22 AM", isVerified: false, upvotes: 2 },
  ],
  "neet-droppers": [
    { id: 101, author: "Riya Sen", role: "student", isOwn: false, text: "Hey, are the topics for this weekend's foundation test announced?", time: "09:15 AM", isVerified: false, upvotes: 1 },
    { id: 102, author: "Pranav Gupta", role: "student", isOwn: false, text: "Cell structure in bio and basic kinematics in physics.", time: "09:18 AM", isVerified: false, upvotes: 3 },
    { id: 103, author: "Riya Sen", role: "student", isOwn: false, text: "Does anyone have notes for Biology?", time: "Yesterday", isVerified: false, isDoubt: true, upvotes: 0 },
  ],
};

type FilterTab = "all" | "doubts";

export default function TeacherDoubtsPage() {
  const [groups] = useState<ChatGroup[]>(initialGroups);
  const [activeGroupId, setActiveGroupId] = useState("jee-morning");
  const [messagesMap, setMessagesMap] = useState(initialMessagesMap);
  const [inputValue, setInputValue] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [showDropdown, setShowDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [revealedStudents, setRevealedStudents] = useState<Set<number>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
  const allMessages = messagesMap[activeGroupId] || [];
  const activeMessages = filterTab === "doubts" ? allMessages.filter(m => m.isDoubt) : allMessages;
  const pendingDoubts = allMessages.filter(m => m.isDoubt && !m.isVerified).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleEndorse = (id: number) => {
    setMessagesMap(prev => ({
      ...prev,
      [activeGroupId]: prev[activeGroupId].map(m =>
        m.id === id ? { ...m, isVerified: true } : m
      ),
    }));
    showToast("Answer endorsed as correct solution.");
  };

  const handleRevealStudent = (id: number) => {
    setRevealedStudents(prev => new Set(prev).add(id));
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMsg: Message = {
      id: Date.now(),
      author: "You",
      role: "teacher",
      isOwn: true,
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isVerified: false,
      upvotes: 0,
    };
    setMessagesMap(prev => ({
      ...prev,
      [activeGroupId]: [...(prev[activeGroupId] || []), newMsg],
    }));
    setInputValue("");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  return (
    <div className="flex flex-col min-h-screen bg-b-surface1 dark:bg-b-surface1/60 pb-10">

      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-shade-02 text-t-light text-xs font-sans font-semibold rounded-lg shadow-lg border border-s-stroke2/20">
          <div className="size-2 rounded-full bg-primary-02 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Navbar title="Batch Doubts" subtitle="Monitor, endorse, and respond to student doubts across all batches." breadcrumbs="Dashboard › Doubts" className="max-w-[1068px]" />

      <main className="mx-auto w-full max-w-screen-2xl px-4 pt-12 md:px-6 flex justify-center bg-transparent select-none">

        <div className="w-[1068px] h-[780px] bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/40 rounded-lg p-3 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] flex flex-col gap-4 overflow-hidden relative">

          {/* Header Row */}
          <div className="flex flex-row justify-between items-center w-full h-12 relative px-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <h6 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Doubts Moderation
              </h6>
              {pendingDoubts > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-primary-03/10 border border-primary-03/20 text-primary-03 text-[11px] font-bold">
                  {pendingDoubts} pending
                </span>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex flex-row justify-between items-center px-5 py-3 h-12 w-[190px] border-[1.5px] border-s-stroke2 dark:border-s-stroke2 rounded-lg bg-transparent text-left cursor-pointer transition-all hover:bg-b-surface1 dark:hover:bg-b-surface1"
              >
                <span className="font-sans text-[14px] font-normal text-t-secondary dark:text-t-secondary truncate">{activeGroup.name}</span>
                <RiArrowDownSLine size={20} className="text-t-secondary shrink-0" />
              </button>
              {showDropdown && (
                <div className="absolute right-0 top-14 w-[190px] bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/40 rounded-lg shadow-lg z-25 overflow-hidden">
                  {groups.map(g => (
                    <div
                      key={g.id}
                      onClick={() => { setActiveGroupId(g.id); setShowDropdown(false); }}
                      className={`p-3 text-xs font-sans font-semibold cursor-pointer transition-colors ${g.id === activeGroupId ? "bg-b-surface1 text-t-primary" : "hover:bg-b-surface1 text-t-secondary"}`}
                    >
                      {g.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex flex-row items-center p-2 gap-4 w-full h-[135px] bg-b-surface1 dark:bg-b-surface1/20 border-[1.5px] border-s-stroke2/40 rounded-lg shrink-0">

            <div className="flex flex-col items-start py-3 px-8 gap-1 flex-grow h-[119px] bg-b-surface2 dark:bg-b-surface2 border-[1.5px] border-s-border dark:border-s-stroke2/20 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
              <div className="flex items-center gap-2.5">
                <RiQuestionAnswerLine size={20} className="text-t-primary dark:text-t-primary" />
                <span className="font-sans font-semibold text-[15px] text-t-primary dark:text-t-primary">Active Doubts</span>
              </div>
              <div className="flex items-center gap-4 mt-0.5">
                <span className="font-sans font-medium text-[42px] leading-none tracking-[-0.005em] text-t-primary dark:text-t-primary">{activeGroup.activeDoubts}</span>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center px-2 py-[2px] bg-[rgba(255,106,85,0.05)] border-[1.5px] border-s-stroke2/40 rounded-md">
                    <span className="font-sans font-semibold text-[12px] text-primary-03">{activeGroup.activeTrend}</span>
                  </div>
                  <span className="font-sans text-[12px] text-t-secondary">from yesterday</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start py-3 px-8 gap-1 flex-grow h-[119px] bg-b-surface2 dark:bg-b-surface2 border-[1.5px] border-s-border dark:border-s-stroke2/20 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
              <div className="flex items-center gap-2.5">
                <RiCheckDoubleLine size={20} className="text-t-primary dark:text-t-primary" />
                <span className="font-sans font-semibold text-[15px] text-t-primary dark:text-t-primary">Resolved Doubts</span>
              </div>
              <div className="flex items-center gap-4 mt-0.5">
                <span className="font-sans font-medium text-[42px] leading-none tracking-[-0.005em] text-t-primary dark:text-t-primary">{activeGroup.resolvedDoubts}</span>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center px-2 py-[2px] bg-[rgba(0,166,86,0.05)] border-[1.5px] border-s-stroke2/40 rounded-md">
                    <span className="font-sans font-semibold text-[12px] text-primary-02">{activeGroup.resolvedTrend}</span>
                  </div>
                  <span className="font-sans text-[12px] text-t-secondary">from last week</span>
                </div>
              </div>
            </div>

          </div>

          {/* Workspace */}
          <div className="flex-grow flex flex-row border border-s-stroke2/20 rounded-lg overflow-hidden min-h-0">

            {/* Sidebar */}
            <div className="w-[260px] border-r border-s-stroke2/10 bg-b-surface1 dark:bg-b-surface1/20 flex flex-col shrink-0">
              <div className="p-3 border-b border-s-stroke2/10 bg-b-surface2 dark:bg-b-surface2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-t-secondary"><RiSearchLine size={16} /></span>
                  <input
                    type="text"
                    placeholder="Search groups..."
                    className="w-full pl-9 pr-3 h-9 rounded-lg border border-s-stroke2/30 bg-b-surface1 dark:bg-b-surface1/60 text-xs font-sans focus:outline-none focus:border-t-primary transition-all font-semibold placeholder-t-secondary"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
                {groups.map(group => {
                  const isActive = group.id === activeGroupId;
                  const pending = (initialMessagesMap[group.id] || []).filter(m => m.isDoubt && !m.isVerified).length;
                  return (
                    <div
                      key={group.id}
                      onClick={() => setActiveGroupId(group.id)}
                      className={`p-3 flex gap-3 cursor-pointer rounded-lg transition-all border ${isActive ? "bg-b-surface2 dark:bg-b-surface2 border-l-4 border-l-t-primary border-s-stroke2/20 shadow-xs" : "bg-transparent border-transparent hover:bg-b-surface2/50"}`}
                    >
                      <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-shade-02 text-t-light" : "bg-b-surface2 text-t-secondary border border-s-stroke2/20"}`}>
                        <RiGroupLine size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-sans font-bold text-[13px] text-t-primary dark:text-t-primary truncate">{group.name}</span>
                          {pending > 0 && (
                            <span className="shrink-0 ml-1 size-4 rounded-full bg-primary-03 text-white text-[9px] font-bold flex items-center justify-center">{pending}</span>
                          )}
                        </div>
                        <p className="text-[11px] font-sans text-t-secondary truncate">
                          <span className="font-bold text-t-primary dark:text-t-primary">{group.lastMessageSender}:</span> {group.lastMessageText}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat Pane */}
            <div className="flex-1 flex flex-col bg-b-surface2 dark:bg-b-surface2 min-w-0">

              {/* Chat Header with filter tabs */}
              <div className="h-14 px-4 border-b border-s-stroke2/10 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-sans font-bold text-[14px] text-t-primary dark:text-t-primary">{activeGroup.name}</h2>
                  <span className="text-[10.5px] font-sans text-t-secondary">{activeGroup.membersCount} Members · {activeGroup.facultyCount} Faculty Online</span>
                </div>
                {/* Filter tabs */}
                <div className="flex items-center gap-1 bg-b-surface1 dark:bg-b-surface1/40 border border-s-stroke2/20 rounded-lg p-1">
                  {(["all", "doubts"] as FilterTab[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setFilterTab(tab)}
                      className={`px-3 h-7 rounded-lg text-[11px] font-sans font-semibold capitalize transition-all cursor-pointer border-0 ${filterTab === tab ? "bg-shade-02 text-t-light shadow-xs" : "bg-transparent text-t-secondary hover:text-t-primary"}`}
                    >
                      {tab === "doubts" ? `Doubts${pendingDoubts > 0 ? ` (${pendingDoubts})` : ""}` : "All Messages"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3 bg-b-surface1/40 dark:bg-b-surface1/10 min-h-0">
                {activeMessages.map(msg => {
                  const isRevealed = revealedStudents.has(msg.id);
                  const displayName = (msg.author === "Anonymous" && isRevealed && msg.studentName) ? msg.studentName : msg.author;
                  return (
                    <div
                      key={msg.id}
                      className={`p-4 flex gap-4 rounded-lg transition-all relative border ${
                        msg.isDoubt && !msg.isVerified
                          ? "bg-primary-03/5 border-primary-03/20"
                          : msg.isVerified
                          ? "bg-primary-02/5 border-primary-02/20"
                          : "bg-transparent border-transparent border-b border-s-stroke2/10 hover:bg-b-surface2 hover:shadow-[inset_0px_0px_0px_3px_#FFFFFF]"
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`size-11 rounded-full flex items-center justify-center shrink-0 font-sans font-bold text-sm ${
                        msg.role === "teacher"
                          ? "bg-primary-02/10 text-primary-02 border border-primary-02/20"
                          : "bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/20 text-t-primary"
                      }`}>
                        {msg.author === "Anonymous" && !isRevealed ? "?" : displayName[0]}
                      </div>

                      {/* Content */}
                      <div className="flex-grow min-w-0 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-sans font-semibold text-[15px] text-t-primary dark:text-t-primary">{displayName}</span>
                            {msg.role === "teacher" && (
                              <span className="px-2 py-0.5 rounded-md border border-s-stroke2/40 bg-[rgba(0,166,86,0.05)] text-primary-02 text-[8px] font-bold uppercase tracking-wider">FACULTY</span>
                            )}
                            {msg.isDoubt && !msg.isVerified && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] text-primary-03 text-[9px] font-bold uppercase tracking-wider">
                                <RiQuestionLine size={10} /> Unresolved Doubt
                              </span>
                            )}
                            {/* Teacher-only: reveal anon student */}
                            {msg.author === "Anonymous" && !isRevealed && (
                              <button
                                onClick={() => handleRevealStudent(msg.id)}
                                title="Reveal student identity"
                                className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-s-stroke2/40 bg-[rgba(42,133,255,0.05)] text-primary-01 text-[9px] font-bold uppercase tracking-wider cursor-pointer hover:bg-[rgba(42,133,255,0.1)] transition-all"
                              >
                                <RiUserLine size={9} /> Reveal
                              </button>
                            )}
                          </div>
                          <span className="text-[12px] font-sans text-t-secondary shrink-0">{msg.time}</span>
                        </div>

                        <p className="font-sans text-[15px] leading-[150%] text-t-primary dark:text-t-primary">{msg.text}</p>

                        {/* Actions row */}
                        <div className="flex items-center justify-between gap-4 mt-0.5">
                          {msg.isVerified ? (
                            <div className="flex items-center gap-1.5 text-primary-02">
                              <RiCheckDoubleLine size={14} />
                              <span className="text-[11px] font-sans font-bold">Endorsed Answer</span>
                            </div>
                          ) : (
                            /* Endorse button — only for student messages */
                            !msg.isOwn && msg.role === "student" ? (
                              <button
                                onClick={() => handleEndorse(msg.id)}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-primary-02/25 bg-primary-02/5 text-primary-02 text-[11px] font-sans font-bold hover:bg-primary-02/10 transition-all active:scale-95 cursor-pointer"
                              >
                                <RiShieldCheckLine size={12} /> Endorse Answer
                              </button>
                            ) : <div />
                          )}
                          <span className="text-[11px] font-sans text-t-secondary">{msg.upvotes} upvotes</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Input Bar */}
              <div className="p-3 bg-b-surface2 dark:bg-b-surface2 border-t border-s-stroke2/20 flex gap-2.5 items-center shrink-0">
                <button className="flex items-center justify-center size-9 rounded-full text-t-secondary hover:text-t-primary hover:bg-b-surface1 border border-s-stroke2/20 bg-b-surface2 transition-all cursor-pointer shrink-0">
                  <RiImageAddLine size={18} />
                </button>
                <div className="flex-grow">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Post an official faculty response..."
                    className="w-full pl-4 pr-3 h-9 rounded-lg border border-s-stroke2/30 bg-b-surface1 dark:bg-b-surface1/60 text-xs font-sans focus:outline-none focus:border-t-primary transition-all font-semibold placeholder-t-secondary text-t-primary"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className={`size-9 rounded-full border-none flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                    inputValue.trim()
                      ? "bg-shade-02 hover:bg-shade-04 text-t-light"
                      : "bg-s-stroke2 text-t-secondary cursor-not-allowed"
                  }`}
                >
                  <RiSendPlaneFill size={16} />
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
