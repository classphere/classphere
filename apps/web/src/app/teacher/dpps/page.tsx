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
  RiCloseLine,
  RiBookOpenLine,
  RiCheckboxCircleFill,
  RiAlertFill,
  RiFileList3Line,
  RiCalendarEventLine
} from "@remixicon/react";
import { mockDPPs, mockBatches, type MockDPP } from "@/lib/mock-data";

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology"];
const CHAPTERS: Record<string, string[]> = {
  Physics: ["Laws of Motion", "Thermodynamics", "Electrostatics", "Optics", "Modern Physics", "Waves"],
  Chemistry: ["Some Basic Concepts", "Atomic Structure", "Chemical Bonding", "Equilibrium", "Organic Chemistry"],
  Mathematics: ["Calculus", "Algebra", "Coordinate Geometry", "Trigonometry", "Probability"],
  Biology: ["Cell Biology", "Genetics", "Ecology", "Human Physiology", "Plant Physiology"],
};

const statusMeta: Record<string, { label: string; badgeClass: string; icon: React.ReactNode; iconContainerClass: string }> = {
  completed: { 
    label: "Completed", 
    badgeClass: "label-green", 
    icon: <RiCheckboxCircleFill size={20} />, 
    iconContainerClass: "bg-[#00A656]/10 border border-[#00A656]/20 text-[#00A656]" 
  },
  upcoming:  { 
    label: "Upcoming",  
    badgeClass: "label-gray",  
    icon: <RiCalendarEventLine size={20} />, 
    iconContainerClass: "bg-[rgba(123,123,123,0.1)] border border-[rgba(123,123,123,0.15)] text-[#7B7B7B]" 
  },
  late:      { 
    label: "Late",      
    badgeClass: "label-red",   
    icon: <RiAlertFill size={20} />, 
    iconContainerClass: "bg-[#FF6A55]/10 border border-[#FF6A55]/20 text-[#FF6A55]" 
  },
  pending:   { 
    label: "Active",    
    badgeClass: "label-yellow", 
    icon: <RiFileList3Line size={20} />, 
    iconContainerClass: "bg-[#EF9D0E]/10 border border-[#EF9D0E]/20 text-[#EF9D0E]" 
  },
};

type FilterStatus = "all" | "pending" | "completed" | "upcoming";

