"use client";

import Navbar from "@/components/layout/Navbar";
import { useState } from "react";
import { RiCheckDoubleLine, RiReplyFill, RiUserStarFill, RiMessage2Fill, RiTimeLine } from "@remixicon/react";

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

export default function TeacherForumPage() {
  const [expandedThread, setExpandedThread] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [filter, setFilter] = useState("All");

  const filteredThreads = mockForumThreads.filter(t => filter === "All" || t.status === filter);

  return (
    <>
      <Navbar title="Batch Forums" />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="text-heading-m" style={{ color: "var(--fg-default)", margin: 0 }}>Active Discussions (Your Batches)</h2>
          <div style={{ display: "flex", gap: 12 }}>
            <select className="input-field" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Unresolved">Unresolved</option>
              <option value="Peer Answered">Peer Answered (Needs Review)</option>
              <option value="Teacher Verified">Teacher Verified</option>
            </select>
            <select className="input-field">
              <option>All Batches</option>
              <option>JEE 2026 Morning</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {filteredThreads.map(thread => (
            <div key={thread.id} className="rayum-card" style={{ overflow: "hidden" }}>
              {/* Thread Header */}
              <div style={{ padding: 24, paddingBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="avatar avatar-sm" style={{ background: thread.author === "Anonymous" ? "var(--n-40)" : "var(--primary-10)", color: thread.author === "Anonymous" ? "white" : "var(--primary-50)" }}>
                    {thread.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-default)" }}>{thread.author}</div>
                    <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{thread.batch} • {thread.date}</div>
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
              <div style={{ padding: 24, cursor: "pointer", background: expandedThread === thread.id ? "var(--bg-surface-hover)" : "var(--bg-surface)" }} onClick={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)}>
                <p className="text-body" style={{ color: "var(--fg-default)", fontWeight: 500, lineHeight: 1.6, margin: 0 }}>
                  {thread.text}
                </p>
                
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--fg-muted)", fontSize: 13, fontWeight: 600 }}>
                  <RiMessage2Fill size={16} /> {thread.replies.length} {thread.replies.length === 1 ? "Reply" : "Replies"}
                  <span style={{ margin: "0 8px", color: "var(--border-default)" }}>|</span>
                  <span style={{ color: "var(--primary-50)" }}>{expandedThread === thread.id ? "Hide Discussion" : "Review Discussion"}</span>
                </div>
              </div>

              {/* Thread Replies (Teacher Moderation View) */}
              {expandedThread === thread.id && (
                <div style={{ background: "var(--n-10)", padding: 24, borderTop: "1px solid var(--border-default)" }}>
                  
                  {/* Replies List */}
                  {thread.replies.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                      {thread.replies.map(reply => (
                        <div key={reply.id} style={{ 
                          display: "flex", gap: 16, padding: 16, borderRadius: "var(--r-md)", 
                          background: "var(--bg-surface)", border: reply.isVerified ? "1px solid var(--success-30)" : "1px solid var(--border-default)",
                          boxShadow: reply.isVerified ? "0 0 0 1px var(--success-10)" : "none",
                          position: "relative"
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
                                  <RiCheckDoubleLine size={12} /> Verified
                                </div>
                              )}
                            </div>
                            <p style={{ fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.6, margin: 0 }}>
                              {reply.text}
                            </p>
                          </div>

                          {/* Moderation Action for Unverified Peer Replies */}
                          {reply.role === "student" && !reply.isVerified && (
                            <button className="btn btn-outline" style={{ position: "absolute", right: 16, bottom: 16, fontSize: 12, padding: "6px 12px", display: "flex", gap: 4, borderColor: "var(--success-50)", color: "var(--success-50)" }}>
                              <RiCheckDoubleLine size={14} /> Endorse as Correct
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Teacher Reply Area */}
                  {replyingTo === thread.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, background: "var(--bg-surface)", padding: 16, borderRadius: "var(--r-md)", border: "1px solid var(--border-default)" }}>
                      <textarea 
                        className="input-field" 
                        placeholder="Add an official faculty explanation..." 
                        style={{ minHeight: 100, resize: "vertical" }}
                      />
                      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost" onClick={() => setReplyingTo(null)}>Cancel</button>
                        <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <RiReplyFill size={18} /> Post Reply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                        {thread.status === "Unresolved" ? "No students have solved this yet." : "Review the discussion and add an official reply if needed."}
                      </div>
                      <button className="btn btn-dark" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => setReplyingTo(thread.id)}>
                        <RiReplyFill size={18} /> Add Faculty Reply
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>
          ))}

          {filteredThreads.length === 0 && (
             <div style={{ textAlign: "center", padding: 48, color: "var(--fg-muted)" }}>
               No discussions found matching this filter.
             </div>
          )}
        </div>

      </main>
    </>
  );
}
