"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import {
  RiAddLine,
  RiFileListLine,
  RiTeamLine,
  RiCalendarLine,
  RiCheckLine,
  RiTimeLine,
  RiAlertLine,
  RiCloseLine,
} from "@remixicon/react";
import { mockDPPs, mockBatches, type MockDPP } from "@/lib/mock-data";

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology"];
const CHAPTERS: Record<string, string[]> = {
  Physics: ["Laws of Motion", "Thermodynamics", "Electrostatics", "Optics", "Modern Physics", "Waves"],
  Chemistry: ["Some Basic Concepts", "Atomic Structure", "Chemical Bonding", "Equilibrium", "Organic Chemistry"],
  Mathematics: ["Calculus", "Algebra", "Coordinate Geometry", "Trigonometry", "Probability"],
  Biology: ["Cell Biology", "Genetics", "Ecology", "Human Physiology", "Plant Physiology"],
};

const statusMeta = {
  completed: { label: "Completed", color: "#16A34A", bg: "#F0FDF4", border: "#22C55E" },
  upcoming:  { label: "Upcoming",  color: "#2563EB", bg: "#EFF6FF", border: "#3B82F6" },
  late:      { label: "Late",      color: "#DC2626", bg: "#FEF2F2", border: "#EF4444" },
  pending:   { label: "Active",    color: "#D97706", bg: "#FFFBEB", border: "#F59E0B" },
};

type FilterStatus = "all" | "pending" | "completed" | "upcoming";