export default function TeacherDPPsPage() {
  const [dpps, setDpps] = useState<MockDPP[]>(mockDPPs);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subject: "Physics",
    chapter: "Laws of Motion",
    batchId: mockBatches[0].id,
    totalQuestions: 10,
    dueDate: "",
  });

  const filtered = dpps.filter(d => {
    const matchesStatus = filter === "all" ? true : d.status === filter;
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.chapter.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
        {/* KPI Row (p-2 grey nested background container, matching top cards) */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-lg mb-8">
          {[
            { label: "Total DPPs",  value: total,         icon: <RiFileListLine size={20} />, statusClass: "text-[#101010] dark:text-t-primary", bgClass: "bg-b-surface2 border border-s-stroke2 text-t-primary" },
            { label: "Active",      value: active,        icon: <RiFileList3Line size={20} />,     statusClass: "text-[#EF9D0E]", bgClass: "bg-[#EF9D0E]/10 border border-[#EF9D0E]/20 text-[#EF9D0E]" },
            { label: "Completed",   value: completed,     icon: <RiCheckboxCircleFill size={20} />,    statusClass: "text-[#00A656]", bgClass: "bg-[#00A656]/10 border border-[#00A656]/20 text-[#00A656]" },
            { label: "Avg Completion", value: `${avgCompletion}%`, icon: <RiTeamLine size={20} />, statusClass: "text-[#2A85FF]", bgClass: "bg-[#2A85FF]/10 border border-[#2A85FF]/20 text-[#2A85FF]" },
          ].map(s => (
            <div key={s.label} className="group relative flex items-center gap-4 p-5 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] transition-all overflow-hidden w-full">
              <div className="box-hover" />
              <div className={`relative z-10 p-2.5 rounded-lg flex items-center justify-center shrink-0 ${s.bgClass}`}>
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
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-s-stroke2 bg-b-surface2 p-1">
            {(["all", "pending", "completed", "upcoming"] as FilterStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-lg border-none px-4 py-1.5 text-caption font-semibold capitalize transition-all cursor-pointer ${
                  filter === f
                    ? "bg-b-surface1 text-t-primary shadow-widget"
                    : "bg-transparent text-t-secondary hover:text-t-primary"
                }`}
              >
                {f === "all" ? `All (${total})` : f === "pending" ? `Active (${active})` : f === "completed" ? `Done (${completed})` : "Upcoming"}
              </button>
            ))}
          </div>

          {/* Search & Create Section */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search Input (Figma Spec: rounded 90px pill) */}
            <div className="relative w-full sm:w-[315px] h-12 flex items-center bg-[#FDFDFD] dark:bg-b-surface2 border border-[#E2E2E2] dark:border-s-stroke2/30 rounded-lg px-4 shadow-[0px_2px_4px_rgba(8,8,8,0.02)]">
              <input
                type="text"
                placeholder="Search DPPs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-full bg-transparent border-none text-[14px] font-sans font-normal text-[#101010] dark:text-t-primary placeholder-[#727272] focus:outline-none"
              />
            </div>

            {/* Create DPP Button (Figma Spec: gradient background, rounded 32px pill, inset shadow) */}
            <button 
              className="flex flex-row justify-center items-center h-12 px-6 bg-gradient-to-b from-[#2C2C2C] to-[#282828] hover:from-[#3c3c3c] hover:to-[#383838] text-[#FDFDFD] dark:from-t-primary dark:to-t-primary/90 dark:text-b-surface1 text-[14px] font-sans font-semibold rounded-lg transition-all active:scale-95 shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] cursor-pointer"
              onClick={() => setShowModal(true)}
            >
              <RiAddLine size={18} className="mr-1" /> Create DPP
            </button>
          </div>
        </div>

        {/* DPP List (p-2 grey nested background container, matching dashboard style) */}
        <div className="relative z-10 flex flex-col p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-lg">
          {filtered.length === 0 && (
            <div className="card text-center py-20 text-[#7B7B7B] border border-[#E2E2E2] bg-[#FDFDFD] dark:bg-b-surface2 rounded-lg">
              <RiFileListLine size={48} className="mx-auto mb-4 text-[#7B7B7B]/50" />
              <p className="font-semibold text-body-2">No DPPs in this category yet.</p>
            </div>
          )}
          
          {filtered.map(dpp => {
            const meta = statusMeta[dpp.status];
            const pct = Math.round((dpp.completedCount / dpp.totalStudents) * 100);
            return (
              <div 
                key={dpp.id} 
                className="group relative card flex flex-col md:flex-row min-w-0 md:items-center justify-between gap-5 overflow-hidden bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 p-5 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] transition-all hover:scale-[1.005]"
              >
                <div className="box-hover" />
                
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`relative z-10 size-11 rounded-lg flex items-center justify-center shrink-0 ${meta.iconContainerClass}`}>
                    {meta.icon}
                  </div>

                  <div className="relative z-10 flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-body-2 font-bold text-[#101010] dark:text-t-primary truncate">{dpp.title}</span>
                      <span className={`label ${meta.badgeClass}`}>{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-caption text-[#7B7B7B] flex-wrap mt-1">
                      <span className="flex items-center gap-1">
                        <RiBookOpenLine size={14} className="text-[#7B7B7B] shrink-0" />
                        <span>{dpp.subject} · {dpp.chapter}</span>
                      </span>
                      <span>·</span>
                      <span>{dpp.totalQuestions} questions</span>
                      <span>·</span>
                      <span>{dpp.batchName}</span>
                      <span>·</span>
                      <span>Due: {dpp.dueDate}</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between md:justify-end gap-6 shrink-0 mt-4 md:mt-0">
                  <div className="text-left md:text-right sm:w-40">
                    <div className="text-caption font-bold text-[#101010] dark:text-t-primary mb-2">
                      {dpp.completedCount}/{dpp.totalStudents} submitted
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-s-stroke2 rounded-full overflow-hidden min-w-[80px]">
                        <div
                          className={`h-full rounded-full ${dpp.status === "completed" ? "bg-[#00A656]" : "bg-gradient-to-r from-[#EF9D0E] to-[#F1C40F]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-caption font-semibold text-[#7B7B7B]">{pct}%</span>
                    </div>
                  </div>

                  <button className="flex flex-row justify-center items-center h-8 px-4 bg-[#101010] hover:bg-[#202020] text-[#FDFDFD] dark:bg-t-primary dark:text-b-surface1 dark:hover:bg-t-primary/90 text-[12px] font-sans font-semibold rounded-lg transition-all active:scale-95 shadow-widget">
                    {dpp.status === "completed" ? "Reports" : dpp.status === "upcoming" ? "Edit" : "Stats"}
                  </button>
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

              <div className="text-caption text-t-secondary p-3.5 bg-b-surface2 border border-s-stroke2 rounded-lg">
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
