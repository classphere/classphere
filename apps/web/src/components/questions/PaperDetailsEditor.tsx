"use client";

import { useMemo, useState } from "react";
import { MarkingSchemeEditor, type MarkingScheme } from "./MarkingSchemeEditor";
import { EXAM_LABELS, uniformScheme } from "@/lib/exam-config";
import { RiErrorWarningLine } from "@remixicon/react";

/**
 * What a test is worth, how long it runs, and when it opens.
 *
 * Every number here is typed by the person holding the paper. Nothing is
 * defaulted and nothing is derived, which is a deliberate reversal: upload used
 * to record 360 marks for every PDF whatever came out of it, duration arrived as
 * 180 minutes before anyone had seen the extraction, and saving a marking scheme
 * silently recomputed the paper's total from it. Three numbers nobody had agreed
 * to, on a paper students would be scored against.
 *
 * The exam's conventional marks still appear — as placeholder text and as a
 * suggested total that fills the field on request. A suggestion the Test Head
 * accepts is a decision; a default they never saw is not.
 */

export type PaperDetails = {
  duration_min: number | null;
  total_marks: number | null;
  marking_scheme: MarkingScheme;
  available_from: string | null;
  available_until: string | null;
  result_release_at: string | null;
};

/** ISO → the `YYYY-MM-DDTHH:mm` a datetime-local input wants, in local time. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The input's local wall-clock reading back to an instant, or null when cleared. */
function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const numberOrNull = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const field =
  "h-11 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3 text-sm font-medium " +
  "text-t-primary outline-none focus:border-primary-01";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-t-secondary";

