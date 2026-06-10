"use client";

import Navbar from "@/components/layout/Navbar";
import { RiSearchLine, RiSendPlaneFill, RiMore2Fill, RiUserSmileLine } from "@remixicon/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function MessagesContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "student";

  const messageData = {
    student: {
      contactName: "Mr. Sharma (Physics)",
      messages: [
        { id: 1, sender: "Mr. Sharma (Physics)", preview: "Your performance in the latest booster test was excellent. Keep it up!", time: "10:30 AM", unread: true },
        { id: 2, sender: "Admin - Allen Institute", preview: "Reminder: The upcoming mock exam will cover entire syllabus.", time: "Yesterday", unread: false },
        { id: 3, sender: "System Notifications", preview: "Your payment receipt for June has been generated.", time: "Mon", unread: false },
      ],
      chat: [
        { sender: "Mr. Sharma (Physics)", text: "Hello! How are you finding the recent assignments?", time: "10:15 AM", isMe: false },
        { sender: "Me", text: "They are quite challenging but I am learning a lot.", time: "10:20 AM", isMe: true },
        { sender: "Mr. Sharma (Physics)", text: "Your performance in the latest booster test was excellent. Keep it up!", time: "10:30 AM", isMe: false },
      ]
    },
    teacher: {
      contactName: "Rahul Verma (Student)",
      messages: [
        { id: 1, sender: "Rahul Verma (Student)", preview: "Thank you for the explanation sir, I understand it now.", time: "11:45 AM", unread: true },
        { id: 2, sender: "Institute Admin", preview: "Please submit your lecture schedule for next week.", time: "Yesterday", unread: false },
        { id: 3, sender: "Priya (Chemistry)", preview: "Can we swap our slots on Thursday?", time: "Mon", unread: false },
      ],
      chat: [
        { sender: "Me", text: "Rahul, did you check the solution I posted for your doubt?", time: "11:00 AM", isMe: true },
        { sender: "Rahul Verma (Student)", text: "Yes sir, I am reviewing it right now.", time: "11:15 AM", isMe: false },
        { sender: "Rahul Verma (Student)", text: "Thank you for the explanation sir, I understand it now.", time: "11:45 AM", isMe: false },
      ]
    },
    institute: {
      contactName: "ExamPrep Support",
      messages: [
        { id: 1, sender: "ExamPrep Support", preview: "Your ticket #TCK-4829 has been updated.", time: "2:15 PM", unread: true },
        { id: 2, sender: "Billing Dept", preview: "Invoice INV-2023-004 is now available for download.", time: "Yesterday", unread: false },
        { id: 3, sender: "Aman Sir", preview: "I need to take leave tomorrow due to an emergency.", time: "Tue", unread: false },
      ],
      chat: [
        { sender: "Me", text: "Hi, our API integration seems to be failing for the new batch we created.", time: "1:00 PM", isMe: true },
        { sender: "ExamPrep Support", text: "We are looking into this right away. Could you provide the Batch ID?", time: "1:15 PM", isMe: false },
        { sender: "Me", text: "Batch ID is BATCH-2026-X1.", time: "1:20 PM", isMe: true },
        { sender: "ExamPrep Support", text: "Your ticket #TCK-4829 has been updated with a fix.", time: "2:15 PM", isMe: false },
      ]
    },
    superadmin: {
      contactName: "Aakash Institute Admin",
      messages: [
        { id: 1, sender: "Aakash Institute Admin", preview: "Batch ID is BATCH-2026-X1.", time: "1:20 PM", unread: true },
        { id: 2, sender: "System Alerts", preview: "Server CPU load exceeded 80% on Node-4.", time: "12:00 PM", unread: false },
        { id: 3, sender: "Sales Team", preview: "New enterprise lead: Resonance Eduventures.", time: "Mon", unread: false },
      ],
      chat: [
        { sender: "Aakash Institute Admin", text: "Hi, our API integration seems to be failing for the new batch we created.", time: "1:00 PM", isMe: false },
        { sender: "Me", text: "We are looking into this right away. Could you provide the Batch ID?", time: "1:15 PM", isMe: true },
        { sender: "Aakash Institute Admin", text: "Batch ID is BATCH-2026-X1.", time: "1:20 PM", isMe: false },
      ]
    }
  };

  const data = messageData[role as keyof typeof messageData] || messageData.student;

  return (
    <>
      <Navbar title="Messages" subtitle="Communicate with teachers, support, and your batchmates." />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 32px 32px", width: "100%", height: "calc(100vh - 120px)" }}>
        
        <div className="rayum-card" style={{ display: "flex", height: "100%", padding: 0, overflow: "hidden" }}>
          
          {/* Sidebar */}
          <div style={{ width: 320, borderRight: "1px solid var(--border-default)", display: "flex", flexDirection: "column", background: "var(--bg-surface)" }}>
            <div style={{ padding: 24, borderBottom: "1px solid var(--border-default)" }}>
              <div className="search-bar" style={{ borderRadius: "var(--r-full)" }}>
                <RiSearchLine size={18} />
                <input type="text" placeholder="Search messages..." />
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto" }}>
              {data.messages.map(msg => (
                <div key={msg.id} style={{ 
                  padding: 24, 
                  borderBottom: "1px solid var(--border-default)", 
                  cursor: "pointer",
                  background: msg.unread ? "var(--p-10)" : "transparent",
                  transition: "background 0.2s"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div className="text-bold" style={{ color: "var(--fg-default)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 8 }}>
                      {msg.sender}
                    </div>
                    <div className="t-body-sm" style={{ color: msg.unread ? "var(--p-50)" : "var(--fg-muted)", fontWeight: msg.unread ? 600 : 500, flexShrink: 0 }}>{msg.time}</div>
                  </div>
                  <div className="t-body-sm" style={{ color: msg.unread ? "var(--fg-default)" : "var(--fg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: msg.unread ? 600 : 400 }}>
                    {msg.preview}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-default)", minWidth: 0 }}>
            
            {/* Header */}
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border-default)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-surface)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div className="avatar avatar-md" style={{ background: "var(--s-50)", color: "white" }}>
                  <RiUserSmileLine size={20} />
                </div>
                <div>
                  <div className="text-bold" style={{ fontSize: 16 }}>{data.contactName}</div>
                  <div className="t-body-sm" style={{ color: "var(--s-50)", fontWeight: 600, marginTop: 4 }}>Online</div>
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding: 8 }}>
                <RiMore2Fill size={20} />
              </button>
            </div>

            {/* Chat History */}
            <div style={{ flex: 1, padding: 32, overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
              {data.chat.map((c, i) => (
                <div key={i} style={{ 
                  alignSelf: c.isMe ? "flex-end" : "flex-start", 
                  maxWidth: "70%", 
                  background: c.isMe ? "var(--p-50)" : "var(--bg-surface)", 
                  color: c.isMe ? "white" : "var(--fg-default)",
                  padding: "16px 20px", 
                  borderRadius: c.isMe ? "16px 16px 0 16px" : "16px 16px 16px 0", 
                  border: c.isMe ? "none" : "1px solid var(--border-default)",
                  boxShadow: c.isMe ? "0 4px 12px rgba(92, 223, 120, 0.2)" : "0 2px 8px rgba(0,0,0,0.02)"
                }}>
                  <div className="text-bold" style={{ fontWeight: 500 }}>{c.text}</div>
                  <div className="t-body-sm" style={{ color: c.isMe ? "rgba(255,255,255,0.8)" : "var(--fg-muted)", marginTop: 8, textAlign: "right" }}>{c.time}</div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div style={{ padding: 32, borderTop: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", gap: 16 }}>
              <input 
                type="text" 
                placeholder="Type your message..." 
                className="input"
                style={{ flex: 1, borderRadius: "var(--r-full)" }}
              />
              <button className="btn btn-primary" style={{ borderRadius: "var(--r-full)", width: 44, height: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RiSendPlaneFill size={20} />
              </button>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
