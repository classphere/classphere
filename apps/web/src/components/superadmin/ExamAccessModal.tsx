"use client";

import { useState } from "react";
import { RiCloseLine, RiLoader4Line } from "@remixicon/react";
import type { Institute } from "@/lib/hooks/useInstitutes";

/**
 * Exams an institute can be given. Must stay in step with the validator in
 * updateInstitute and the default in provisionInstitute, which enumerate the
 * same four codes.
 */
export const EXAM_CATALOG: { id: string; label: string }[] = [
  { id: "jee-main",          label: "JEE Main" },
  { id: "jee-advanced",      label: "JEE Advanced" },
  { id: "jee-main-advanced", label: "JEE Main + Advanced" },
  { id: "neet-ug",           label: "NEET UG" },
];

/**
 * Which examinations an institute may create batches for.
 *
 * These were settable only at creation. The batch form filters its exam
 * dropdown by this list, so an institute created with one exam ticked could
 * never be given another — the admin simply saw a one-item dropdown with no
 * indication why, and the only remedy was an API call by hand. The PATCH
 * endpoint has accepted enabled_exam_codes the whole time; nothing called it.
 *
 * Removing an exam is the dangerous direction, so it is called out: batches
 * already created for it keep working, but no new ones can be made.
 */
export function ExamAccessModal({
  institute,
  onClose,
  onSave,
}: {
  institute: Institute;
  onClose: () => void;
  onSave: (codes: string[]) => Promise<void>;
}) {
  const [codes, setCodes] = useState<string[]>(institute.enabled_exam_codes ?? []);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setCodes((current) =>
      current.includes(id) ? current.filter((code) => code !== id) : [...current, id],
    );

  const removed = (institute.enabled_exam_codes ?? []).filter((code) => !codes.includes(code));

  const submit = async () => {
    setSaving(true);
    try { await onSave(codes); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[460px] rounded-[16px] border border-s-stroke2 bg-b-surface1 shadow-depth">
        <div className="flex items-center justify-between border-b border-s-stroke2 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold text-t-primary">{institute.name}</h2>
            <p className="mt-0.5 text-[12px] text-t-secondary">Examinations this institute can create batches for</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-[8px] p-1 text-t-secondary transition-colors hover:text-t-primary">
            <RiCloseLine size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-2 px-5 py-5">
          {EXAM_CATALOG.map((exam) => (
            <label
              key={exam.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-s-stroke2/50 bg-b-surface2/60 px-3 py-2.5"
            >
              <input
                type="checkbox"
                checked={codes.includes(exam.id)}
                onChange={() => toggle(exam.id)}
                className="size-4 cursor-pointer accent-primary-01"
              />
              <span className="text-sm font-semibold text-t-primary">{exam.label}</span>
            </label>
          ))}

          {removed.length > 0 && (
            <p className="mt-1 rounded-[10px] bg-primary-05/10 px-3 py-2 text-[12px] leading-snug text-t-secondary">
              Removing{" "}
              <strong className="text-t-primary">
                {removed.map((code) => EXAM_CATALOG.find((e) => e.id === code)?.label ?? code).join(", ")}
              </strong>{" "}
              stops new batches for it. Batches that already exist keep working.
            </p>
          )}

          {codes.length === 0 && (
            <p className="mt-1 text-[12px] text-primary-03">
              Pick at least one — an institute with no exams cannot create any batch.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-s-stroke2 px-5 py-4">
          <button onClick={onClose} disabled={saving} className="btn btn-ghost px-4">Cancel</button>
          <button
            onClick={submit}
            disabled={saving || codes.length === 0}
            className="btn btn-primary flex items-center gap-2 px-5 disabled:opacity-40"
          >
            {saving && <RiLoader4Line size={16} className="animate-spin" />}
            {saving ? "Saving…" : "Save exams"}
          </button>
        </div>
      </div>
    </div>
  );
}
