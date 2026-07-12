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
} from "@remixicon/react";
import { useFaculty } from "@/lib/hooks/useFaculty";
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

export default function InstituteFacultyPage() {
  const { faculty, loading, error, addFaculty, refetch } = useFaculty();
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    position: "",
    subject: "",
    batches_count: "",
    rating: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const filteredFaculty = faculty.filter(fac =>
    fac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fac.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = () => {
    setForm({
      name: "",
      position: "",
      subject: "",
      batches_count: "",
      rating: "",
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name || !form.position || !form.subject) return;

    // Validate rating
    const ratingNum = form.rating ? Number(form.rating) : 0;
    if (ratingNum < 0 || ratingNum > 5) {
      setFeedback({ ok: false, msg: "Rating must be between 0.0 and 5.0" });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const result = await addFaculty({
      name: form.name,
      position: form.position,
      subject: form.subject,
      batches_count: form.batches_count ? Number(form.batches_count) : 0,
      rating: ratingNum,
    });

    setSubmitting(false);
    if (result.success) {
      setFeedback({ ok: true, msg: "Faculty member added successfully!" });
      setTimeout(() => setIsModalOpen(false), 900);
    } else {
      setFeedback({ ok: false, msg: result.message });
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">

      {/* ── Top Navigation Row (Figma Style) ── */}
      <div className="flex flex-row justify-between items-center w-full h-12 gap-6">
        {/* Title */}
        <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary dark:text-t-primary">
          Faculty
        </h1>

        {/* Navigation Items (Right Side) */}
        <div className="flex flex-row items-center gap-3">
          {/* Search Box */}
          <div className="flex flex-row items-center bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2 dark:border-s-stroke2/40 rounded-[10px] px-3 py-2 w-72 h-12 gap-2 shadow-xs">
            <RiSearchLine size={20} className="text-t-secondary dark:text-t-tertiary" />
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-t-primary dark:text-t-primary placeholder-t-secondary w-full"
            />
          </div>

          {/* Add Faculty Button (Gradient) */}
          <button
            onClick={openModal}
            className="flex flex-row justify-center items-center px-6 h-12 bg-gradient-to-b from-[#2C2C2C] to-[#282828] dark:from-t-primary dark:to-t-primary/90 text-t-light dark:text-b-surface1 text-sm font-sans font-semibold rounded-[10px] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] active:scale-95 transition-all cursor-pointer"
          >
            + Add Faculty
          </button>

          {/* Bell Button */}
          <button className="relative flex size-12 items-center justify-center rounded-full bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2 dark:border-s-stroke2/40 text-t-secondary dark:text-t-secondary hover:text-t-primary dark:hover:text-t-primary transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
            <RiNotification3Line size={20} />
            <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-primary-03" />
          </button>

          {/* Mail Button */}
          <button className="flex size-12 items-center justify-center rounded-full bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2 dark:border-s-stroke2/40 text-t-secondary dark:text-t-secondary hover:text-t-primary dark:hover:text-t-primary transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
            <RiMailLine size={20} />
          </button>

          {/* Avatar Profile */}
          <div className="flex items-center justify-center size-12 rounded-full border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 shrink-0 cursor-pointer shadow-xs">
            <div className="size-9 rounded-full bg-shade-02 dark:bg-t-primary flex items-center justify-center text-xs font-bold text-t-light dark:text-b-surface1">
              AA
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-2 mt-6">
        <h2 className="font-sans font-semibold text-[20px] leading-[145%] text-t-primary dark:text-t-primary">Faculty Directory</h2>
        <p className="text-xs text-t-secondary dark:text-t-tertiary">Manage department heads, lecturing teachers, credentials, and student feedback performance ratings.</p>
      </div>

      {/* Vertical List of Rows */}
      <div className="flex flex-col gap-3 w-full mt-4">

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
        {!loading && !error && filteredFaculty.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-t-tertiary">
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

        {/* Faculty Rows */}
        {!loading && !error && filteredFaculty.map(fac => {
          const subjectColorMap = SUBJECT_COLORS[fac.subject] || {
            badge: "bg-t-secondary/5 border-t-secondary/15 text-t-secondary",
            initials: "bg-t-secondary/10 text-t-secondary"
          };

          // Initials for avatar
          const initials = fac.name.split(" ").map(n => n[0]).join("");

          return (
            <div
              key={fac.id}
              className="group/item relative flex flex-row items-center justify-between p-4 gap-8 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all h-[96px] cursor-pointer"
            >

              {/* Left: Avatar/Initials Box */}
              <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden relative z-10">
                <div className={`flex w-16 h-16 items-center justify-center rounded-[10px] border border-s-stroke2/40 shrink-0 font-sans font-bold text-lg ${subjectColorMap.initials}`}>
                  {initials}
                </div>

                {/* Faculty Name & Role Info */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary truncate">
                    {fac.name}
                  </span>
                  <span className="text-xs text-t-secondary dark:text-t-tertiary mt-0.5 flex items-center gap-1">
                    <RiGraduationCapLine size={14} className="text-t-secondary/70" />
                    {fac.position}
                  </span>
                </div>
              </div>

              {/* Right: Metrics + Subject Tag */}
              <div className="flex flex-row items-center gap-8 shrink-0 relative z-10">
                {/* Batches count */}
                <div className="flex flex-col items-end justify-center min-w-[70px]">
                  <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider">
                    Batches
                  </span>
                  <span className="text-[16px] font-sans font-bold text-t-primary dark:text-t-primary mt-0.5">
                    {fac.batches_count}
                  </span>
                </div>

                {/* Rating score */}
                <div className="flex flex-col items-end justify-center min-w-[70px]">
                  <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider flex items-center gap-0.5">
                    <RiStarFill size={10} className="text-[#F4A109]" /> Rating
                  </span>
                  <span className="text-[16px] font-sans font-bold text-primary-02 mt-0.5">
                    {Number(fac.rating).toFixed(1)}
                  </span>
                </div>

                {/* Subject badge */}
                <div className="min-w-[110px] flex justify-end">
                  <span className={`px-3 py-1.5 border rounded-[10px] text-[10px] font-bold uppercase tracking-wider ${subjectColorMap.badge}`}>
                    {fac.subject}
                  </span>
                </div>

                {/* Actions button */}
                <button className="flex items-center justify-center size-8 rounded-full text-t-secondary hover:text-t-primary dark:hover:text-t-primary hover:bg-b-surface1 dark:hover:bg-b-surface3 border border-s-stroke2/30 bg-b-surface2 dark:bg-b-surface2 transition-all active:scale-95 shadow-xs shrink-0">
                  <RiMore2Fill size={18} />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add Faculty Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Faculty Member"
        subtitle="Fill in the credentials and subject specializations"
      >
        <div className="flex flex-col gap-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Faculty Name</label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="e.g., Aman Sir"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Position */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Position</label>
            <div className="relative">
              <select
                className="input-field w-full appearance-none pr-10"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              >
                <option value="" disabled>Select Position...</option>
                {POSITION_OPTIONS.map((pos) => (
                  <option key={pos.id} value={pos.id}>{pos.label}</option>
                ))}
              </select>
              <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Subject</label>
            <div className="relative">
              <select
                className="input-field w-full appearance-none pr-10"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              >
                <option value="" disabled>Select Subject...</option>
                {SUBJECT_OPTIONS.map((subj) => (
                  <option key={subj.id} value={subj.id}>{subj.label}</option>
                ))}
              </select>
              <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
            </div>
          </div>

          {/* Batches & Rating row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Total Batches</label>
              <input
                type="number"
                min="0"
                className="input-field w-full"
                placeholder="e.g., 4"
                value={form.batches_count}
                onChange={(e) => setForm({ ...form, batches_count: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Manual Rating (0.0 to 5.0)</label>
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
              disabled={!form.name || !form.position || !form.subject || submitting}
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
