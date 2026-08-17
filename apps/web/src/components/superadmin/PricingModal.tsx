"use client";

import { useState } from "react";
import { RiLoader4Line } from "@remixicon/react";
import { Modal } from "@/components/shared/Modal";
import type { Institute, SubscriptionUpdate } from "@/lib/hooks/useInstitutes";

/**
 * Commercial terms for one institute.
 *
 * Rates are entered in rupees because that is what a deal is negotiated in,
 * and converted to paise on submit — money is stored as integer paise so that
 * rate x student-count never picks up a floating point remainder.
 */
export function PricingModal({
  institute,
  onClose,
  onSave,
}: {
  institute: Institute;
  onClose: () => void;
  onSave: (id: string, payload: SubscriptionUpdate) => Promise<{ success: boolean; message: string }>;
}) {
  const sub = institute.subscription;
  const [mode, setMode] = useState<"per_student" | "flat">(sub?.billing_mode ?? "per_student");
  const [perStudent, setPerStudent] = useState(String((sub?.price_per_student_paise ?? 59000) / 100));
  const [flat, setFlat] = useState(sub?.flat_annual_paise != null ? String(sub.flat_annual_paise / 100) : "");
  const [trialEndsAt, setTrialEndsAt] = useState(sub?.trial_ends_at ? sub.trial_ends_at.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const students = institute.student_count ?? 0;
  const rupees = (value: string) => Math.round(parseFloat(value || "0") * 100);

  // Live total, so whoever sets the rate sees what the institute will be
  // invoiced before saving rather than discovering it on the CRM list.
  const projected = mode === "flat" ? rupees(flat) : rupees(perStudent) * students;

  const submit = async () => {
    setError(null);
    if (mode === "per_student" && !(rupees(perStudent) > 0)) {
      setError("Enter a per-student rate above zero.");
      return;
    }
    if (mode === "flat" && !(rupees(flat) > 0)) {
      setError("A flat deal needs an annual fee.");
      return;
    }

    setSaving(true);
    const result = await onSave(institute.id, {
      billing_mode: mode,
      price_per_student_paise: rupees(perStudent),
      // Cleared when switching back to per-student so a stale negotiated
      // number cannot resurface if the mode is flipped again later.
      flat_annual_paise: mode === "flat" ? rupees(flat) : null,
      trial_ends_at: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
    });
    setSaving(false);
    if (result.success) onClose();
    else setError(result.message);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={institute.name}
      subtitle={`${students} student${students === 1 ? "" : "s"} enrolled`}
      maxWidth="max-w-[440px]"
    >
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(["per_student", "flat"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setMode(option)}
                className={`h-9 flex-1 rounded-[10px] border text-[12px] font-semibold transition-colors ${
                  mode === option
                    ? "border-primary-01 bg-primary-01/10 text-primary-01"
                    : "border-s-stroke2 text-t-secondary hover:text-t-primary"
                }`}
              >
                {option === "per_student" ? "Per student" : "Flat annual"}
              </button>
            ))}
          </div>

          {mode === "per_student" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold uppercase tracking-wide text-t-primary">Rate per student / year</span>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-t-secondary">₹</span>
                <input
                  type="number"
                  min={0}
                  value={perStudent}
                  onChange={(e) => setPerStudent(e.target.value)}
                  className="input h-11 w-full"
                />
              </div>
            </label>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold uppercase tracking-wide text-t-primary">Negotiated annual fee</span>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-t-secondary">₹</span>
                <input
                  type="number"
                  min={0}
                  value={flat}
                  onChange={(e) => setFlat(e.target.value)}
                  placeholder="e.g. 250000"
                  className="input h-11 w-full"
                />
              </div>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-wide text-t-primary">Trial ends</span>
            <input
              type="date"
              value={trialEndsAt}
              onChange={(e) => setTrialEndsAt(e.target.value)}
              className="input h-11 w-full"
            />
            <span className="text-[11px] text-t-secondary">Leave blank if this institute is not on a trial.</span>
          </label>

          <div className="rounded-[12px] border border-s-stroke2/60 bg-b-surface2 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-t-secondary">Annual value</p>
            <p className="mt-1 text-[20px] font-bold text-t-primary">
              ₹{(projected / 100).toLocaleString("en-IN")}
            </p>
            {mode === "per_student" && (
              <p className="mt-0.5 text-[11px] text-t-secondary">
                ₹{perStudent || 0} × {students} student{students === 1 ? "" : "s"}
              </p>
            )}
          </div>

          {error && <p className="text-[12px] font-medium text-primary-03">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-s-stroke2 pt-4 -mx-8 px-8 -mb-8 pb-8 mt-1">
            <button onClick={onClose} className="h-10 rounded-[10px] border border-s-stroke2 px-4 text-[12px] font-semibold text-t-secondary transition-colors hover:text-t-primary">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-[10px] bg-primary-01 px-5 text-[12px] font-bold text-white disabled:opacity-60"
            >
              {saving && <RiLoader4Line size={14} className="animate-spin" />}
              Save pricing
            </button>
          </div>
        </div>
    </Modal>
  );
}
