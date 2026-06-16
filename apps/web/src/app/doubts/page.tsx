"use client";

import Navbar from "@/components/layout/Navbar";
import { useState, useRef, useEffect } from "react";
import { RiSendPlaneFill, RiImageAddLine, RiCheckDoubleLine, RiUserStarFill, RiSearchLine, RiMore2Fill, RiGroupLine, RiPushpinFill } from "@remixicon/react";

const mockChatMessages = [
  { id: 1, author: "Rahul Verma", role: "student", isOwn: false, text: "Guys, how do we apply the Work-Energy Theorem in question 14 of yesterday's mock? Shouldn't friction be negative?", time: "10:30 AM", isVerified: false, hasImage: false },
  { id: 2, author: "Sneha Reddy", role: "student", isOwn: false, text: "Friction does negative work, yes. But if you move it to the right side of the equation (W_ext = Delta E), the sign flips.", time: "10:32 AM", isVerified: true, hasImage: false },
  { id: 3, author: "Aman Sir", role: "teacher", isOwn: false, text: "Sneha is absolutely correct. The net work done is W_c + W_nc = ΔK. Since W_nc = -f_k * d, when solving for ΔK + ΔU, it becomes positive on the other side. +10 Rep to Sneha.", time: "10:45 AM", isVerified: false, hasImage: false },
  { id: 4, author: "Anonymous", role: "student", isOwn: false, text: "Can someone explain the exceptions to the Octet rule for expanding valence shells? I'm getting confused with SF6.", time: "11:15 AM", isVerified: false, hasImage: false },
  { id: 5, author: "Vikram Singh", role: "student", isOwn: false, text: "Elements in the 3rd period and beyond have empty d-orbitals. Sulfur in SF6 uses its 3d orbitals to accommodate 12 electrons.", time: "11:20 AM", isVerified: false, hasImage: false },
  { id: 6, author: "You", role: "student", isOwn: true, text: "Yeah, PCl5 is another common example. Phosphorus has 10 valence electrons there.", time: "11:22 AM", isVerified: false, hasImage: false },
];

