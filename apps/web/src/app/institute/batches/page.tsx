"use client";

import { useState } from "react";
import {
  RiSearchLine,
  RiTeamLine,
  RiMore2Fill,
  RiGraduationCapLine,
  RiGroupLine,
  RiAddLine,
  RiArrowDownSLine,
  RiLoaderLine,
  RiCheckLine,
  RiAlertLine,
  RiInboxLine,
} from "@remixicon/react";
import { useBatches } from "@/lib/hooks/useBatches";
import { Modal } from "@/components/shared/Modal";

// Exam codes must match the `exams` table in Supabase
const EXAM_OPTIONS = [
  { id: "jee-main",     label: "JEE Main" },
  { id: "jee-advanced", label: "JEE Advanced" },
  { id: "neet-ug",      label: "NEET UG" },
  { id: "ssc-cgl",      label: "SSC CGL" },
  { id: "ssc-chsl",     label: "SSC CHSL" },
  { id: "ssc-mts",      label: "SSC MTS" },
];

const COLORS = [
  "bg-primary-01/10 text-primary-01 border-primary-01/20",
  "bg-primary-02/10 text-primary-02 border-primary-02/20",
  "bg-primary-05/10 text-primary-05 border-primary-05/20",
  "bg-primary-03/10 text-primary-03 border-primary-03/20",
];

