"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { RiArrowDownSLine, RiCheckLine, RiAlertLine, RiLoaderLine } from "@remixicon/react";

export type CreateBatchResult = { success: boolean; message: string; batch?: { id: string } };

type ExamOption = { id: string; label: string };

/**
 * The one place a batch is created.
 *
 * There used to be two of these — one on the institute dashboard and one on
 * the batches page — and they had already drifted: the dashboard copy asked
 * only for a name and an exam. Batches made there still got an expiry, since
 * the API fills one in from the exam calendar, but the owner never saw or
 * chose it. That date decides when a session ends and when the institute is
 * billed for the next one, so it cannot be a silent default.
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
    name: string; exam: string; starts_at?: string; ends_at?: string;
    target_year?: number; class_level?: string;
  }) => Promise<CreateBatchResult>;
  onCreated: (batchId?: string) => void;
}) {
  // Target year defaults to the next cycle: a batch created mid-2026 is almost
  // never sitting the 2026 exam, which has already been written.
  const NEXT_CYCLE = new Date().getFullYear() + 1;
  const YEAR_OPTIONS = [NEXT_CYCLE, NEXT_CYCLE + 1, NEXT_CYCLE + 2, NEXT_CYCLE + 3];
  const [form, setForm] = useState({
    name: "", exam: "", starts_at: "", ends_at: "",
    target_year: NEXT_CYCLE, class_level: "",
  });
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
   * The expiry is the exam's month and day in the target year, so it follows
   * from the two facts the admin has already given rather than being a date
   * they must reason about. Still editable — a foundation course that runs
   * past the exam needs to overrule it.
   */
  const expiryFor = (examCode: string, year: number) => {
    const suggested = examCalendar[examCode]?.suggested_ends_at;
    if (!suggested) return "";
    const date = new Date(suggested);
    date.setFullYear(year);
    return date.toISOString().slice(0, 10) + "T23:59";
  };

  const handleExamChange = (examCode: string) => {
    setForm((f) => ({ ...f, exam: examCode, ends_at: expiryFor(examCode, f.target_year) || f.ends_at }));
  };

  const handleYearChange = (year: number) => {
    setForm((f) => ({ ...f, target_year: year, ends_at: expiryFor(f.exam, year) || f.ends_at }));
  };

  const close = () => {
    setForm({ name: "", exam: "", starts_at: "", ends_at: "", target_year: NEXT_CYCLE, class_level: "" });
    setFeedback(null);
    onClose();
  };

  const submit = async () => {
    if (!form.name || !form.exam) return;
    setSubmitting(true);
    setFeedback(null);
    const result = await onCreate({
      name: form.name,
      exam: form.exam,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
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
            placeholder="e.g., Target 2027 Morning"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Target Exam</label>
          <div className="relative">
            <select
              className="input-field w-full appearance-none pr-10"
              value={form.exam}
              onChange={(e) => handleExamChange(e.target.value)}
            >
              <option value="" disabled>Select Exam...</option>
              {availableExams.map((exam) => (
                <option key={exam.id} value={exam.id}>{exam.label}</option>
              ))}
            </select>
            <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
          </div>
          {form.exam && examCalendar[form.exam] ? (
            <p className="mt-1.5 text-xs text-t-secondary">
              📅 Expires{" "}
              <strong>
                {new Date(expiryFor(form.exam, form.target_year)).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </strong>
              {examCalendar[form.exam].notes ? ` · ${examCalendar[form.exam].notes}` : ""}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-t-secondary">Only examinations enabled by your superadmin are available.</p>
          )}
        </div>

        {/* Target year is how the batch list is organised, and it decides the
            expiry above. In 2026 a batch targeting 2028 is class 11; targeting
            2027 it is class 12 or droppers — which is why the stage is asked
            separately rather than inferred. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Target exam year</label>
            <div className="relative">
              <select
                className="input-field w-full appearance-none pr-10"
                value={form.target_year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
              >
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
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
          </div>
        </div>

        {/* Dates follow the exam because picking one prefills the expiry. Above
            it, an admin filling the form top-down met an empty "Expires on"
            with nothing to suggest a value. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Starts on</label>
            <input
              type="datetime-local"
              className="input-field w-full"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Expires on</label>
            <input
              type="datetime-local"
              className="input-field w-full"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-t-secondary">
              Students lose access when the batch expires. Set this to the end of the session you are enrolling for.
            </p>
          </div>
        </div>

        <p className="rounded-[10px] border border-s-stroke2/50 bg-b-surface2/60 px-3 py-2.5 text-xs text-t-secondary">
          After creating the batch, you will add students from an Excel or CSV file. Expired batches cannot receive new
          learning activity, but their records remain available.
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
