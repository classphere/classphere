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
} from "@remixicon/react";

const initialMockMessages = [
  { id: 1, author: "Rahul Verma", role: "student", isOwn: false, text: "Guys, how do we apply the Work-Energy Theorem in question 14 of yesterday's mock? Shouldn't friction be negative?", time: "10:30 AM", isVerified: false },
  { id: 2, author: "Sneha Reddy", role: "student", isOwn: false, text: "Friction does negative work, yes. But if you move it to the right side of the equation (W_ext = Delta E), the sign flips.", time: "10:32 AM", isVerified: true },
  { id: 3, author: "You", role: "teacher", isOwn: true, text: "Sneha is absolutely correct. The net work done is W_c + W_nc = ΔK. Since W_nc = -f_k * d, when solving for ΔK + ΔU, it becomes positive on the other side. +10 Rep to Sneha.", time: "10:45 AM", isVerified: false },
  { id: 4, author: "Anonymous", role: "student", isOwn: false, text: "Can someone explain the exceptions to the Octet rule for expanding valence shells? I'm getting confused with SF6.", time: "11:15 AM", isVerified: false },
  { id: 5, author: "Vikram Singh", role: "student", isOwn: false, text: "Elements in the 3rd period and beyond have empty d-orbitals. Sulfur in SF6 uses its 3d orbitals to accommodate 12 electrons.", time: "11:20 AM", isVerified: false },
  { id: 6, author: "Priya Sharma", role: "student", isOwn: false, text: "Yeah, PCl5 is another common example. Phosphorus has 10 valence electrons there.", time: "11:22 AM", isVerified: false },
];