export default function StudentChatPage() {
  const [messages, setMessages] = useState(mockChatMessages);
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMessage = {
      id: messages.length + 1,
      author: "You",
      role: "student",
      isOwn: true,
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVerified: false,
      hasImage: false
    };
    setMessages([...messages, newMessage]);
    setInputValue("");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Navbar title="Batch Groups" />
      
      <main style={{ display: "flex", flex: 1, overflow: "hidden", background: "var(--bg-body)" }}>
        
        {/* Left Sidebar - Chat List */}
        <aside style={{ width: 320, background: "var(--bg-surface)", borderRight: "1px solid var(--border-default)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 16, borderBottom: "1px solid var(--border-subtle)" }}>
            <div className="input-field" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
              <RiSearchLine size={18} color="var(--fg-muted)" />
              <input type="text" placeholder="Search groups..." style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 14 }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* Active Chat Item */}
            <div style={{ padding: "16px 20px", display: "flex", gap: 16, cursor: "pointer", background: "var(--primary-10)", borderLeft: "4px solid var(--primary-50)" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--primary-50)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <RiGroupLine size={24} />
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, color: "var(--fg-default)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>JEE 2026 Morning</div>
                  <div style={{ fontSize: 12, color: "var(--primary-50)", fontWeight: 600 }}>11:22 AM</div>
                </div>
                <div style={{ fontSize: 13, color: "var(--fg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ color: "var(--fg-default)", fontWeight: 600 }}>You:</span> Yeah, PCl5 is another common example...
                </div>
              </div>
            </div>
            
            {/* Inactive Chat Item */}
            <div style={{ padding: "16px 20px", display: "flex", gap: 16, cursor: "pointer", transition: "background 0.2s" }} className="hover-lift">
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--n-20)", color: "var(--n-60)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <RiGroupLine size={24} />
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, color: "var(--fg-default)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Aakash Foundation</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>Yesterday</div>
                </div>
                <div style={{ fontSize: 13, color: "var(--fg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ color: "var(--fg-default)", fontWeight: 600 }}>Riya:</span> Does anyone have notes for Biology?
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
          
          {/* Chat Header */}
          <header style={{ height: 64, padding: "0 24px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--primary-50)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RiGroupLine size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--fg-default)" }}>JEE 2026 Morning (Doubts & Discussion)</h2>
                <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>145 Members • 3 Faculty Online</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, color: "var(--fg-muted)" }}>
              <RiSearchLine size={20} style={{ cursor: "pointer" }} />
              <RiMore2Fill size={20} style={{ cursor: "pointer" }} />
            </div>
          </header>

          {/* Chat Messages Scroll */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 10%", display: "flex", flexDirection: "column", gap: 16, backgroundImage: "radial-gradient(var(--border-subtle) 1px, transparent 0)", backgroundSize: "20px 20px" }}>
            
            <div style={{ textAlign: "center", margin: "16px 0" }}>
              <span style={{ background: "var(--n-20)", color: "var(--fg-muted)", padding: "4px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600 }}>Today</span>
            </div>

            {messages.map((msg, idx) => {
              const showAuthor = idx === 0 || messages[idx - 1].author !== msg.author || messages[idx - 1].time !== msg.time;

              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.isOwn ? "flex-end" : "flex-start", marginBottom: showAuthor ? 8 : 2 }}>
                  {!msg.isOwn && showAuthor && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: msg.role === "teacher" ? "var(--warning-60)" : "var(--fg-muted)", marginLeft: 48, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      {msg.author} {msg.role === "teacher" && <span style={{ background: "var(--warning-10)", padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>FACULTY</span>}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, maxWidth: "75%" }}>
                    {!msg.isOwn && showAuthor ? (
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: msg.role === "teacher" ? "var(--warning-50)" : "var(--n-30)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0, marginTop: 4 }}>
                        {msg.author === "Anonymous" ? "?" : msg.author[0]}
                      </div>
                    ) : (
                      <div style={{ width: 32 }} /> // spacer
                    )}

                    <div style={{ position: "relative" }}>
                      {msg.isVerified && (
                        <div style={{ position: "absolute", top: -10, right: -10, background: "var(--success-50)", color: "white", borderRadius: "50%", padding: 4, zIndex: 10, boxShadow: "0 0 0 2px var(--bg-body)" }} title="Teacher Endorsed">
                          <RiCheckDoubleLine size={12} />
                        </div>
                      )}
                      
                      <div style={{ 
                        background: msg.isOwn ? "var(--primary-50)" : "var(--bg-surface)", 
                        color: msg.isOwn ? "white" : "var(--fg-default)",
                        padding: "10px 14px", 
                        borderRadius: "16px",
                        borderTopLeftRadius: !msg.isOwn && showAuthor ? 0 : 16,
                        borderTopRightRadius: msg.isOwn && showAuthor ? 0 : 16,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        border: msg.isVerified ? "2px solid var(--success-40)" : msg.isOwn ? "none" : "1px solid var(--border-default)",
                        fontSize: 15,
                        lineHeight: 1.5
                      }}>
                        {msg.text}
                        <div style={{ fontSize: 11, color: msg.isOwn ? "rgba(255,255,255,0.7)" : "var(--fg-muted)", textAlign: "right", marginTop: 4, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                          {msg.time} {msg.isOwn && <RiCheckDoubleLine size={14} color="rgba(255,255,255,0.9)" />}
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
          <div style={{ padding: "16px 24px", background: "var(--bg-surface)", borderTop: "1px solid var(--border-default)", display: "flex", gap: 12, alignItems: "center" }}>
            <button style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--n-10)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", cursor: "pointer", transition: "all 0.2s" }} className="hover-lift">
              <RiImageAddLine size={22} />
            </button>
            <div style={{ flex: 1, position: "relative" }}>
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Message JEE 2026 Morning... (Type [Doubt] to tag a question)" 
                style={{ width: "100%", padding: "12px 20px", borderRadius: 24, border: "1px solid var(--border-default)", background: "var(--bg-body)", fontSize: 15, outline: "none" }}
              />
            </div>
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim()}
              style={{ width: 44, height: 44, borderRadius: "50%", background: inputValue.trim() ? "var(--primary-50)" : "var(--n-20)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: inputValue.trim() ? "pointer" : "not-allowed", transition: "all 0.2s" }}
            >
              <RiSendPlaneFill size={20} style={{ transform: "translateX(-2px)" }} />
            </button>
          </div>

        </section>
      </main>
    </div>
  );
}
