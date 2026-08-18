"use client";

import { useMemo } from "react";
import type { MarkingScheme } from "./MarkingSchemeEditor";

/**
 * What the paper is actually made of, before anyone publishes it.
 *
 * An extracted paper is a claim: this many single-correct, this many
 * multiple-correct, adding to this many marks. Every one of those can be wrong —
 * a multiple-correct question read as single-correct scores students on the
 * wrong rule, and nothing downstream ever notices. Checking it by clicking
 * through seventy-five question cards is not checking it.
 *
 * So the claim is stated in one place, next to the number the paper is supposed
 * to total. A mismatch here is the cheapest possible moment to catch a bad
 * extraction.
 */

const TYPE_LABELS: Record<string, string> = {
  mcq_single: "Single correct",
  mcq_multi: "Multiple correct",
  integer: "Numerical",
  matching: "Match the list",
  assertion_reason: "Assertion–reason",
};

interface Props {
  questions: Array<Record<string, any>>;
  markingScheme?: MarkingScheme | null;
  /** total_marks as recorded on the paper, for comparison against the sum. */
  statedTotal?: number | null;
}

interface Row {
  type: string;
  label: string;
  count: number;
  marks: number | null;
  subtotal: number | null;
}

export function PaperComposition({ questions, markingScheme, statedTotal }: Props) {
  const { rows, computedTotal, unpriced, gaps, highest } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of questions) {
      const type = String(q?.question_type ?? "").trim() || "unknown";
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    // A question's marks come from its type, falling back to the paper-wide
    // `default` that NEET and JEE Main use. No fallback beyond that: inventing
    // +4 here would hide exactly the case worth surfacing.
    const marksForType = (type: string): number | null => {
      const entry = markingScheme?.[type] ?? markingScheme?.default;
      return typeof entry?.correct === "number" ? entry.correct : null;
    };

    const rows: Row[] = [...counts.entries()]
      .map(([type, count]) => {
        const marks = marksForType(type);
        return {
          type,
          label: TYPE_LABELS[type] ?? type,
          count,
          marks,
          subtotal: marks === null ? null : marks * count,
        };
      })
      .sort((a, b) => b.count - a.count);

    const computedTotal = rows.reduce((sum, r) => sum + (r.subtotal ?? 0), 0);
    const unpriced = rows.filter((r) => r.marks === null);

    // Positions come from the numbers printed on the paper, so the highest one
    // exceeding the question count means the extractor never found some of them.
    const positions = questions
      .map((q) => Number(q?.question_number))
      .filter((n) => Number.isFinite(n) && n > 0);
    const highest = positions.length ? Math.max(...positions) : questions.length;
    const gaps = Math.max(0, highest - questions.length);

    return { rows, computedTotal, unpriced, gaps, highest };
  }, [questions, markingScheme]);

  const totalMismatch =
    typeof statedTotal === "number" && unpriced.length === 0 && statedTotal !== computedTotal;

  return (
    <div className="card mb-4 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-t-secondary">
          Paper composition
        </p>
        <p className="text-xs text-t-secondary">
          {questions.length} question{questions.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[380px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-t-secondary">
              <th className="pb-2 font-semibold">Type</th>
              <th className="pb-2 text-right font-semibold">Questions</th>
              <th className="pb-2 text-right font-semibold">Marks each</th>
              <th className="pb-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.type} className="border-t border-s-stroke2/40">
                <td className="py-2 font-medium text-t-primary">{row.label}</td>
                <td className="py-2 text-right tabular-nums text-t-primary">{row.count}</td>
                <td className="py-2 text-right tabular-nums text-t-primary">
                  {row.marks === null
                    ? <span className="text-[#b45309] dark:text-[#fbbf24]">not set</span>
                    : `+${row.marks}`}
                </td>
                <td className="py-2 text-right tabular-nums text-t-primary">
                  {row.subtotal === null ? "—" : row.subtotal}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-s-stroke2">
              <td className="py-2 font-bold text-t-primary" colSpan={3}>
                Total
              </td>
              <td className="py-2 text-right font-bold tabular-nums text-t-primary">
                {unpriced.length > 0 ? "—" : computedTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {unpriced.length > 0 && (
        <p className="mt-3 rounded-md border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2 text-xs text-t-primary">
          No marks set for {unpriced.map((r) => r.label.toLowerCase()).join(", ")}. These questions
          will score on the fallback rule, not this paper&apos;s. Set the marking scheme before publishing.
        </p>
      )}

      {totalMismatch && (
        <p className="mt-3 rounded-md border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2 text-xs text-t-primary">
          The paper records {statedTotal} marks, but these questions add up to {computedTotal}.
        </p>
      )}

      {gaps > 0 && (
        <p className="mt-3 rounded-md border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2 text-xs text-t-primary">
          The paper numbers questions up to {highest}, but only {questions.length} were extracted —
          {" "}{gaps} {gaps === 1 ? "is" : "are"} missing. Their numbers are preserved, so the ones
          that were found keep the numbering the paper gives them.
        </p>
      )}
    </div>
  );
}
