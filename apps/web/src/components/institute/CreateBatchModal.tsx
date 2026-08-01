"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { RiArrowDownSLine, RiCheckLine, RiAlertLine, RiLoaderLine, RiCalendarCheckLine } from "@remixicon/react";

export type CreateBatchResult = { success: boolean; message: string; batch?: { id: string } };

type ExamOption = { id: string; label: string };

/**
 * The one place a batch is created.
 *
 * There used to be two of these — one on the institute dashboard and one on
 * the batches page — and they had already drifted: the dashboard copy asked
 * only for a name and an exam.
 *
 * No date pickers. A coaching institute does not think in timestamps, it
 * thinks in sittings: "JEE Main 2027". Asking for the exam and the year gives
 * the same information in the vocabulary they already use, and the expiry
 * falls out of the exam calendar rather than being typed. A start date is not
 * asked for at all — a batch begins when it is created.
 */
export function CreateBatchModal({
  open,
  onClose,
  availableExams,
  onCreate,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  availableExams: ExamOption[];
  onCreate: (payload: {
    name: string; exam: string; target_year?: number; class_level?: string;
  }) => Promise<CreateBatchResult>;
  onCreated: (batchId?: string) => void;
}) {
  // A batch created mid-2026 is almost never sitting the 2026 exam, which has
  // already been written, so the next cycle is the default.
  const NEXT_CYCLE = new Date().getFullYear() + 1;
  const YEAR_OPTIONS = [NEXT_CYCLE, NEXT_CYCLE + 1, NEXT_CYCLE + 2, NEXT_CYCLE + 3];

  const [form, setForm] = useState({ name: "", exam: "", target_year: NEXT_CYCLE, class_level: "" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const { data: calendarData } = useApiQuery<{
    calendar: { exam_code: string; suggested_ends_at: string; notes: string | null }[];
  }>("/api/v1/batches/exam-calendar");

  const examCalendar: Record<string, { suggested_ends_at: string; notes: string | null }> =
    Object.fromEntries(
      (calendarData?.calendar ?? []).map((row) => [
        row.exam_code,
        { suggested_ends_at: row.suggested_ends_at, notes: row.notes },
      ]),
    );

  /**
   * When the sitting ends: the exam's month and day, in the chosen year.
   *
   * Shown, not edited. The server derives the same date from the same calendar
   * when the batch is written, so what is displayed here is what gets stored
   * rather than a second opinion that could drift from it.
   */
  const expiryDate = (() => {
    const suggested = examCalendar[form.exam]?.suggested_ends_at;
    if (!suggested) return null;
    const date = new Date(suggested);
    date.setFullYear(form.target_year);
    return date;
  })();

  const selectedExamLabel = availableExams.find((e) => e.id === form.exam)?.label ?? "";

  const close = () => {
    setForm({ name: "", exam: "", target_year: NEXT_CYCLE, class_level: "" });
    setFeedback(null);
    onClose();
  };

  const submit = async () => {
    if (!form.name || !form.exam) return;
    setSubmitting(true);
    setFeedback(null);
    // No dates are sent. The API reads the same exam calendar and derives the
    // expiry from the target year, so there is one rule rather than two.
    const result = await onCreate({
      name: form.name,
      exam: form.exam,
      target_year: form.target_year,
      class_level: form.class_level || undefined,
    });
    setSubmitting(false);
    if (result.success) {
      setFeedback({ ok: true, msg: "Batch created!" });
      onCreated(result.batch?.id);
    } else {
      setFeedback({ ok: false, msg: result.message });
    }
  };

  return (
    <Modal open={open} onClose={close} title="Create New Batch" subtitle="Fill in the details to create a new batch">
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Batch Name</label>
          <input
            type="text"
            className="input-field w-full"
            placeholder="e.g., Morning Batch"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        {/* Exam and year together: the pair is the batch's identity, and the
            two selects sit side by side because neither means much alone. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Target Exam</label>
            <div className="relative">
              <select
                className="input-field w-full appearance-none pr-10"
                value={form.exam}
                onChange={(e) => setForm({ ...form, exam: e.target.value })}
              >
                <option value="" disabled>Select Exam...</option>
                {availableExams.map((exam) => (
                  <option key={exam.id} value={exam.id}>{exam.label}</option>
                ))}
              </select>
              <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Target Year</label>
            <div className="relative">
              <select
                className="input-field w-full appearance-none pr-10"
                value={form.target_year}
                onChange={(e) => setForm({ ...form, target_year: Number(e.target.value) })}
              >
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {selectedExamLabel ? `${selectedExamLabel} ${year}` : year}
                  </option>
                ))}
              </select>
              <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-t-secondary">
            Class <span className="font-normal text-t-tertiary">(optional)</span>
          </label>
          <div className="relative">
            <select
              className="input-field w-full appearance-none pr-10"
              value={form.class_level}
              onChange={(e) => setForm({ ...form, class_level: e.target.value })}
            >
              <option value="">Not specified</option>
              <option value="class_11">Class 11</option>
              <option value="class_12">Class 12</option>
              <option value="dropper">Dropper</option>
            </select>
            <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
          </div>
          <p className="mt-1.5 text-xs text-t-secondary">
            {form.target_year} cannot say this on its own — it is class 12 for one institute and droppers for another.
          </p>
        </div>

        {/* The consequence of the two choices above, stated plainly. */}
        <div className="flex items-start gap-2.5 rounded-[10px] border border-s-stroke2/50 bg-b-surface2/60 px-3 py-2.5">
          <RiCalendarCheckLine size={16} className="mt-0.5 shrink-0 text-t-secondary" />
          <p className="text-xs text-t-secondary">
            {expiryDate ? (
              <>
                Expires{" "}
                <strong className="text-t-primary">
                  {expiryDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </strong>
                , after {selectedExamLabel} {form.target_year}. Students keep their records afterwards but take no new
                tests, DPPs, or study material.
              </>
            ) : (
              "Choose an exam to see when this batch expires."
            )}
          </p>
        </div>

        <p className="rounded-[10px] border border-s-stroke2/50 bg-b-surface2/60 px-3 py-2.5 text-xs text-t-secondary">
          After creating the batch, you will add students from an Excel or CSV file.
        </p>

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

        <div className="mt-2 flex items-center justify-end gap-3 pt-4 border-t border-s-stroke2/50">
          <button onClick={close} className="btn btn-ghost px-5" disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary px-6 shadow-md flex items-center gap-2"
            onClick={submit}
            disabled={!form.name || !form.exam || submitting}
          >
            {submitting && <RiLoaderLine size={16} className="animate-spin" />}
            {submitting ? "Creating..." : "Create Batch"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
