"use client";

import { useState } from "react";
import {
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiAddLine,
  RiMore2Fill,
  RiStarFill,
  RiGraduationCapLine,
  RiBookOpenLine,
  RiLoaderLine,
  RiCheckLine,
  RiAlertLine,
  RiInboxLine,
  RiArrowDownSLine,
  RiTeamLine,
} from "@remixicon/react";
import { useFaculty } from "@/lib/hooks/useFaculty";
import { useBatches } from "@/lib/hooks/useBatches";
import { Modal } from "@/components/shared/Modal";

// Position options
const POSITION_OPTIONS = [
  { id: "HOD", label: "HOD" },
  { id: "Senior Faculty", label: "Senior Faculty" },
  { id: "Faculty", label: "Faculty" },
  { id: "Junior Faculty", label: "Junior Faculty" },
  { id: "Fresher Faculty", label: "Fresher Faculty" },
];

// Subject options
const SUBJECT_OPTIONS = [
  { id: "Physics", label: "Physics" },
  { id: "Chemistry", label: "Chemistry" },
  { id: "Mathematics", label: "Mathematics" },
  { id: "Biology", label: "Biology" },
];

const SUBJECT_COLORS: Record<string, { badge: string; initials: string }> = {
  Physics: {
    badge: "bg-primary-01/5 border-primary-01/15 text-primary-01",
    initials: "bg-primary-01/10 text-primary-01"
  },
  Chemistry: {
    badge: "bg-primary-05/5 border-primary-05/15 text-primary-05",
    initials: "bg-primary-05/10 text-primary-05"
  },
  Mathematics: {
    badge: "bg-[#8F3FFF]/5 border-[#8F3FFF]/15 text-[#8F3FFF]",
    initials: "bg-[#8F3FFF]/10 text-[#8F3FFF]"
  },
  Biology: {
    badge: "bg-primary-02/5 border-primary-02/15 text-primary-02",
    initials: "bg-primary-02/10 text-primary-02"
  }
};

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  position: "",
  subject: "",
  batch_id: "",
  rating: "",
};