export default function BatchesPage() {
  const { batches, loading, error, createBatch, refetch } = useBatches();
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", exam: "", max_students: "", max_teachers: "" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const filtered = batches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = () => {
    setForm({ name: "", exam: "", max_students: "", max_teachers: "" });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name || !form.exam) return;
    setSubmitting(true);
    setFeedback(null);
    const result = await createBatch({
      name: form.name,
      exam: form.exam,
      max_students: form.max_students ? Number(form.max_students) : null,
      max_teachers: form.max_teachers ? Number(form.max_teachers) : null,
    });
    setSubmitting(false);
    if (result.success) {
      setFeedback({ ok: true, msg: "Batch created successfully!" });
      setTimeout(() => setIsModalOpen(false), 900);
    } else {
      setFeedback({ ok: false, msg: result.message });
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">

      {/* ── Top Navigation Row ── */}
      <div className="flex flex-row justify-between items-center w-full h-12 gap-6">
        <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary dark:text-t-primary">
          Batches
        </h1>

        <div className="flex flex-row items-center gap-3">
          {/* Search */}
          <div className="flex flex-row items-center bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2 dark:border-s-stroke2/40 rounded-[10px] px-3 py-2 w-72 h-12 gap-2 shadow-xs">
            <RiSearchLine size={20} className="text-t-secondary dark:text-t-tertiary" />
            <input
              type="text"
              placeholder="Search batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-t-primary dark:text-t-primary placeholder-t-secondary w-full"
            />
          </div>

          {/* Create Button */}
          <button
            onClick={openModal}
            className="flex flex-row justify-center items-center gap-1.5 px-6 h-12 bg-gradient-to-b from-[#2C2C2C] to-[#282828] dark:from-t-primary dark:to-t-primary/90 text-t-light dark:text-b-surface1 text-sm font-sans font-semibold rounded-[10px] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] active:scale-95 transition-all cursor-pointer"
          >
            <RiAddLine size={18} />Create Batch
          </button>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex flex-col gap-2">
        <h2 className="font-sans font-semibold text-[20px] leading-[145%] text-t-primary dark:text-t-primary">
          All Batches
        </h2>
        <p className="text-xs text-t-secondary dark:text-t-tertiary">
          Configure class cohorts, monitor student enrollment sizes, and assign lecturing faculty.
        </p>
      </div>

      {/* ── Batch List ── */}
      <div className="flex flex-col gap-3 w-full">

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[96px] rounded-[24px] bg-white dark:bg-white/[0.02] border border-s-stroke2/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-[10px] bg-primary-03/5 border border-primary-03/20 text-primary-03 text-sm">
            <RiAlertLine size={18} />
            <span>{error}</span>
            <button onClick={refetch} className="ml-auto underline text-xs">Retry</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-t-tertiary">
            <RiInboxLine size={48} className="opacity-40" />
            <p className="text-sm font-medium">
              {searchQuery ? "No batches match your search." : "No batches yet. Create your first batch!"}
            </p>
            {!searchQuery && (
              <button
                onClick={openModal}
                className="mt-2 flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-b-surface2 border border-s-stroke2/50 text-sm font-semibold text-t-secondary hover:text-t-primary transition-all"
              >
                <RiAddLine size={16} /> Create Batch
              </button>
            )}
          </div>
        )}

        {/* Batch rows */}
        {!loading && !error && filtered.map((batch, idx) => {
          const colorClass = COLORS[idx % COLORS.length];

          return (
            <div
              key={batch.id}
              className="group/item relative flex flex-row items-center justify-between p-4 gap-8 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all h-[96px] cursor-pointer"
            >

              {/* Left */}
              <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden relative z-10">
                <div className={`flex w-16 h-16 items-center justify-center rounded-[10px] border shrink-0 ${colorClass}`}>
                  <RiTeamLine size={24} />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary truncate">
                    {batch.name}
                  </span>
                  <span className="text-xs text-t-secondary dark:text-t-tertiary mt-0.5 uppercase tracking-wide">
                    {batch.exam}
                  </span>
                </div>
              </div>

              {/* Right */}
              <div className="flex flex-row items-center gap-8 shrink-0 relative z-10">
                {/* Students */}
                <div className="flex flex-col items-end justify-center min-w-[80px]">
                  <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider flex items-center gap-0.5">
                    <RiGroupLine size={10} /> Students
                  </span>
                  <span className="text-[16px] font-sans font-bold text-t-primary dark:text-t-primary mt-0.5">
                    {batch.max_students ?? "—"}
                  </span>
                </div>

                {/* Faculty */}
                <div className="flex flex-col items-end justify-center min-w-[80px]">
                  <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider flex items-center gap-0.5">
                    <RiGraduationCapLine size={10} /> Faculty
                  </span>
                  <span className="text-[16px] font-sans font-bold text-t-primary dark:text-t-primary mt-0.5">
                    {batch.max_teachers ?? "—"}
                  </span>
                </div>

                {/* Active badge */}
                <div className="min-w-[100px] flex justify-end">
                  <span className="px-3 py-1.5 border rounded-[10px] text-[10px] font-bold uppercase tracking-wider bg-primary-02/5 border-primary-02/15 text-primary-02">
                    Active
                  </span>
                </div>

                {/* More */}
                <button className="flex items-center justify-center size-8 rounded-full text-t-secondary hover:text-t-primary dark:hover:text-t-primary hover:bg-b-surface1 dark:hover:bg-b-surface3 border border-s-stroke2/30 bg-b-surface2 dark:bg-b-surface2 transition-all active:scale-95 shadow-xs shrink-0">
                  <RiMore2Fill size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Create Batch Modal ── */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Batch"
        subtitle="Fill in the details to create a new batch"
      >
        <div className="flex flex-col gap-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Batch Name</label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="e.g., Target 2026 Morning"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Exam */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Target Exam</label>
            <div className="relative">
              <select
                className="input-field w-full appearance-none pr-10"
                value={form.exam}
                onChange={(e) => setForm({ ...form, exam: e.target.value })}
              >
                <option value="" disabled>Select Exam...</option>
                {EXAM_OPTIONS.map((e) => (
                  <option key={e.id} value={e.id}>{e.label}</option>
                ))}
              </select>
              <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
            </div>
          </div>

          {/* Students + Faculty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Total Students</label>
              <input
                type="number"
                min="1"
                className="input-field w-full"
                placeholder="e.g., 60"
                value={form.max_students}
                onChange={(e) => setForm({ ...form, max_students: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Total Faculty</label>
              <input
                type="number"
                min="1"
                className="input-field w-full"
                placeholder="e.g., 4"
                value={form.max_teachers}
                onChange={(e) => setForm({ ...form, max_teachers: e.target.value })}
              />
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-[10px] border ${
              feedback.ok
                ? "bg-primary-02/5 border-primary-02/20 text-primary-02"
                : "bg-primary-03/5 border-primary-03/20 text-primary-03"
            }`}>
              {feedback.ok ? <RiCheckLine size={16} /> : <RiAlertLine size={16} />}
              {feedback.msg}
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center justify-end gap-3 pt-4 border-t border-s-stroke2/50">
            <button
              onClick={() => setIsModalOpen(false)}
              className="btn btn-ghost px-5"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary px-6 shadow-md flex items-center gap-2"
              onClick={handleCreate}
              disabled={!form.name || !form.exam || submitting}
            >
              {submitting && <RiLoaderLine size={16} className="animate-spin" />}
              {submitting ? "Creating..." : "Create Batch"}
            </button>
          </div>
        </div>
      </Modal>

    </main>
  );
}
