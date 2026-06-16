"use client";

import Navbar from "@/components/layout/Navbar";
import { useState } from "react";
import { RiImageAddLine, RiSendPlaneFill, RiCheckDoubleLine, RiTimeLine, RiSparklingFill, RiUserSecretFill, RiMessage2Fill, RiUserStarFill } from "@remixicon/react";

const mockForumThreads = [
  { 
    id: 1, 
    author: "Rahul Verma", 
    avatar: "R",
    batch: "JEE 2026 Morning",
    text: "Guys, how do we apply the Work-Energy Theorem in question 14 of yesterday's mock? Shouldn't friction be negative?", 
    subject: "Physics", 
    status: "Teacher Verified", 
    date: "Yesterday",
    replies: [
      { id: 101, author: "Sneha Reddy", avatar: "S", role: "student", text: "Friction does negative work, yes. But if you move it to the right side of the equation (W_ext = Delta E), the sign flips.", isVerified: true },
      { id: 102, author: "Aman Sir", avatar: "👨‍🏫", role: "teacher", text: "Sneha is absolutely correct. Good job! +10 Rep to Sneha.", isVerified: false }
    ]
  },
  { 
    id: 2, 
    author: "Anonymous", 
    avatar: "?",
    batch: "JEE 2026 Morning",
    text: "Can someone explain the exceptions to the Octet rule for expanding valence shells? I'm getting confused with SF6.", 
    subject: "Chemistry", 
    status: "Peer Answered", 
    date: "2 hours ago",
    replies: [
      { id: 201, author: "Vikram Singh", avatar: "V", role: "student", text: "Elements in the 3rd period and beyond have empty d-orbitals. Sulfur in SF6 uses its 3d orbitals to accommodate 12 electrons.", isVerified: false }
    ]
  },
  { 
    id: 3, 
    author: "Priya Sharma", 
    avatar: "P",
    batch: "JEE 2026 Morning",
    text: "What is the fastest way to find the domain of inverse trig functions? I keep messing up the inequalities.", 
    subject: "Mathematics", 
    status: "Unresolved", 
    date: "10 mins ago",
    replies: []
  }
];

