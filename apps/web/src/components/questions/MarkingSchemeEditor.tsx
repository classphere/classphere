"use client";

export type QuestionMarking = {
  correct: number;
  incorrect: number;
  partial?: "per_correct_option" | null;
};

export type MarkingScheme = Record<string, QuestionMarking>;

/** Labels for the types a paper can mix, in the order they normally appear. */
const TYPE_LABELS: Record<string, string> = {
  mcq_single: "Single correct",
  mcq_multi: "Multiple correct",
  integer: "Numerical",
  matching: "Match the list",
  assertion_reason: "Assertion–reason",
};

const TYPE_ORDER = ["mcq_single", "mcq_multi", "integer", "matching", "assertion_reason"];

/**
 * Marks per question type for one paper.
 *
 * Shown only for exams with no uniform scheme. NEET and JEE Main mark every
 * question +4/-1, so asking would be the same numbers every time and a chance
 * to mistype one. JEE Advanced is the reason this exists: single-correct and
 * multiple-correct questions in the same paper carry different marks, and the
 * numbers change between years, so they belong to the paper.
 *
 * Only the types the paper actually contains get a row. It used to list all
 * five with a checkbox each, which made a three-type paper into five cards and
 * two decisions that could not matter — a type the paper does not contain has
 * nothing to price, and one it does contain cannot be opted out of.
 */
export function MarkingSchemeEditor({
  value,
  onChange,
  presentTypes,
}: {
  value: MarkingScheme;
  onChange: (next: MarkingScheme) => void;
  /** Question types found in the paper. Falls back to all types if empty. */
  presentTypes?: string[];
}) {
  const types = (presentTypes?.length ? presentTypes : TYPE_ORDER)
    .filter((type) => TYPE_LABELS[type])
    .sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b));

  const setField = (type: string, field: keyof QuestionMarking, raw: string | boolean) => {
    const entry: QuestionMarking = value[type] ?? { correct: 0, incorrect: 0 };
    const next: QuestionMarking =
      field === "partial"
        ? { ...entry, partial: raw ? "per_correct_option" : null }
        : { ...entry, [field]: raw === "" ? 0 : Number(raw) };
    onChange({ ...value, [type]: next });
  };

  const cell =
    "h-9 w-[68px] rounded-[8px] border border-s-stroke2/40 bg-b-surface2 px-2 text-center " +
    "text-[14px] font-semibold text-t-primary outline-none focus:border-t-primary";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 pl-1 text-[11px] font-bold uppercase tracking-wide text-t-secondary">
        <span className="flex-1">Question type</span>
        <span className="w-[68px] text-center">Correct</span>
        <span className="w-[68px] text-center">Wrong</span>
      </div>

      {types.map((type) => {
        const entry = value[type];
        return (
          <div key={type} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <span className="flex-1 text-[14px] font-medium text-t-primary">{TYPE_LABELS[type]}</span>
              <input
                type="number"
                value={entry?.correct ?? ""}
                placeholder="—"
                onChange={(e) => setField(type, "correct", e.target.value)}
                className={cell}
              />
              <input
                type="number"
                value={entry?.incorrect ?? ""}
                placeholder="—"
                onChange={(e) => setField(type, "incorrect", e.target.value)}
                className={cell}
              />
            </div>

            {/* Partial credit only means anything where more than one option
                can be right. */}
            {type === "mcq_multi" && entry && (
              <label className="flex cursor-pointer items-start gap-2 pl-1">
                <input
                  type="checkbox"
                  checked={entry.partial === "per_correct_option"}
                  onChange={(e) => setField(type, "partial", e.target.checked)}
                  className="mt-0.5 size-3.5 shrink-0 cursor-pointer accent-primary-01"
                />
                <span className="text-[11px] leading-snug text-t-secondary">
                  <strong className="text-t-primary">Partial credit</strong> — only-correct-but-incomplete
                  scores one mark each; any wrong option scores {entry.incorrect}.
                </span>
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