export default function InstituteFacultyPage() {
  const { faculty, loading, error, addFaculty, removeFaculty, refetch } = useFaculty();
  const { batches, loading: batchesLoading } = useBatches();
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name}? Their sign-in and all batch assignments will be disabled, while history is retained.`)) return;
    setRemovingId(id);
    const result = await removeFaculty(id);
    setRemovingId(null);
    if (!result.success) window.alert(result.message);
  };

  const filteredFaculty = faculty.filter(fac =>
    fac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fac.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.position || !form.subject || !form.batch_id) return;

    const ratingNum = form.rating ? Number(form.rating) : 0;
    if (ratingNum < 0 || ratingNum > 5) {
      setFeedback({ ok: false, msg: "Rating must be between 0.0 and 5.0" });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const result = await addFaculty({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      position: form.position,
      subject: form.subject,
      batch_id: form.batch_id,
      rating: ratingNum,
    });

    setSubmitting(false);
    if (result.success) {
      setFeedback({ ok: true, msg: "Faculty member added! Invite email sent." });
      setTimeout(() => setIsModalOpen(false), 1200);
    } else {
      setFeedback({ ok: false, msg: result.message });
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-3 select-none bg-transparent">

      {/* ── Top Navigation Row ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4 md:gap-3 mb-2">
        <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary dark:text-t-primary">
          Faculty
        </h1>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="flex flex-row items-center bg-b-surface2 border border-s-stroke2 rounded-[10px] px-3 py-2 w-full sm:w-72 h-12 gap-2 shadow-xs shrink-0 sm:shrink">
            <RiSearchLine size={20} className="text-t-secondary" />
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-t-primary placeholder-t-secondary w-full"
            />
          </div>

          {/* Add Faculty Button */}
          <button
            onClick={openModal}
            className="flex flex-row justify-center items-center px-6 h-12 w-full sm:w-auto bg-gradient-to-b from-[#2C2C2C] to-[#282828] dark:from-t-primary dark:to-t-primary/90 text-t-light dark:text-b-surface1 text-sm font-sans font-semibold rounded-[10px] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            + Add Faculty
          </button>


          <button className="relative flex size-12 items-center justify-center rounded-full bg-b-surface2 border border-s-stroke2 text-t-secondary hover:text-t-primary transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
            <RiNotification3Line size={20} />
            <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-primary-03" />
          </button>
          <button className="flex size-12 items-center justify-center rounded-full bg-b-surface2 border border-s-stroke2 text-t-secondary hover:text-t-primary transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
            <RiMailLine size={20} />
          </button>
          <div className="flex items-center justify-center size-12 rounded-full border border-s-stroke2/40 bg-b-surface2 shrink-0 cursor-pointer shadow-xs">
            <div className="size-9 rounded-full bg-shade-02 dark:bg-t-primary flex items-center justify-center text-xs font-bold text-t-light dark:text-b-surface1">AA</div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex flex-col gap-2 mt-2">
        <h2 className="font-sans font-semibold text-[20px] leading-[145%] text-t-primary">Faculty Directory</h2>
        <p className="text-xs text-t-secondary">Manage department heads, lecturing teachers, credentials, and student feedback performance ratings.</p>
      </div>

      {/* Faculty List */}
      <div className="flex flex-col gap-3 w-full">

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[96px] rounded-[24px] bg-white dark:bg-white/[0.02] border border-s-stroke2/40 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-[10px] bg-primary-03/5 border border-primary-03/20 text-primary-03 text-sm">
            <RiAlertLine size={18} />
            <span>{error}</span>
            <button onClick={refetch} className="ml-auto underline text-xs">Retry</button>
          </div>
        )}

        {!loading && !error && filteredFaculty.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-t-tertiary">
            <RiInboxLine size={48} className="opacity-40" />
            <p className="text-sm font-medium">
              {searchQuery ? "No faculty members match your search." : "No faculty members yet. Add your first faculty!"}
            </p>
            {!searchQuery && (
              <button
                onClick={openModal}
                className="mt-2 flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-b-surface2 border border-s-stroke2/50 text-sm font-semibold text-t-secondary hover:text-t-primary transition-all"
              >
                <RiAddLine size={16} /> Add Faculty
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredFaculty.map(fac => {
          const subjectColorMap = SUBJECT_COLORS[fac.subject] || {
            badge: "bg-t-secondary/5 border-t-secondary/15 text-t-secondary",
            initials: "bg-t-secondary/10 text-t-secondary"
          };
          const initials = fac.name.split(" ").map(n => n[0]).join("");

          return (
            <div
              key={fac.id}
              className="group/item relative flex flex-row items-center p-2.5 sm:p-3 gap-3 sm:gap-4 bg-b-surface2 border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all h-[76px] sm:h-[88px] cursor-pointer w-full overflow-hidden"
            >
              <div className="flex flex-row items-center gap-3 sm:gap-3 flex-1 min-w-0">
                <div className={`flex size-10 sm:w-12 sm:h-12 items-center justify-center rounded-[12px] border border-s-stroke2/40 shrink-0 font-sans font-bold text-[13px] sm:text-[16px] ${subjectColorMap.initials}`}>
                  {initials}
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <span className="font-sans font-semibold text-[13px] sm:text-[16px] text-t-primary dark:text-t-primary truncate">
                    {fac.name}
                  </span>
                  <span className="text-[11px] sm:text-xs text-t-secondary dark:text-t-tertiary mt-0.5 uppercase tracking-wide flex items-center gap-1.5 truncate">
                    <RiGraduationCapLine size={14} className="text-t-secondary/70 hidden sm:block" />
                    {fac.position}
                  </span>
                </div>
              </div>

              <div className="flex flex-row items-center gap-2 sm:gap-3 shrink-0">
                <div className="hidden sm:flex flex-col gap-1 sm:gap-1.5 justify-center min-w-[50px] sm:min-w-[90px]">
                  {/* Batches Row */}
                  <div className="flex items-center justify-between gap-3 sm:gap-4 w-full">
                    <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider flex items-center gap-1">
                      <RiTeamLine size={12} />
                      <span>Batches</span>
                    </span>
                    <span className="text-[13px] font-bold text-t-primary">
                      {fac.batches_count}
                    </span>
                  </div>

                  {/* Rating Row */}
                  <div className="flex items-center justify-between gap-3 sm:gap-4 w-full">
                    <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider flex items-center gap-1">
                      <RiStarFill size={12} className="text-[#F4A109]" />
                      <span>Rating</span>
                    </span>
                    <span className="text-[13px] font-bold text-primary-02">
                      {Number(fac.rating).toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex sm:hidden flex-col items-end justify-center">
                  <span className="text-[11px] font-sans font-bold text-t-primary">
                    <RiTeamLine size={10} className="inline mr-1" />{fac.batches_count}
                  </span>
                  <span className="text-[11px] font-sans font-bold text-primary-02 mt-0.5">
                    <RiStarFill size={10} className="inline mr-1 text-[#F4A109]" />{Number(fac.rating).toFixed(1)}
                  </span>
                </div>

                <div className="shrink-0 flex justify-end">
                  <span className="px-2 py-0.5 sm:px-3 sm:py-1.5 border rounded-[10px] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-primary-02/5 border-primary-02/15 text-primary-02">
                    Active
                  </span>
                </div>

                <div className="shrink-0 pl-1 sm:pl-0">
                  <button onClick={() => handleRemove(fac.id, fac.name)} disabled={removingId === fac.id} title="Remove faculty" className="flex items-center justify-center size-8 rounded-full text-t-secondary hover:text-primary-03 dark:hover:text-primary-03 hover:bg-primary-03/5 border border-s-stroke2/30 bg-b-surface2 dark:bg-b-surface2 transition-all active:scale-95 shadow-xs shrink-0 disabled:opacity-50">
                    {removingId === fac.id ? <RiLoaderLine size={16} className="animate-spin" /> : <RiMore2Fill size={18} />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add Faculty Modal ── */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Faculty Member"
        subtitle="Faculty will receive a login invite via email"
      >
        <div className="flex flex-col gap-3">

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Faculty Name <span className="text-primary-03">*</span></label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="e.g., Aman Kumar"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Email Address <span className="text-primary-03">*</span></label>
            <input
              type="email"
              className="input-field w-full"
              placeholder="e.g., aman@yourschool.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <p className="mt-1 text-xs text-t-tertiary">Login credentials will be sent to this email.</p>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Phone Number</label>
            <input
              type="tel"
              className="input-field w-full"
              placeholder="e.g., 9876543210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          {/* Position + Subject row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Position <span className="text-primary-03">*</span></label>
              <div className="relative">
                <select
                  className="input-field w-full appearance-none pr-10"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                >
                  <option value="" disabled>Select...</option>
                  {POSITION_OPTIONS.map((pos) => (
                    <option key={pos.id} value={pos.id}>{pos.label}</option>
                  ))}
                </select>
                <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Subject <span className="text-primary-03">*</span></label>
              <div className="relative">
                <select
                  className="input-field w-full appearance-none pr-10"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                >
                  <option value="" disabled>Select...</option>
                  {SUBJECT_OPTIONS.map((subj) => (
                    <option key={subj.id} value={subj.id}>{subj.label}</option>
                  ))}
                </select>
                <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Batch Assignment */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Assign to Batch <span className="text-primary-03">*</span></label>
            <div className="relative">
              <select
                className="input-field w-full appearance-none pr-10"
                value={form.batch_id}
                onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                disabled={batchesLoading}
              >
                <option value="" disabled>
                  {batchesLoading ? "Loading batches..." : batches.length === 0 ? "No batches found — create one first" : "Select Batch..."}
                </option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.exam})</option>
                ))}
              </select>
              <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
            </div>
            {batches.length === 0 && !batchesLoading && (
              <p className="mt-1 text-xs text-amber-500">No batches found. Go to Batches and create one first.</p>
            )}
          </div>

          {/* Rating */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Initial Rating (0.0 – 5.0)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              className="input-field w-full"
              placeholder="e.g., 4.8"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
            />
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
            <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost px-5" disabled={submitting}>
              Cancel
            </button>
            <button
              className="btn btn-primary px-6 shadow-md flex items-center gap-2"
              onClick={handleCreate}
              disabled={!form.name || !form.email || !form.position || !form.subject || !form.batch_id || submitting}
            >
              {submitting && <RiLoaderLine size={16} className="animate-spin" />}
              {submitting ? "Adding..." : "Add Faculty"}
            </button>
          </div>
        </div>
      </Modal>

    </main>
  );
}