export default function StudentForumPage() {
  const [doubtText, setDoubtText] = useState("");
  const [subject, setSubject] = useState("");
  const [isAnonym, setIsAnonym] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [expandedThread, setExpandedThread] = useState<number | null>(null);

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setDoubtText("");
      setSubject("");
      setTimeout(() => setIsSubmitted(false), 3000);
    }, 1000);
  };

  return (
    <>
      <Navbar title="Batch Forum" subtitle="Discuss concepts with your peers in JEE 2026 Morning" breadcrumbs="Dashboard > Batch Forum" />
      <main style={{ maxWidth: 840, margin: "0 auto", padding: "0 32px 64px 32px", width: "100%" }}>
        
        {/* Post to Forum */}
        <div className="rayum-card" style={{ padding: 40, marginBottom: 48, background: "var(--bg-surface)", position: "relative", overflow: "hidden" }}>
          
          <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, background: "radial-gradient(circle, rgba(74, 222, 128, 0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--r-full)", background: "var(--n-10)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--n-60)" }}>
              <RiMessage2Fill size={16} />
            </div>
            <h2 className="section-title" style={{ margin: 0, fontSize: 20 }}>Post to Batch Forum</h2>
          </div>
          <p className="t-body-sm" style={{ marginBottom: 32, maxWidth: "90%" }}>Stuck? Post it here. Earn reputation points by solving your peers' doubts!</p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <select className="input" style={{ width: 240, appearance: "none", cursor: "pointer" }} value={subject} onChange={e => setSubject(e.target.value)}>
                <option value="" disabled>Select Subject...</option>
                <option>Physics</option>
                <option>Chemistry</option>
                <option>Mathematics</option>
              </select>
            </div>
            
            <textarea 
              className="input" 
              placeholder="Type your question or explain where you got stuck..." 
              style={{ minHeight: 100, resize: "vertical", padding: 20 }}
              value={doubtText}
              onChange={(e) => setDoubtText(e.target.value)}
            />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: "var(--r-full)" }}>
                  <RiImageAddLine size={18} /> Add Image
                </button>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", color: isAnonym ? "var(--primary-50)" : "var(--fg-muted)" }}>
                  <input type="checkbox" checked={isAnonym} onChange={(e) => setIsAnonym(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--primary-50)" }} />
                  <RiUserSecretFill size={18} /> Post Anonymously
                </label>
              </div>
              <button 
                className="btn btn-dark" 
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px" }} 
                disabled={!doubtText || !subject || isSubmitting || isSubmitted}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Posting..." : isSubmitted ? "Posted Successfully!" : <>Post to Forum <RiSendPlaneFill size={18} /></>}
              </button>
            </div>
          </div>
        </div>

        {/* Community Feed */}
        <h2 className="section-title" style={{ fontSize: 18, marginBottom: 24, paddingLeft: 8 }}>Recent Discussions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {mockForumThreads.map(thread => (
            <div key={thread.id} className="rayum-card" style={{ overflow: "hidden" }}>
              {/* Thread Header */}
              <div style={{ padding: 24, paddingBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="avatar avatar-sm" style={{ background: thread.author === "Anonymous" ? "var(--n-40)" : "var(--primary-10)", color: thread.author === "Anonymous" ? "white" : "var(--primary-50)" }}>
                    {thread.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-default)" }}>{thread.author}</div>
                    <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{thread.date}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span className={`badge ${thread.subject === 'Physics' ? 'badge-blue' : thread.subject === 'Chemistry' ? 'badge-orange' : 'badge-green'}`} style={{ padding: "4px 12px" }}>
                    {thread.subject}
                  </span>
                  <span style={{ 
                    display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: "var(--r-full)",
                    background: thread.status === "Teacher Verified" ? "var(--success-10)" : thread.status === "Peer Answered" ? "var(--primary-10)" : "var(--warning-10)",
                    color: thread.status === "Teacher Verified" ? "var(--success-50)" : thread.status === "Peer Answered" ? "var(--primary-50)" : "var(--warning-60)"
                  }}>
                    {thread.status === "Teacher Verified" ? <RiUserStarFill size={14} /> : thread.status === "Peer Answered" ? <RiCheckDoubleLine size={14} /> : <RiTimeLine size={14} />}
                    {thread.status}
                  </span>
                </div>
              </div>

              {/* Thread Content */}
              <div style={{ padding: 24, cursor: "pointer" }} onClick={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)}>
                <p className="text-body" style={{ color: "var(--fg-default)", fontWeight: 500, lineHeight: 1.6, margin: 0 }}>
                  {thread.text}
                </p>
                
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--fg-muted)", fontSize: 13, fontWeight: 600 }}>
                  <RiMessage2Fill size={16} /> {thread.replies.length} {thread.replies.length === 1 ? "Reply" : "Replies"}
                  <span style={{ margin: "0 8px", color: "var(--border-default)" }}>|</span>
                  <span style={{ color: "var(--primary-50)" }}>{expandedThread === thread.id ? "Hide Replies" : "View Discussion"}</span>
                </div>
              </div>

              {/* Thread Replies */}
              {expandedThread === thread.id && (
                <div style={{ background: "var(--bg-surface-hover)", padding: 24, borderTop: "1px solid var(--border-default)" }}>
                  {thread.replies.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 24, color: "var(--fg-muted)", fontSize: 14 }}>
                      No replies yet. Be the first to help out!
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {thread.replies.map(reply => (
                        <div key={reply.id} style={{ 
                          display: "flex", gap: 16, padding: 16, borderRadius: "var(--r-md)", 
                          background: "var(--bg-surface)", border: reply.isVerified ? "1px solid var(--success-30)" : "1px solid var(--border-default)",
                          boxShadow: reply.isVerified ? "0 0 0 1px var(--success-10)" : "none"
                        }}>
                          <div className="avatar avatar-sm" style={{ background: reply.role === "teacher" ? "var(--warning-10)" : "var(--n-20)", flexShrink: 0 }}>
                            {reply.avatar}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: reply.role === "teacher" ? "var(--warning-60)" : "var(--fg-default)" }}>
                                {reply.author} {reply.role === "teacher" && "(Faculty)"}
                              </div>
                              {reply.isVerified && (
                                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success-50)", display: "flex", alignItems: "center", gap: 4, background: "var(--success-10)", padding: "2px 8px", borderRadius: 12 }}>
                                  <RiCheckDoubleLine size={12} /> Teacher Endorsed
                                </div>
                              )}
                            </div>
                            <p style={{ fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.6, margin: 0 }}>
                              {reply.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Reply Box */}
                  <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                    <div className="avatar avatar-sm" style={{ background: "var(--primary-10)", color: "var(--primary-50)", flexShrink: 0 }}>You</div>
                    <div style={{ flex: 1, position: "relative" }}>
                      <input type="text" className="input" placeholder="Write a reply..." style={{ width: "100%", paddingRight: 48 }} />
                      <button style={{ position: "absolute", right: 8, top: 8, background: "none", border: "none", color: "var(--primary-50)", cursor: "pointer" }}>
                        <RiSendPlaneFill size={20} />
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>

      </main>
    </>
  );
}
