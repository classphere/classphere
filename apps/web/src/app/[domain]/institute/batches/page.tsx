"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { apiClient } from "@/lib/api.client";

// Exam codes must match the `exams` table in Supabase
const EXAM_OPTIONS = [
  { id: "jee-main",          label: "JEE Main" },
  { id: "jee-advanced",      label: "JEE Advanced" },
  { id: "jee-main-advanced", label: "JEE Main + Advanced" },
  { id: "neet-ug",           label: "NEET UG" },
];

const COLORS = [
  "bg-primary-01/10 text-primary-01 border-primary-01/20",
  "bg-primary-02/10 text-primary-02 border-primary-02/20",
  "bg-primary-05/10 text-primary-05 border-primary-05/20",
  "bg-primary-03/10 text-primary-03 border-primary-03/20",
];

export default function BatchesPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { batches, loading, error, createBatch, updateBatch, deactivateBatch, refetch } = useBatches();
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", exam: "", starts_at: "", ends_at: "" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [expiryValue, setExpiryValue] = useState("");
  const [savingExpiry, setSavingExpiry] = useState(false);

  const filtered = batches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const availableExams = EXAM_OPTIONS.filter((exam) => enabledExamCodes.includes(exam.id));

  const { data: instituteData } = useApiQuery<{ institute: { enabled_exam_codes?: string[] } }>("/api/v1/institutes/me");
  const enabledExamCodes = instituteData?.institute?.enabled_exam_codes ?? [];

  const { data: calendarData } = useApiQuery<{ calendar: { exam_code: string; suggested_ends_at: string; notes: string | null }[] }>(
    "/api/v1/batches/exam-calendar",
  );
  const examCalendar: Record<string, { suggested_ends_at: string; notes: string | null }> =
    Object.fromEntries((calendarData?.calendar ?? []).map((row) => [row.exam_code, { suggested_ends_at: row.suggested_ends_at, notes: row.notes }]));

  const openModal = () => {
    setForm({ name: "", exam: "", starts_at: "", ends_at: "" });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleExamChange = (examCode: string) => {
    const cal = examCalendar[examCode];
    const suggestedDate = cal?.suggested_ends_at
      ? new Date(cal.suggested_ends_at).toISOString().slice(0, 10) + "T23:59"
      : "";
    setForm((f) => ({ ...f, exam: examCode, ends_at: suggestedDate }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.exam) return;
    setSubmitting(true);
    setFeedback(null);
    const result = await createBatch({
      name: form.name,
      exam: form.exam,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
    });
    setSubmitting(false);
    if (result.success) {
      router.push(`/institute/students?batch=${result.batch?.id}`);
    } else {
      setFeedback({ ok: false, msg: result.message });
    }
  };

  const openExpiryEditor = (batch: any) => {
    setEditingBatch(batch);
    setExpiryValue(batch.ends_at ? new Date(batch.ends_at).toISOString().slice(0, 16) : "");
  };

  const saveExpiry = async () => {
    if (!editingBatch) return;
    setSavingExpiry(true);
    const result = await updateBatch(editingBatch.id, { ends_at: expiryValue ? new Date(expiryValue).toISOString() : null });
    setSavingExpiry(false);
    if (result.success) setEditingBatch(null); else window.alert(result.message);
  };

  const retireBatch = async (batch: any) => {
    if (!window.confirm(`Deactivate ${batch.name}? Students can keep their historical records, but it will no longer accept new work.`)) return;
    const result = await deactivateBatch(batch.id);
    if (!result.success) window.alert(result.message);
  };

  return (
    <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-3 select-none bg-transparent">

      {/* ── Top Navigation Row ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4 md:gap-3 mb-2">
        <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary dark:text-t-primary">
          Batches
        </h1>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="flex flex-row items-center bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2 dark:border-s-stroke2/40 rounded-[10px] px-3 py-2 w-full sm:w-72 h-12 gap-2 shadow-xs shrink-0 sm:shrink">
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
            className="flex flex-row justify-center items-center gap-1.5 px-6 h-12 w-full sm:w-auto bg-gradient-to-b from-[#2C2C2C] to-[#282828] dark:from-t-primary dark:to-t-primary/90 text-t-light dark:text-b-surface1 text-sm font-sans font-semibold rounded-[10px] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
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
          Create cohorts, add students from Excel, and assign faculty when you are ready.
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
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-t-tertiary">
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
          const now = Date.now();
          const expired = Boolean(batch.ends_at && Date.parse(batch.ends_at) <= now);
          const upcoming = Boolean(batch.starts_at && Date.parse(batch.starts_at) > now);
          const lifecycleLabel = !batch.is_active ? "Retired" : expired ? "Expired" : upcoming ? "Upcoming" : "Active";

          return (
            <div
              key={batch.id}
              className="group/item relative flex flex-row items-center p-2.5 sm:p-3 gap-3 sm:gap-4 bg-b-surface2 border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all h-[76px] sm:h-[88px] cursor-pointer w-full overflow-hidden"
            >

              {/* Left */}
              <div className="flex flex-row items-center gap-3 sm:gap-3 flex-1 min-w-0">
                <div className={`flex size-10 sm:w-12 sm:h-12 items-center justify-center rounded-[12px] border shrink-0 font-bold ${colorClass}`}>
                  <RiTeamLine size={24} className="scale-75 sm:scale-100" />
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <span className="font-sans font-semibold text-[13px] sm:text-[16px] text-t-primary dark:text-t-primary truncate">
                    {batch.name}
                  </span>
                  <span className="text-[11px] sm:text-xs text-t-secondary mt-0.5 uppercase tracking-wide truncate">
                    {EXAM_OPTIONS.find((e) => e.id === batch.exam)?.label ?? batch.exam}
                  </span>
                </div>
              </div>

              {/* Right */}
              <div className="flex flex-row items-center gap-2 sm:gap-3 shrink-0">
                <div className="hidden sm:flex flex-col gap-1 sm:gap-1.5 justify-center min-w-[50px] sm:min-w-[90px]">
                  {/* Students Row */}
                  <div className="flex items-center justify-between gap-3 sm:gap-4 w-full">
                    <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider flex items-center gap-1">
                      <RiGroupLine size={12} />
                      <span>Students</span>
                    </span>
                    <span className="text-[13px] font-bold text-t-primary">
                      {batch.max_students ?? "—"}
                    </span>
                  </div>

                  {/* Faculty Row */}
                  <div className="flex items-center justify-between gap-3 sm:gap-4 w-full">
                    <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider flex items-center gap-1">
                      <RiGraduationCapLine size={12} />
                      <span>Faculty</span>
                    </span>
                    <span className="text-[13px] font-bold text-t-primary">
                      {batch.max_teachers ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Mobile Info */}
                <div className="flex sm:hidden flex-col items-end justify-center">
                  <span className="text-[11px] font-sans font-bold text-t-primary">
                    <RiGroupLine size={10} className="inline mr-1" />{batch.max_students ?? "—"}
                  </span>
                  <span className="text-[11px] font-sans font-bold text-t-primary mt-0.5">
                    <RiGraduationCapLine size={10} className="inline mr-1" />{batch.max_teachers ?? "—"}
                  </span>
                </div>

                {/* Active badge */}
                <div className="shrink-0 flex justify-end">
                  <span className={`px-2 py-0.5 sm:px-3 sm:py-1.5 border rounded-[10px] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${lifecycleLabel === "Active" ? "bg-primary-02/5 border-primary-02/15 text-primary-02" : "bg-primary-03/5 border-primary-03/20 text-primary-03"}`}>
                    {lifecycleLabel}
                  </span>
                </div>

                {/* More */}
                <div className="shrink-0 pl-1 sm:pl-0">
                  <button onClick={(event) => { event.stopPropagation(); openExpiryEditor(batch); }} title="Manage batch lifecycle" className="flex items-center justify-center size-8 rounded-full text-t-secondary hover:text-t-primary dark:hover:text-t-primary hover:bg-b-surface1 dark:hover:bg-b-surface3 border border-s-stroke2/30 bg-b-surface2 dark:bg-b-surface2 transition-all active:scale-95 shadow-xs shrink-0">
                    <RiMore2Fill size={18} />
                  </button>
                </div>
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
        <div className="flex flex-col gap-3">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-semibold text-t-secondary">Starts on</label><input type="datetime-local" className="input-field w-full" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-sm font-semibold text-t-secondary">Expires on</label><input type="datetime-local" className="input-field w-full" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
          </div>

          {/* Exam */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Target Exam</label>
            <div className="relative">
              <select
                className="input-field w-full appearance-none pr-10"
                value={form.exam}
                onChange={(e) => handleExamChange(e.target.value)}
              >
                <option value="" disabled>Select Exam...</option>
                {availableExams.map((e) => (
                  <option key={e.id} value={e.id}>{e.label}</option>
                ))}
              </select>
              <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
            </div>
            {form.exam && examCalendar[form.exam] && (
              <p className="mt-1.5 text-xs text-t-secondary">
                📅 Suggested expiry: <strong>{new Date(examCalendar[form.exam].suggested_ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>
                {examCalendar[form.exam].notes ? ` · ${examCalendar[form.exam].notes}` : ""}
              </p>
            )}
          </div>

          <p className="rounded-[10px] border border-s-stroke2/50 bg-b-surface2/60 px-3 py-2.5 text-xs text-t-secondary">
            After creating the batch, you will add students from an Excel or CSV file. Expired batches cannot receive new learning activity, but their records remain available.
          </p>

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

      <Modal open={Boolean(editingBatch)} onClose={() => setEditingBatch(null)} title="Manage batch" subtitle={editingBatch?.name ?? ""}>
        <div className="flex flex-col gap-3">
          <div><label className="mb-1.5 block text-sm font-semibold text-t-secondary">Expires on</label><input type="datetime-local" className="input-field w-full" value={expiryValue} onChange={(event) => setExpiryValue(event.target.value)} /><p className="mt-2 text-xs text-t-secondary">Leave empty only for a batch that is intentionally ongoing. Expired batches cannot receive new tests, DPPs, or study material.</p></div>
          <div className="flex items-center justify-between gap-3 border-t border-s-stroke2/50 pt-4"><button onClick={() => retireBatch(editingBatch)} className="btn btn-ghost px-4 text-primary-03" disabled={!editingBatch?.is_active || savingExpiry}>Deactivate batch</button><div className="flex gap-3"><button onClick={() => setEditingBatch(null)} className="btn btn-ghost px-4" disabled={savingExpiry}>Cancel</button><button onClick={saveExpiry} className="btn btn-primary px-5" disabled={savingExpiry}>{savingExpiry ? "Saving…" : "Save"}</button></div></div>
        </div>
      </Modal>

    </main>
  );
}
