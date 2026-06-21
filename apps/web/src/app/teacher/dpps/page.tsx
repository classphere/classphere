"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import {
  RiAddLine,
  RiFileListLine,
  RiTeamLine,
  RiCalendarLine,
  RiCheckLine,
  RiTimeLine,
  RiCloseLine
} from "@remixicon/react";
import { mockDPPs, mockBatches, type MockDPP } from "@/lib/mock-data";

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology"];
const CHAPTERS: Record<string, string[]> = {
  Physics: ["Laws of Motion", "Thermodynamics", "Electrostatics", "Optics", "Modern Physics", "Waves"],
  Chemistry: ["Some Basic Concepts", "Atomic Structure", "Chemical Bonding", "Equilibrium", "Organic Chemistry"],
  Mathematics: ["Calculus", "Algebra", "Coordinate Geometry", "Trigonometry", "Probability"],
  Biology: ["Cell Biology", "Genetics", "Ecology", "Human Physiology", "Plant Physiology"],
};

const statusMeta: Record<string, { label: string; badgeClass: string; icon: string }> = {
  completed: { label: "Completed", badgeClass: "label-green", icon: "✅" },
  upcoming:  { label: "Upcoming",  badgeClass: "label-gray", icon: "🕐" },
  late:      { label: "Late",      badgeClass: "label-red", icon: "⚠️" },
  pending:   { label: "Active",    badgeClass: "label-yellow", icon: "📝" },
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
      
      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-10 md:px-8">
        {/* KPI Row */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total DPPs",  value: total,         icon: <RiFileListLine size={20} />, statusClass: "text-t-primary" },
            { label: "Active",      value: active,        icon: <RiTimeLine size={20} />,     statusClass: "text-[#EF9D0E]" },
            { label: "Completed",   value: completed,     icon: <RiCheckLine size={20} />,    statusClass: "text-[#00A656]" },
            { label: "Avg Completion", value: `${avgCompletion}%`, icon: <RiTeamLine size={20} />, statusClass: "text-t-blue" },
          ].map(s => (
            <div key={s.label} className="group relative card flex items-center gap-4 p-5 border border-s-stroke2 bg-b-surface1 transition-all overflow-hidden hover:border-transparent">
              <div className="box-hover" />
              <div className={`relative z-10 p-2.5 bg-b-surface2 rounded-xl border border-s-stroke2 ${s.statusClass}`}>
                {s.icon}
              </div>
              <div className="relative z-10">
                <div className={`text-h5 font-bold tracking-tight mb-0.5 ${s.statusClass}`}>{s.value}</div>
                <div className="text-caption text-t-secondary">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Filter tabs */}
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-3xl border border-s-stroke2 bg-b-surface2 p-1">
            {(["all", "pending", "completed", "upcoming"] as FilterStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-2xl border-none px-4 py-1.5 text-caption font-semibold capitalize transition-all cursor-pointer ${
                  filter === f
                    ? "bg-b-surface1 text-t-primary shadow-widget"
                    : "bg-transparent text-t-secondary hover:text-t-primary"
                }`}
              >
                {f === "all" ? `All (${total})` : f === "pending" ? `Active (${active})` : f === "completed" ? `Done (${completed})` : "Upcoming"}
              </button>
            ))}
          </div>

          <button className="btn btn-sm btn-primary flex items-center gap-1 self-start lg:self-auto" onClick={() => setShowModal(true)}>
            <RiAddLine size={16} /> Create DPP
          </button>
        </div>

        {/* DPP List */}
        <div className="flex flex-col gap-4">
          {filtered.length === 0 && (
            <div className="card text-center py-20 text-t-secondary border border-s-stroke2 bg-b-surface1">
              <RiFileListLine size={48} className="mx-auto mb-4 text-t-tertiary" />
              <p className="font-semibold text-body-2">No DPPs in this category yet.</p>
            </div>
          )}
          
          {filtered.map(dpp => {
            const meta = statusMeta[dpp.status];
            const pct = Math.round((dpp.completedCount / dpp.totalStudents) * 100);
            return (
              <div key={dpp.id} className="group relative card flex min-w-0 items-center gap-5 overflow-hidden border border-s-stroke2 bg-b-surface1 p-5 transition-all hover:border-transparent">
                <div className="box-hover" />
                
                <div className={`relative z-10 size-11 rounded-xl flex items-center justify-center shrink-0 text-xl bg-b-surface2 border border-s-stroke2`}>
                  {meta.icon}
                </div>

                <div className="relative z-10 flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-body-2 font-bold text-t-primary truncate">{dpp.title}</span>
                    <span className={`label ${meta.badgeClass}`}>{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-caption text-t-secondary flex-wrap mt-1">
                    <span>📚 {dpp.subject} · {dpp.chapter}</span>
                    <span>{dpp.totalQuestions} questions</span>
                    <span>{dpp.batchName}</span>
                    <span>Due: {dpp.dueDate}</span>
                  </div>
                </div>

                <div className="relative z-10 shrink-0 text-right sm:w-40">
                  <div className="text-caption font-bold text-t-primary mb-2">
                    {dpp.completedCount}/{dpp.totalStudents} submitted
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-s-stroke2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${dpp.status === "completed" ? "bg-[#00A656]" : "bg-linear-to-r from-primary-01 to-primary-02"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-caption font-semibold text-t-secondary">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Create DPP Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="card w-full max-w-2xl border border-s-stroke2 bg-b-surface1 p-6 shadow-depth md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sub-title-2 font-bold text-t-primary">Create New DPP</h2>
              <button
                className="flex items-center justify-center size-8 rounded-full text-t-secondary hover:text-t-primary hover:bg-b-surface2 border-0 bg-transparent transition-colors cursor-pointer"
                onClick={() => setShowModal(false)}
              >
                <RiCloseLine size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {/* Title */}
              <div>
                <label className="block text-caption font-bold text-t-secondary mb-2">DPP Title *</label>
                <input
                  className="input"
                  placeholder="e.g. Newton's Laws — Practice Set"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Batch */}
              <div>
                <label className="block text-caption font-bold text-t-secondary mb-2">Assign to Batch *</label>
                <select
                  className="input"
                  value={form.batchId}
                  onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}
                >
                  {mockBatches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.exam})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject + Chapter */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-caption font-bold text-t-secondary mb-2">Subject *</label>
                  <select
                    className="input"
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value, chapter: CHAPTERS[e.target.value][0] }))}
                  >
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-caption font-bold text-t-secondary mb-2">Chapter *</label>
                  <select
                    className="input"
                    value={form.chapter}
                    onChange={e => setForm(f => ({ ...f, chapter: e.target.value }))}
                  >
                    {(CHAPTERS[form.subject] || []).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Questions + Due Date */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-caption font-bold text-t-secondary mb-2">No. of Questions *</label>
                  <input
                    className="input"
                    type="number"
                    min={5}
                    max={50}
                    value={form.totalQuestions}
                    onChange={e => setForm(f => ({ ...f, totalQuestions: parseInt(e.target.value) || 10 }))}
                  />
                </div>
                <div>
                  <label className="block text-caption font-bold text-t-secondary mb-2">Due Date *</label>
                  <input
                    className="input"
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="text-caption text-t-secondary p-3.5 bg-b-surface2 border border-s-stroke2 rounded-2xl">
                Marking scheme: <strong className="text-t-primary">+4 correct · −1 wrong · 0 unattempted</strong>
              </div>

              <div className="flex gap-4 mt-2">
                <button className="btn btn-outline flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={handleCreate}
                  disabled={creating || !form.title || !form.dueDate}
                >
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
