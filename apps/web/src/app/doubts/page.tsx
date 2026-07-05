"use client";

import Navbar from "@/components/layout/Navbar";
import { useState, useRef, useEffect } from "react";
import {
  RiSendPlaneFill,
  RiImageAddLine,
  RiCheckDoubleLine,
  RiSearchLine,
  RiMore2Fill,
  RiGroupLine,
  RiThumbUpLine,
  RiCloseLine,
  RiQuestionLine,
  RiArrowRightUpLine,
  RiArrowLeftLine,
  RiArrowDownSLine,
  RiQuestionAnswerLine,
  RiUserLine
} from "@remixicon/react";

interface Message {
  id: number;
  author: string;
  role: string;
  isOwn: boolean;
  text: string;
  time: string;
  isVerified: boolean;
  attachedImage?: string;
  isDoubt?: boolean;
  upvotes: number;
  hasUpvoted?: boolean;
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
    lastMessageSender: "You",
    lastMessageText: "Yeah, PCl5 is another common example. Phosphorus has...",
    membersCount: 145,
    facultyCount: 3,
    activeDoubts: 141,
    resolvedDoubts: 135,
    activeTrend: "+12%",
    resolvedTrend: "+8%"
  },
  {
    id: "aakash-foundation",
    name: "Aakash Foundation",
    lastMessageTime: "Yesterday",
    lastMessageSender: "Riya",
    lastMessageText: "Does anyone have notes for Biology?",
    membersCount: 88,
    facultyCount: 2,
    activeDoubts: 42,
    resolvedDoubts: 94,
    activeTrend: "+5%",
    resolvedTrend: "+15%"
  }
];

const initialMessages: Record<string, Message[]> = {
  "jee-morning": [
    { id: 1, author: "Rahul Verma", role: "student", isOwn: false, text: "Guys, how do we apply the Work-Energy Theorem in question 14 of yesterday's mock? Shouldn't friction be negative?", time: "10:30 AM", isVerified: false, upvotes: 2 },
    { id: 2, author: "Sneha Reddy", role: "student", isOwn: false, text: "Friction does negative work, yes. But if you move it to the right side of the equation (W_ext = Delta E), the sign flips.", time: "10:32 AM", isVerified: true, upvotes: 8 },
    { id: 3, author: "Aman Sir", role: "teacher", isOwn: false, text: "Sneha is absolutely correct. The net work done is W_c + W_nc = ΔK. Since W_nc = -f_k * d, when solving for ΔK + ΔU, it becomes positive on the other side. +10 Rep to Sneha.", time: "10:45 AM", isVerified: false, upvotes: 12 },
    { id: 4, author: "Anonymous", role: "student", isOwn: false, text: "[Doubt] Can someone explain the exceptions to the Octet rule for expanding valence shells? I'm getting confused with SF6.", time: "11:15 AM", isVerified: false, isDoubt: true, upvotes: 1 },
    { id: 5, author: "Vikram Singh", role: "student", isOwn: false, text: "Elements in the 3rd period and beyond have empty d-orbitals. Sulfur in SF6 uses its 3d orbitals to accommodate 12 electrons.", time: "11:20 AM", isVerified: false, upvotes: 3 },
    { id: 6, author: "You", role: "student", isOwn: true, text: "Yeah, PCl5 is another common example. Phosphorus has 10 valence electrons there.", time: "11:22 AM", isVerified: false, upvotes: 0 },
  ],
  "aakash-foundation": [
    { id: 101, author: "Riya Sen", role: "student", isOwn: false, text: "Hey everyone, are the topics for this weekend's foundation test announced yet?", time: "09:15 AM", isVerified: false, upvotes: 1 },
    { id: 102, author: "Pranav Gupta", role: "student", isOwn: false, text: "Yes, it is cell structure in biology and basic kinematics in physics.", time: "09:18 AM", isVerified: false, upvotes: 3 },
    { id: 103, author: "Riya Sen", role: "student", isOwn: false, text: "Does anyone have notes for Biology?", time: "Yesterday", isVerified: false, upvotes: 0 }
  ]
};

