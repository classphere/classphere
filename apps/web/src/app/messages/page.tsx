"use client";

import Navbar from "@/components/layout/Navbar";
import { RiSearchLine, RiSendPlaneFill, RiMore2Fill, RiUserSmileLine } from "@remixicon/react";

const mockMessages = [
  { id: 1, sender: "Mr. Sharma (Physics)", preview: "Your performance in the latest booster test was excellent. Keep it up!", time: "10:30 AM", unread: true },
  { id: 2, sender: "Admin - Allen Institute", preview: "Reminder: The upcoming mock exam will cover entire syllabus.", time: "Yesterday", unread: false },
  { id: 3, sender: "System Notifications", preview: "Your payment receipt for June has been generated.", time: "Mon", unread: false },
];

export default function MessagesPage() {
  return (
    <>
      <Navbar title="Messages" />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "var(--space-600)", width: "100%", height: "calc(100vh - 70px)" }}>
        
        <div className="rayum-card" style={{ display: "flex", height: "100%", padding: 0, overflow: "hidden" }}>
          
          {/* Sidebar */}
          <div style={{ width: 320, borderRight: "1px solid var(--border-default)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px" }}>
              <div style={{ position: "relative" }}>
                <RiSearchLine size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)" }} />
                <input 
                  type="text" 
                  placeholder="Search messages..." 
                  className="input-field"
                  style={{ width: "100%", paddingLeft: 36 }}
                />
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto" }}>
              {mockMessages.map(msg => (
                <div key={msg.id} style={{ 
                  padding: "16px", 
                  borderBottom: "1px solid var(--border-subtle)", 
                  cursor: "pointer",
                  background: msg.unread ? "var(--primary-10)" : "transparent"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div className="text-body-large" style={{ fontWeight: msg.unread ? 700 : 500, color: "var(--fg-default)" }}>
                      {msg.sender}
                    </div>
                    <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>{msg.time}</div>
                  </div>
                  <div className="text-body-small" style={{ color: "var(--fg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {msg.preview}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-body)" }}>
            
            {/* Header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-default)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-surface)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--primary-10)", color: "var(--primary-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RiUserSmileLine size={24} />
                </div>
                <div>
                  <div className="text-body-large" style={{ fontWeight: 600, color: "var(--fg-default)" }}>Mr. Sharma (Physics)</div>
                  <div className="text-body-small" style={{ color: "var(--success-50)" }}>Online</div>
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding: 8 }}>
                <RiMore2Fill size={20} />
              </button>
            </div>

            {/* Chat History */}
            <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ alignSelf: "flex-start", maxWidth: "70%", background: "var(--bg-surface)", padding: "12px 16px", borderRadius: "12px 12px 12px 0", border: "1px solid var(--border-default)" }}>
                <div className="text-body-regular" style={{ color: "var(--fg-default)" }}>Hello! How are you finding the recent assignments?</div>
                <div className="text-body-small" style={{ color: "var(--fg-muted)", marginTop: 4, textAlign: "right" }}>10:15 AM</div>
              </div>
              <div style={{ alignSelf: "flex-end", maxWidth: "70%", background: "var(--primary-50)", color: "white", padding: "12px 16px", borderRadius: "12px 12px 0 12px" }}>
                <div className="text-body-regular">They are quite challenging but I am learning a lot.</div>
                <div className="text-body-small" style={{ color: "rgba(255,255,255,0.8)", marginTop: 4, textAlign: "right" }}>10:20 AM</div>
              </div>
              <div style={{ alignSelf: "flex-start", maxWidth: "70%", background: "var(--bg-surface)", padding: "12px 16px", borderRadius: "12px 12px 12px 0", border: "1px solid var(--border-default)" }}>
                <div className="text-body-regular" style={{ color: "var(--fg-default)" }}>Your performance in the latest booster test was excellent. Keep it up!</div>
                <div className="text-body-small" style={{ color: "var(--fg-muted)", marginTop: 4, textAlign: "right" }}>10:30 AM</div>
              </div>
            </div>

            {/* Message Input */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", gap: 12 }}>
              <input 
                type="text" 
                placeholder="Type your message..." 
                className="input-field"
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" style={{ padding: "10px 16px" }}>
                <RiSendPlaneFill size={20} />
              </button>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