export default function TeacherChatPage() {
  const [messages, setMessages] = useState(initialMockMessages);
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMessage = {
      id: messages.length + 1,
      author: "You",
      role: "teacher",
      isOwn: true,
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVerified: false
    };
    setMessages([...messages, newMessage]);
    setInputValue("");
  };

  const handleEndorse = (id: number) => {
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, isVerified: true } : m));
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar title="Batch Discussion Moderation" />
      
      <main className="flex flex-1 overflow-hidden bg-b-surface2">
        
        {/* Left Sidebar - Chat List */}
        <aside className="flex w-[18rem] shrink-0 flex-col border-r border-s-stroke2 bg-b-surface1 lg:w-[20rem] xl:w-[22rem]">
          <div className="p-4 border-b border-s-stroke2">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-secondary">
                <RiSearchLine size={18} />
              </span>
              <input
                type="text"
                placeholder="Search groups..."
                className="input pl-10 h-10 text-caption font-semibold"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* Active Chat Item */}
            <div className="flex cursor-pointer gap-4 border-l-4 border-[#EF9D0E] bg-linear-to-r from-[#EF9D0E]/10 to-transparent p-5">
              <div className="size-11 rounded-full bg-[#EF9D0E] text-white flex items-center justify-center shrink-0">
                <RiGroupLine size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <div className="text-body-2 font-bold text-t-primary truncate">JEE 2026 Morning</div>
                  <div className="text-caption font-bold text-[#EF9D0E]">11:22 AM</div>
                </div>
                <div className="text-caption text-t-secondary truncate">
                  <span className="font-bold text-t-primary">Priya:</span> Yeah, PCl5 is another common...
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <section className="relative flex flex-1 flex-col bg-b-surface2 min-w-0">
          
          {/* Chat Header */}
          <header className="z-10 flex h-16 items-center justify-between border-b border-s-stroke2 bg-b-surface1 px-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[#EF9D0E] text-white flex items-center justify-center">
                <RiGroupLine size={20} />
              </div>
              <div>
                <h2 className="text-body-2 font-bold text-t-primary">JEE 2026 Morning (Moderation View)</h2>
                <div className="text-caption text-t-secondary">145 Members • 3 Faculty Online</div>
              </div>
            </div>
            <div className="flex gap-4 text-t-secondary">
              <button className="flex items-center justify-center size-8 rounded-full text-t-secondary hover:text-t-primary hover:bg-b-surface2 border-0 bg-transparent transition-colors cursor-pointer">
                <RiSearchLine size={18} />
              </button>
              <button className="flex items-center justify-center size-8 rounded-full text-t-secondary hover:text-t-primary hover:bg-b-surface2 border-0 bg-transparent transition-colors cursor-pointer">
                <RiMore2Fill size={18} />
              </button>
            </div>
          </header>

          {/* Chat Messages Scroll */}
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6 md:px-8">
            
            <div className="text-center my-4">
              <span className="label label-gray font-bold px-3 py-1">Today</span>
            </div>

            {messages.map((msg, idx) => {
              const showAuthor = idx === 0 || messages[idx - 1].author !== msg.author || messages[idx - 1].time !== msg.time;

              return (
                <div key={msg.id} className={`flex flex-col ${msg.isOwn ? "items-end" : "items-start"} mb-1`}>
                  {!msg.isOwn && showAuthor && (
                    <div className="text-caption font-bold text-t-secondary ml-11 mb-1.5 flex items-center gap-2">
                      {msg.author}
                      {msg.role === "teacher" && <span className="label label-yellow px-1.5 py-0.5 text-[9px] h-4">FACULTY</span>}
                    </div>
                  )}

                  <div className="flex max-w-[85%] items-center gap-3 sm:max-w-[70%]">
                    {!msg.isOwn && msg.role === "student" && !msg.isVerified && (
                      <button 
                        onClick={() => handleEndorse(msg.id)}
                        title="Endorse as correct solution"
                        className="size-8 rounded-full flex items-center justify-center text-[#00A656] hover:bg-[#00A656]/10 border border-[#00A656]/20 transition-all shrink-0 cursor-pointer"
                      >
                        <RiCheckDoubleLine size={16} />
                      </button>
                    )}

                    {!msg.isOwn && showAuthor ? (
                      <div className={`size-8 rounded-full flex items-center justify-center shrink-0 text-caption font-bold ${
                        msg.role === "teacher" ? "bg-[#EF9D0E]/20 text-[#EF9D0E]" : "bg-b-surface1 border border-s-stroke2 text-t-primary"
                      }`}>
                        {msg.author === "Anonymous" ? "?" : msg.author[0]}
                      </div>
                    ) : (
                      !msg.isOwn && <div className="size-8 shrink-0" />
                    )}

                    <div className="relative group">
                      {msg.isVerified && (
                        <div className="absolute -top-2 -right-2 bg-[#00A656] text-white rounded-full p-0.5 border-2 border-b-surface2 z-10 shadow-depth" title="Teacher Endorsed">
                          <RiCheckDoubleLine size={10} />
                        </div>
                      )}
                      
                      <div className={`rounded-2xl p-4 leading-relaxed text-body-2 ${
                        msg.isOwn 
                          ? "bg-linear-to-b from-[#2C2C2C] to-[#282828] text-white rounded-tr-xs" 
                          : msg.isVerified 
                            ? "bg-[#00A656]/5 border-2 border-[#00A656] text-t-primary rounded-tl-xs" 
                            : "bg-b-surface1 border border-s-stroke2 text-t-primary rounded-tl-xs"
                      }`}>
                        {msg.text}
                        <div className={`text-[10px] text-right mt-2 flex justify-end items-center gap-1 font-semibold ${
                          msg.isOwn ? "text-white/60" : "text-t-secondary"
                        }`}>
                          {msg.time} 
                          {msg.isOwn && <span className="text-[#EF9D0E]">Faculty</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Sticky Input Bar */}
          <div className="flex items-center gap-3 border-t border-s-stroke2 bg-b-surface1 p-4">
            <button className="flex items-center justify-center size-11 rounded-full text-t-secondary hover:text-t-primary hover:bg-b-surface2 border border-s-stroke2 bg-b-surface1 transition-colors cursor-pointer shrink-0">
              <RiImageAddLine size={20} />
            </button>
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Post an official faculty response..." 
                className="input pr-4"
              />
            </div>
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={`size-11 rounded-full border-none flex items-center justify-center text-white cursor-pointer transition-colors shrink-0 ${
                inputValue.trim() 
                  ? "bg-[#EF9D0E] hover:bg-[#EF9D0E]/80" 
                  : "bg-b-surface2 text-t-secondary cursor-not-allowed"
              }`}
            >
              <RiSendPlaneFill size={18} className="translate-x-[-1px]" />
            </button>
          </div>

        </section>
      </main>
    </div>
  );
}