const groupMembers: Record<string, { name: string; avatarBg: string; initial: string }[]> = {
  "jee-morning": [
    { name: "Rahul Verma", avatarBg: "bg-[#FFD1D1] text-primary-03", initial: "R" },
    { name: "Sneha Reddy", avatarBg: "bg-[#D1F2E5] text-primary-02", initial: "S" },
    { name: "Aman Sir", avatarBg: "bg-[#FFEAD1] text-[#ECA20F]", initial: "A" },
    { name: "Vikram Singh", avatarBg: "bg-[#D1E0FF] text-[#3B82F6]", initial: "V" },
    { name: "Riya Sen", avatarBg: "bg-[#F3D1FF] text-[#A855F7]", initial: "R" },
    { name: "Pranav Gupta", avatarBg: "bg-s-stroke2 text-t-secondary", initial: "P" }
  ],
  "aakash-foundation": [
    { name: "Riya Sen", avatarBg: "bg-[#F3D1FF] text-[#A855F7]", initial: "R" },
    { name: "Pranav Gupta", avatarBg: "bg-s-stroke2 text-t-secondary", initial: "P" },
    { name: "Vikram Singh", avatarBg: "bg-[#D1E0FF] text-[#3B82F6]", initial: "V" },
    { name: "Sneha Reddy", avatarBg: "bg-[#D1F2E5] text-primary-02", initial: "S" }
  ]
};

