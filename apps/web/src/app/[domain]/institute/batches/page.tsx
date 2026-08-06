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
import { CreateBatchModal } from "@/components/institute/CreateBatchModal";
import { cohortLabel } from "@/lib/batch-class";
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
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [expiryValue, setExpiryValue] = useState("");
  const [savingExpiry, setSavingExpiry] = useState(false);

  const filtered = batches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Grouped by the exam year the cohort sits for, newest first. A flat list
  // mixed live cohorts with ones that finished two sessions ago, and the only
  // thing telling them apart was whatever the admin typed into the name.
  const CURRENT_YEAR = new Date().getFullYear();
  const groups = (() => {
    const byYear = new Map<number | null, typeof filtered>();
    for (const batch of filtered) {
      const year = batch.target_year ?? null;
      byYear.set(year, [...(byYear.get(year) ?? []), batch]);
    }
    return [...byYear.entries()].sort((a, b) => {
      // Unclassified batches sit at the bottom rather than pretending to be
      // year zero — they need attention, not burial.
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      return b[0] - a[0];
    });
  })();

  // Past cycles collapse: they stay reachable without pushing this session's
  // cohorts off the screen.
  const [openYears, setOpenYears] = useState<Record<string, boolean>>({});
  const isYearOpen = (year: number | null) => {
    const key = String(year);
    if (key in openYears) return openYears[key];
    return year === null || year >= CURRENT_YEAR;
  };
  const toggleYear = (year: number | null) =>
    setOpenYears((prev) => ({ ...prev, [String(year)]: !isYearOpen(year) }));
  const availableExams = EXAM_OPTIONS.filter((exam) => enabledExamCodes.includes(exam.id));

  const { data: instituteData } = useApiQuery<{ institute: { enabled_exam_codes?: string[] } }>("/api/v1/institutes/me");
  const enabledExamCodes = instituteData?.institute?.enabled_exam_codes ?? [];

  // The exam calendar and the create form now live in CreateBatchModal, which
  // both this page and the institute dashboard render.
  const openModal = () => setIsModalOpen(true);

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

        {/* Batch rows, grouped by target year */}
        {!loading && !error && groups.map(([year, yearBatches]) => (
          <div key={String(year)} className="flex flex-col gap-2">
            <button
              onClick={() => toggleYear(year)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-1 py-1.5 text-left transition-colors hover:bg-b-surface2/60"
            >
              <RiArrowDownSLine
                size={18}
                className={`shrink-0 text-t-secondary transition-transform ${isYearOpen(year) ? "" : "-rotate-90"}`}
              />
              <span className="text-[13px] font-bold text-t-primary">
                {year === null ? "No target year set" : `Target ${year}`}
              </span>
              {year !== null && year < CURRENT_YEAR && (
                <span className="rounded-[6px] border border-s-stroke2/50 bg-b-surface2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-t-secondary">
                  Past
                </span>
              )}
              <span className="text-[11px] text-t-secondary">
                {yearBatches.length} batch{yearBatches.length === 1 ? "" : "es"}
              </span>
            </button>

            {isYearOpen(year) && yearBatches.map((batch, idx) => {
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
                    {[
                      EXAM_OPTIONS.find((e) => e.id === batch.exam)?.label ?? batch.exam,
                      // Derived, not stored: a class 11 cohort reads as class
                      // 12 in its second year without anyone editing it.
                      cohortLabel(batch.entry_class_level, batch.target_year),
                    ].filter(Boolean).join(" · ")}
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
        ))}
      </div>

      <CreateBatchModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        availableExams={availableExams}
        onCreate={createBatch}
        onCreated={(batchId) => {
          setIsModalOpen(false);
          router.push(`/institute/students?batch=${batchId}`);
        }}
      />

      <Modal open={Boolean(editingBatch)} onClose={() => setEditingBatch(null)} title="Manage batch" subtitle={editingBatch?.name ?? ""}>
        <div className="flex flex-col gap-3">
          <div><label className="mb-1.5 block text-sm font-semibold text-t-secondary">Expires on</label><input type="datetime-local" className="input-field w-full" value={expiryValue} onChange={(event) => setExpiryValue(event.target.value)} /><p className="mt-2 text-xs text-t-secondary">Leave empty only for a batch that is intentionally ongoing. Expired batches cannot receive new tests, DPPs, or study material.</p></div>
          <div className="flex items-center justify-between gap-3 border-t border-s-stroke2/50 pt-4"><button onClick={() => retireBatch(editingBatch)} className="btn btn-ghost px-4 text-primary-03" disabled={!editingBatch?.is_active || savingExpiry}>Deactivate batch</button><div className="flex gap-3"><button onClick={() => setEditingBatch(null)} className="btn btn-ghost px-4" disabled={savingExpiry}>Cancel</button><button onClick={saveExpiry} className="btn btn-primary px-5" disabled={savingExpiry}>{savingExpiry ? "Saving…" : "Save"}</button></div></div>
        </div>
      </Modal>

    </main>
  );
}