export default function TeacherDPPsPage() {
  const [dpps, setDpps] = useState<MockDPP[]>(mockDPPs);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subject: "Physics",
    chapter: "Laws of Motion",
    batchId: mockBatches[0].id,
    totalQuestions: 10,
    dueDate: "",
  });

  const filtered = filter === "all" ? dpps : dpps.filter(d => d.status === filter);

  const handleCreate = () => {
    if (!form.title || !form.dueDate) return;
    setCreating(true);
    const batch = mockBatches.find(b => b.id === form.batchId) || mockBatches[0];
    setTimeout(() => {
      const newDPP: MockDPP = {
        id: `dpp-${Date.now()}`,
        title: form.title,
        batchId: form.batchId,
        batchName: batch.name,
        subject: form.subject,
        chapter: form.chapter,
        totalQuestions: form.totalQuestions,
        dueDate: form.dueDate,
        createdAt: new Date().toISOString().split("T")[0],
        createdBy: "Dr. Vikram Seth",
        status: "pending",
        completedCount: 0,
        totalStudents: batch.studentsCount,
      };
      setDpps(prev => [newDPP, ...prev]);
      setShowModal(false);
      setCreating(false);
      setForm({ title: "", subject: "Physics", chapter: "Laws of Motion", batchId: mockBatches[0].id, totalQuestions: 10, dueDate: "" });
    }, 800);
  };

  // Stats
  const total     = dpps.length;
  const active    = dpps.filter(d => d.status === "pending").length;
  const completed = dpps.filter(d => d.status === "completed").length;
  const avgCompletion = dpps.length
    ? Math.round(dpps.reduce((s, d) => s + (d.completedCount / d.totalStudents) * 100, 0) / dpps.length)
    : 0;

  return (
    <>
      <Navbar
        title="DPP Management"
        subtitle="Create and track Daily Practice Problems across all your batches."
        breadcrumbs="Dashboard > DPPs"
      />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 48px", width: "100%" }}>

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total DPPs",  value: total,         icon: <RiFileListLine size={20} />, color: "var(--fg-default)" },
            { label: "Active",      value: active,        icon: <RiTimeLine size={20} />,     color: "#D97706" },
            { label: "Completed",   value: completed,     icon: <RiCheckLine size={20} />,    color: "#16A34A" },
            { label: "Avg Completion", value: `${avgCompletion}%`, icon: <RiTeamLine size={20} />, color: "var(--p-50)" },
          ].map(s => (
            <div key={s.label} className="rayum-card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ padding: 10, background: "var(--n-10)", borderRadius: "var(--r-md)", color: s.color }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 4, background: "var(--n-10)", padding: 4, borderRadius: "var(--r-md)", border: "1px solid var(--border-default)" }}>
            {(["all", "pending", "completed", "upcoming"] as FilterStatus[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 16px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: filter === f ? 700 : 500, background: filter === f ? "var(--bg-surface)" : "transparent", color: filter === f ? "var(--fg-default)" : "var(--fg-muted)", boxShadow: filter === f ? "var(--sh-100)" : "none", transition: "all 0.15s", textTransform: "capitalize" }}>
                {f === "all" ? `All (${total})` : f === "pending" ? `Active (${active})` : f === "completed" ? `Done (${completed})` : "Upcoming"}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }} onClick={() => setShowModal(true)}>
            <RiAddLine size={18} /> Create DPP
          </button>
        </div>

        {/* DPP List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 64, color: "var(--fg-muted)" }}>
              <RiFileListLine size={48} style={{ margin: "0 auto 16px" }} />
              <p style={{ fontWeight: 600 }}>No DPPs in this category yet.</p>
            </div>
          )}
          {filtered.map(dpp => {
            const meta = statusMeta[dpp.status];
            const pct = Math.round((dpp.completedCount / dpp.totalStudents) * 100);
            return (
              <div key={dpp.id} className="rayum-card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>
                  {dpp.status === "completed" ? "✅" : dpp.status === "upcoming" ? "🕐" : "📝"}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{dpp.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>{meta.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--fg-muted)", flexWrap: "wrap" }}>
                    <span>📚 {dpp.subject} · {dpp.chapter}</span>
                    <span><RiFileListLine size={12} style={{ verticalAlign: "middle" }} /> {dpp.totalQuestions} questions</span>
                    <span><RiTeamLine size={12} style={{ verticalAlign: "middle" }} /> {dpp.batchName}</span>
                    <span><RiCalendarLine size={12} style={{ verticalAlign: "middle" }} /> Due {dpp.dueDate}</span>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0, minWidth: 120 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    {dpp.completedCount}/{dpp.totalStudents} submitted
                  </div>
                  <div style={{ height: 6, background: "var(--n-20)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: dpp.status === "completed" ? "#22C55E" : "var(--p-50)", borderRadius: 4, transition: "width 0.4s" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Create DPP Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div className="rayum-card" style={{ width: 540, padding: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h2 style={{ fontWeight: 800, fontSize: 20 }}>Create New DPP</h2>
              <button style={{ border: "none", background: "none", cursor: "pointer", color: "var(--fg-muted)", display: "flex" }} onClick={() => setShowModal(false)}>
                <RiCloseLine size={24} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Title */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>DPP Title *</label>
                <input className="input" placeholder="e.g. Newton's Laws — Practice Set" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }} />
              </div>

              {/* Batch */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Assign to Batch *</label>
                <select className="input" value={form.batchId} onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))} style={{ width: "100%", cursor: "pointer" }}>
                  {mockBatches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.exam})</option>)}
                </select>
              </div>

              {/* Subject + Chapter */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Subject *</label>
                  <select className="input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value, chapter: CHAPTERS[e.target.value][0] }))} style={{ width: "100%", cursor: "pointer" }}>
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Chapter *</label>
                  <select className="input" value={form.chapter} onChange={e => setForm(f => ({ ...f, chapter: e.target.value }))} style={{ width: "100%", cursor: "pointer" }}>
                    {(CHAPTERS[form.subject] || []).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Questions + Due Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>No. of Questions *</label>
                  <input className="input" type="number" min={5} max={50} value={form.totalQuestions} onChange={e => setForm(f => ({ ...f, totalQuestions: parseInt(e.target.value) || 10 }))} style={{ width: "100%", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Due Date *</label>
                  <input className="input" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ padding: 14, background: "var(--n-10)", borderRadius: "var(--r-md)", fontSize: 13, color: "var(--fg-muted)" }}>
                Marking: <strong style={{ color: "var(--fg-default)" }}>+4 correct · −1 wrong · 0 unattempted</strong>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreate} disabled={creating || !form.title || !form.dueDate}>
                  {creating ? "Publishing…" : "Publish to Batch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