export default function StudentChatPage() {
  const [groups, setGroups] = useState<ChatGroup[]>(initialGroups);
  const [activeGroupId, setActiveGroupId] = useState<string>("jee-morning");
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Image attachment simulation
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);

  const [showDropdown, setShowDropdown] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
  const activeMessages = messagesMap[activeGroupId] || [];
  const activeMembersList = groupMembers[activeGroupId] || [];

  // Filter groups in sidebar based on search query
  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = () => {
    if (!inputValue.trim() && !attachedImagePreview) return;

    const isTaggedDoubt = inputValue.toLowerCase().includes("[doubt]");

    const newMessage: Message = {
      id: Date.now(),
      author: "You",
      role: "student",
      isOwn: true,
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVerified: false,
      upvotes: 0,
      isDoubt: isTaggedDoubt || !!attachedImagePreview,
      attachedImage: attachedImagePreview || undefined
    };

    // Update message history
    const updatedMessages = [...activeMessages, newMessage];
    setMessagesMap({
      ...messagesMap,
      [activeGroupId]: updatedMessages
    });

    // Update last message in sidebar group
    setGroups(groups.map(g => {
      if (g.id === activeGroupId) {
        return {
          ...g,
          lastMessageTime: newMessage.time,
          lastMessageSender: "You",
          lastMessageText: newMessage.text || "Sent an attachment"
        };
      }
      return g;
    }));

    // Reset inputs
    setInputValue("");
    setAttachedImageName(null);
    setAttachedImagePreview(null);

    // Trigger simulated faculty/peer response after 1.5 seconds
    setTimeout(() => {
      const responses = [
        {
          author: "Aman Sir",
          role: "teacher",
          text: "Excellent follow-up. Let me double-check the calculations on this doubt for you.",
          isVerified: false
        },
        {
          author: "Sneha Reddy",
          role: "student",
          text: "That explanation makes total sense. Thanks for clarifying!",
          isVerified: true
        }
      ];

      const chosen = responses[Math.floor(Math.random() * responses.length)];

      const mockReply: Message = {
        id: Date.now() + 1,
        author: chosen.author,
        role: chosen.role,
        isOwn: false,
        text: chosen.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVerified: chosen.isVerified,
        upvotes: 0
      };

      setMessagesMap(prev => ({
        ...prev,
        [activeGroupId]: [...(prev[activeGroupId] || []), mockReply]
      }));

      setGroups(prevGroups => prevGroups.map(g => {
        if (g.id === activeGroupId) {
          return {
            ...g,
            lastMessageTime: mockReply.time,
            lastMessageSender: mockReply.author,
            lastMessageText: mockReply.text
          };
        }
        return g;
      }));
    }, 1500);
  };

  const triggerImageUpload = () => {
    setAttachedImageName("physics_diagram_q14.png");
    setAttachedImagePreview("https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400");
    showToast("Attached physics_diagram_q14.png to your doubt.");
  };

  const handleUpvote = (messageId: number) => {
    const updated = activeMessages.map(msg => {
      if (msg.id === messageId) {
        if (msg.hasUpvoted) {
          return { ...msg, upvotes: msg.upvotes - 1, hasUpvoted: false };
        } else {
          if (!msg.isOwn) {
            showToast(`${msg.author} gained +5 Reputation!`);
          }
          return { ...msg, upvotes: msg.upvotes + 1, hasUpvoted: true };
        }
      }
      return msg;
    });

    setMessagesMap({
      ...messagesMap,
      [activeGroupId]: updated
    });
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  return (
    <div className="flex flex-col min-h-screen bg-b-surface1 dark:bg-b-surface1/60 pb-10">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-shade-02 text-t-light dark:bg-t-primary dark:text-b-surface1 text-xs font-sans font-semibold rounded-lg shadow-lg border border-s-stroke2/20 animate-slide-in">
          <div className="size-2 rounded-full bg-primary-02 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Navbar title="Ask a Doubt" subtitle="Discuss test questions, clear doubts, and collaborate with classmates." breadcrumbs="Dashboard > Doubts" className="max-w-[1068px]" />

      <main className="mx-auto w-full max-w-screen-2xl px-4 pt-12 md:px-6 flex justify-center bg-transparent select-none">

        {/* Main Figma Dashboard overview card container (Width: 1068px, Expanded Height: 780px to fit Stats + Chat Workspace) */}
        <div className="w-[1068px] h-[780px] bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/40 rounded-lg p-3 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] flex flex-col gap-4 overflow-hidden relative">

          {/* Widget Header/dropdown */}
          <div className="flex flex-row justify-between items-center w-full h-12 relative px-2.5 shrink-0">
            {/* Header Title */}
            <div className="flex flex-row items-center gap-2">
              <h6 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Doubts
              </h6>
            </div>

            {/* Filter Selector Dropdown Pill */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex flex-row justify-between items-center px-5 py-3 h-12 w-[180px] border-[1.5px] border-s-stroke2 dark:border-s-stroke2 rounded-lg bg-transparent text-left cursor-pointer transition-all hover:bg-b-surface1 dark:hover:bg-b-surface1"
              >
                <span className="font-sans text-[14px] font-normal leading-[150%] tracking-[0.0025em] text-t-secondary dark:text-t-secondary truncate">
                  {activeGroup.name}
                </span>
                <RiArrowDownSLine size={20} className="text-t-secondary shrink-0" />
              </button>

              {/* Dropdown Options List */}
              {showDropdown && (
                <div className="absolute right-0 top-14 w-[180px] bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/40 rounded-lg shadow-lg z-25 overflow-hidden">
                  {groups.map(g => (
                    <div
                      key={g.id}
                      onClick={() => {
                        setActiveGroupId(g.id);
                        setShowDropdown(false);
                      }}
                      className={`p-3 text-xs font-sans font-semibold cursor-pointer transition-colors ${g.id === activeGroupId
                          ? "bg-b-surface1 dark:bg-b-surface1/60 text-t-primary dark:text-t-primary"
                          : "hover:bg-b-surface1 dark:hover:bg-b-surface1/30 text-t-secondary dark:text-t-secondary"
                        }`}
                    >
                      {g.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats Section */}
          <div className="flex flex-row items-center p-2 gap-4 w-full h-[135px] bg-b-surface1 dark:bg-b-surface1/20 border-[1.5px] border-s-stroke2/40 rounded-lg shrink-0">

            {/* Active Doubts Stat Card */}
            <div className="flex flex-col items-start py-3 px-8 gap-1 flex-grow h-[119px] bg-b-surface2 dark:bg-b-surface2 border-[1.5px] border-s-border dark:border-s-stroke2/20 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
              <div className="flex flex-row items-center gap-2.5 w-full">
                <RiQuestionAnswerLine size={20} className="text-t-primary dark:text-t-primary" />
                <span className="font-sans font-semibold text-[15px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                  Active Doubts
                </span>
              </div>
              <div className="flex flex-row items-center gap-4 w-full mt-0.5">
                <span className="font-sans font-medium text-[42px] leading-none tracking-[-0.005em] text-t-primary dark:text-t-primary">
                  {activeGroup.activeDoubts}
                </span>
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex flex-row justify-center items-center px-2 py-[2px] gap-1 h-5.5 bg-[rgba(255,106,85,0.05)] border-[1.5px] border-s-stroke2/40 rounded-md">
                    <span className="font-sans font-semibold text-[12px] leading-none text-primary-03">
                      {activeGroup.activeTrend}
                    </span>
                  </div>
                  <span className="font-sans text-[12px] leading-[150%] tracking-[0.0025em] text-t-secondary">
                    from yesterday
                  </span>
                </div>
              </div>
            </div>

            {/* Resolved Doubts Stat Card */}
            <div className="flex flex-col items-start py-3 px-8 gap-1 flex-grow h-[119px] rounded-lg bg-transparent">
              <div className="flex flex-row items-center gap-2.5 w-full">
                <RiCheckDoubleLine size={20} className="text-t-secondary dark:text-t-secondary" />
                <span className="font-sans font-semibold text-[15px] leading-[150%] tracking-[0.0015em] text-t-secondary dark:text-t-secondary">
                  Resolved Doubts
                </span>
              </div>
              <div className="flex flex-row items-center gap-4 w-full mt-0.5">
                <span className="font-sans font-medium text-[42px] leading-none tracking-[-0.005em] text-t-primary dark:text-t-primary">
                  {activeGroup.resolvedDoubts}
                </span>
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex flex-row justify-center items-center px-2 py-[2px] gap-1 h-5.5 bg-[rgba(0,166,86,0.05)] border-[1.5px] border-s-stroke2/40 rounded-md">
                    <span className="font-sans font-semibold text-[12px] leading-none text-primary-02">
                      {activeGroup.resolvedTrend}
                    </span>
                  </div>
                  <span className="font-sans text-[12px] leading-[150%] tracking-[0.0025em] text-t-secondary">
                    from last week
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Unified Chat Workspace Section */}
          <div className="flex-grow flex flex-row border border-s-stroke2/20 rounded-lg overflow-hidden min-h-0">

            {/* Sidebar: Chat Groups List */}
            <div className="w-[300px] border-r border-s-stroke2/10 bg-b-surface1 dark:bg-b-surface1/20 flex flex-col shrink-0">
              <div className="p-3 border-b border-s-stroke2/10 bg-b-surface2 dark:bg-b-surface2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-t-secondary">
                    <RiSearchLine size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 h-9 rounded-lg border border-s-stroke2/30 bg-b-surface1 dark:bg-b-surface1/60 text-xs font-sans focus:outline-none focus:border-t-primary dark:focus:border-t-primary transition-all font-semibold placeholder-t-secondary"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
                {filteredGroups.map(group => {
                  const isActive = group.id === activeGroupId;
                  return (
                    <div
                      key={group.id}
                      onClick={() => setActiveGroupId(group.id)}
                      className={`p-3 flex gap-3 cursor-pointer rounded-lg transition-all border ${isActive
                          ? "bg-b-surface2 dark:bg-b-surface2 border-l-4 border-l-t-primary dark:border-l-t-primary border-s-stroke2/20 shadow-xs"
                          : "bg-transparent border-transparent hover:bg-b-surface2/50"
                        }`}
                    >
                      <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-shade-02 dark:bg-t-primary text-t-light dark:text-b-surface1" : "bg-b-surface2 text-t-secondary border border-s-stroke2/20"
                        }`}>
                        <RiGroupLine size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="font-sans font-bold text-[13px] text-t-primary dark:text-t-primary truncate">{group.name}</span>
                          <span className="text-[10px] font-sans text-t-secondary">{group.lastMessageTime}</span>
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

              {/* Chat Header containing the Avatars Row from Figma specifications */}
              <div className="h-14 px-4 border-b border-s-stroke2/10 flex items-center justify-between shrink-0">
                <div className="min-w-0 flex flex-col justify-center">
                  <h2 className="font-sans font-bold text-[14px] text-t-primary dark:text-t-primary truncate">
                    {activeGroup.name} (Doubts)
                  </h2>
                  <span className="text-[10.5px] font-sans text-t-secondary mt-0.5 leading-none">
                    {activeGroup.membersCount} Active Members · {activeGroup.facultyCount} Faculty Online
                  </span>
                </div>

                {/* Horizontal Member Avatars Row */}
                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex -space-x-2.5 overflow-hidden">
                    {activeMembersList.slice(0, 4).map((member, idx) => (
                      <div
                        key={idx}
                        className={`size-7 rounded-full flex items-center justify-center text-[10px] font-sans font-bold border-2 border-s-border dark:border-b-surface2 shadow-xs ${member.avatarBg}`}
                        title={member.name}
                      >
                        {member.initial}
                      </div>
                    ))}

                    {/* View All / Extra Members Counter Badge */}
                    <div className="size-7 bg-b-surface2 border border-s-stroke2 rounded-full flex items-center justify-center text-[9px] font-sans font-bold text-t-secondary shadow-xs">
                      +{activeGroup.membersCount - 4}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Messages scroll pane */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 bg-b-surface1/40 dark:bg-b-surface1/10 min-h-0">
                {activeMessages.map((msg, idx) => {
                  return (
                    <div 
                      key={msg.id} 
                      className={`p-4 flex gap-4 rounded-lg transition-all relative border ${
                        msg.isVerified
                          ? "bg-primary-02/5 border-primary-02/20"
                          : "bg-transparent border-transparent border-b border-s-stroke2/10 hover:bg-b-surface2 dark:hover:bg-b-surface2 hover:shadow-[inset_0px_0px_0px_3px_#FFFFFF] dark:hover:shadow-[inset_0px_0px_0px_3px_#191919]"
                      }`}
                    >
                      {/* Avatar of size 44px x 44px (size-11) */}
                      <div className={`size-11 rounded-full flex items-center justify-center shrink-0 font-sans font-bold text-sm ${
                        msg.role === "teacher" 
                          ? "bg-primary-02/10 text-primary-02 border border-primary-02/20" 
                          : "bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/20 text-t-primary dark:text-t-primary shadow-xs"
                      }`}>
                        {msg.author === "Anonymous" ? "?" : msg.author[0]}
                      </div>

                      {/* Content Column */}
                      <div className="flex-grow min-w-0 flex flex-col gap-1.5">
                        
                        {/* Name, Role & Timestamp Row */}
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-semibold text-[15px] text-t-primary dark:text-t-primary">
                              {msg.author}
                            </span>
                            {msg.role === "teacher" && (
                              <span className="px-2 py-0.5 rounded-md border border-s-stroke2/40 bg-[rgba(0,166,86,0.05)] text-primary-02 text-[8px] font-sans font-bold uppercase tracking-wider">
                                FACULTY
                              </span>
                            )}
                          </div>
                          <span className="text-[12px] font-sans text-t-secondary">
                            {msg.time}
                          </span>
                        </div>

                        {/* Tagged Doubt Badge if applicable */}
                        {msg.isDoubt && (
                          <div className="flex items-center gap-1 px-2 py-0.5 w-fit rounded-md border border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] text-primary-03 text-[9px] font-sans font-bold uppercase tracking-wider">
                            <RiQuestionLine size={10} />
                            <span>Tagged Doubt</span>
                          </div>
                        )}

                        {/* Message Body */}
                        <p className="font-sans font-normal text-[15px] leading-[150%] text-t-primary dark:text-t-primary">
                          {msg.text}
                        </p>

                        {/* Attached Image preview */}
                        {msg.attachedImage && (
                          <div className="mt-1 overflow-hidden rounded-lg border border-s-stroke2/20 max-w-xs">
                            <img src={msg.attachedImage} alt="Attachment" className="w-full h-auto max-h-32 object-cover" />
                          </div>
                        )}

                        {/* Reactions and Action Badges */}
                        <div className="flex items-center justify-between gap-4 mt-1">
                          {msg.isVerified ? (
                            <div className="flex items-center gap-1.5 text-primary-02">
                              <RiCheckDoubleLine size={14} />
                              <span className="text-[11px] font-sans font-bold">Endorsed Answer</span>
                            </div>
                          ) : (
                            <div />
                          )}

                          <button
                            onClick={() => handleUpvote(msg.id)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-sans font-bold transition-all active:scale-95 cursor-pointer ${
                              msg.hasUpvoted
                                ? "bg-shade-02 text-t-light dark:bg-t-primary dark:text-b-surface1 border-transparent"
                                : "bg-b-surface1 dark:bg-b-surface1 border-s-stroke2/20 text-t-secondary hover:text-t-primary"
                            }`}
                          >
                            <RiThumbUpLine size={11} />
                            <span>{msg.upvotes}</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Image attachment preview above input */}
              {attachedImagePreview && (
                <div className="p-2 px-4 bg-b-surface2 dark:bg-b-surface2 border-t border-s-stroke2/20 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded overflow-hidden border border-s-stroke2/20">
                      <img src={attachedImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-sans font-bold text-[11px] text-t-primary dark:text-t-primary truncate">{attachedImageName}</span>
                  </div>
                  <button
                    onClick={() => {
                      setAttachedImageName(null);
                      setAttachedImagePreview(null);
                    }}
                    className="size-6 rounded-full border border-s-stroke2/20 bg-transparent flex items-center justify-center text-t-secondary hover:text-t-primary cursor-pointer"
                  >
                    <RiCloseLine size={14} />
                  </button>
                </div>
              )}

              {/* Input Sticky Bar */}
              <div className="p-3 bg-b-surface2 dark:bg-b-surface2 border-t border-s-stroke2/20 flex gap-2.5 items-center shrink-0">
                <button
                  onClick={triggerImageUpload}
                  className="flex items-center justify-center size-9 rounded-full text-t-secondary hover:text-t-primary hover:bg-b-surface1 border border-s-stroke2/20 bg-b-surface2 dark:bg-b-surface2 transition-all cursor-pointer shrink-0"
                >
                  <RiImageAddLine size={18} />
                </button>
                <div className="flex-grow">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type [Doubt] or type your message here..."
                    className="w-full pl-4 pr-3 h-9 rounded-lg border border-s-stroke2/30 bg-b-surface1 dark:bg-b-surface1/60 text-xs font-sans focus:outline-none focus:border-t-primary dark:focus:border-t-primary transition-all font-semibold placeholder-t-secondary text-t-primary dark:text-t-primary"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() && !attachedImagePreview}
                  className={`size-9 rounded-full border-none flex items-center justify-center text-white cursor-pointer transition-all shrink-0 ${inputValue.trim() || attachedImagePreview
                      ? "bg-shade-02 hover:bg-shade-04 text-t-light dark:bg-t-primary dark:text-b-surface1 dark:hover:bg-t-primary/90"
                      : "bg-s-stroke2 text-t-secondary dark:bg-b-surface1 dark:text-t-secondary cursor-not-allowed"
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