export function PaperDetailsEditor({
  paper,
  questions,
  examCode,
  canEdit,
  onSave,
}: {
  paper: any;
  questions: Array<Record<string, any>>;
  examCode: string;
  canEdit: boolean;
  onSave: (details: Partial<PaperDetails>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [duration, setDuration] = useState(() => (paper?.duration_min != null ? String(paper.duration_min) : ""));
  const [totalMarks, setTotalMarks] = useState(() => (paper?.total_marks != null ? String(paper.total_marks) : ""));
  const [scheme, setScheme] = useState<MarkingScheme>(() => (paper?.marking_scheme as MarkingScheme) ?? {});
  const [availableFrom, setAvailableFrom] = useState(() => toLocalInput(paper?.available_from));
  const [availableUntil, setAvailableUntil] = useState(() => toLocalInput(paper?.available_until));
  const [resultReleaseAt, setResultReleaseAt] = useState(() => toLocalInput(paper?.result_release_at));

  const presentTypes = useMemo(
    () => [...new Set(questions.map((q) => String(q?.question_type ?? "").trim()).filter(Boolean))],
    [questions],
  );

  // The exam's conventional marks, shown as placeholder text so the Test Head
  // can see what is usual without it being applied on their behalf.
  const conventional = uniformScheme(examCode)?.default ?? null;

  /**
   * Marks-per-question × question-count, when every type present has a mark.
   *
   * Offered, never applied. The paper's total is its own field precisely so an
   * institute can price a paper differently from the sum of its parts.
   */
  const suggestedTotal = useMemo(() => {
    if (!questions.length) return null;
    let sum = 0;
    for (const question of questions) {
      const type = String(question?.question_type ?? "").trim();
      const entry = scheme[type] ?? scheme.default;
      if (typeof entry?.correct !== "number") return null;
      sum += entry.correct;
    }
    return sum;
  }, [questions, scheme]);

  const typedTotal = numberOrNull(totalMarks);
  const totalDisagrees =
    typedTotal !== null && suggestedTotal !== null && typedTotal !== suggestedTotal;

  const missing = [
    paper?.duration_min == null ? "duration" : null,
    paper?.total_marks == null ? "total marks" : null,
    !paper?.marking_scheme || Object.keys(paper.marking_scheme).length === 0 ? "marking scheme" : null,
  ].filter(Boolean) as string[];

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await onSave({
        duration_min: numberOrNull(duration),
        total_marks: numberOrNull(totalMarks),
        marking_scheme: scheme,
        available_from: fromLocalInput(availableFrom),
        available_until: fromLocalInput(availableUntil),
        result_release_at: fromLocalInput(resultReleaseAt),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (saveError: any) {
      setError(saveError?.message ?? "Could not save these details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card mb-3 p-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-t-secondary">Test details</p>
          <p className="mt-1 text-sm text-t-secondary">
            {paper?.duration_min != null ? `${paper.duration_min} min` : "No duration"}
            {" · "}
            {paper?.total_marks != null ? `${paper.total_marks} marks` : "No total marks"}
            {" · "}
            {questions.length} question{questions.length === 1 ? "" : "s"}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary-01">{open ? "Close" : "Edit"}</span>
      </button>

      {missing.length > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2 text-xs text-t-primary">
          <RiErrorWarningLine size={14} className="mt-0.5 shrink-0 text-[#b45309] dark:text-[#fbbf24]" />
          <span>
            This test has no {missing.join(", no ")} set. Nothing is assumed on your behalf, so it
            cannot be published until you set {missing.length === 1 ? "it" : "them"}.
          </span>
        </p>
      )}

      {open && (
        <div className="mt-4 flex flex-col gap-4 border-t border-s-stroke2/60 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="paper-duration">Duration (minutes)</label>
              <input
                id="paper-duration"
                type="number"
                min={1}
                max={600}
                value={duration}
                disabled={!canEdit}
                placeholder="e.g. 80"
                onChange={(event) => setDuration(event.target.value)}
                className={field}
              />
              <p className="mt-1.5 text-[11px] text-t-secondary">
                However long this test should run — the student&apos;s timer starts here.
              </p>
            </div>

            <div>
              <label className={label} htmlFor="paper-total-marks">Total marks</label>
              <input
                id="paper-total-marks"
                type="number"
                min={0}
                value={totalMarks}
                disabled={!canEdit}
                placeholder={suggestedTotal !== null ? `e.g. ${suggestedTotal}` : "e.g. 320"}
                onChange={(event) => setTotalMarks(event.target.value)}
                className={field}
              />
              <p className="mt-1.5 text-[11px] text-t-secondary">
                {suggestedTotal !== null ? (
                  <>
                    {questions.length} questions at the marks below come to{" "}
                    <strong className="text-t-primary">{suggestedTotal}</strong>.{" "}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setTotalMarks(String(suggestedTotal))}
                        className="font-semibold text-primary-01 underline"
                      >
                        Use {suggestedTotal}
                      </button>
                    )}
                  </>
                ) : (
                  "Whatever this paper is worth. Set the marks below and a suggestion appears."
                )}
              </p>
            </div>
          </div>

          {totalDisagrees && (
            <p className="rounded-[10px] border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2 text-xs text-t-primary">
              This test is set to {typedTotal} marks, but its questions add up to {suggestedTotal}.
              That is allowed — just confirm it is what you meant.
            </p>
          )}

          <div>
            <p className={label}>Marks per question</p>
            <p className="mb-3 text-[11px] text-t-secondary">
              What one correct answer earns, and what one wrong answer costs. Enter a negative
              number for the penalty.
              {conventional && (
                <> {EXAM_LABELS[examCode] ?? "This exam"} conventionally uses{" "}
                  <strong className="text-t-primary">+{conventional.correct} / {conventional.incorrect}</strong>,
                  but this paper is scored on whatever you set here.
                </>
              )}
            </p>
            <MarkingSchemeEditor value={scheme} onChange={setScheme} presentTypes={presentTypes} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="paper-opens">Opens at</label>
              <input
                id="paper-opens"
                type="datetime-local"
                value={availableFrom}
                disabled={!canEdit}
                onChange={(event) => setAvailableFrom(event.target.value)}
                className={field}
              />
              <p className="mt-1.5 text-[11px] text-t-secondary">Leave empty to use the batch&apos;s scheduled time.</p>
            </div>
            <div>
              <label className={label} htmlFor="paper-closes">Closes at</label>
              <input
                id="paper-closes"
                type="datetime-local"
                value={availableUntil}
                disabled={!canEdit}
                onChange={(event) => setAvailableUntil(event.target.value)}
                className={field}
              />
              <p className="mt-1.5 text-[11px] text-t-secondary">Leave empty for no deadline.</p>
            </div>
            <div>
              <label className={label} htmlFor="paper-results">Results visible from</label>
              <input
                id="paper-results"
                type="datetime-local"
                value={resultReleaseAt}
                disabled={!canEdit}
                onChange={(event) => setResultReleaseAt(event.target.value)}
                className={field}
              />
              <p className="mt-1.5 text-[11px] text-t-secondary">Leave empty to release results on submission.</p>
            </div>
          </div>

          {error && <p className="text-sm text-primary-03">{error}</p>}
          {saved && <p className="text-sm text-primary-02">Test details saved.</p>}

          {canEdit && (
            <div>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="h-11 rounded-[10px] bg-[#151515] px-5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {saving ? "Saving…" : "Save test details"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
