"use client";

export type QuestionMarking = {
  correct: number;
  incorrect: number;
  partial?: "per_correct_option" | null;
};

export type MarkingScheme = Record<string, QuestionMarking>;

/** The types a paper can mix, in the order they normally appear in a paper. */
const TYPES: { key: string; label: string; hint: string }[] = [
  { key: "mcq_single",       label: "Single correct",   hint: "One option is right" },
  { key: "mcq_multi",        label: "Multiple correct", hint: "One or more options are right" },
  { key: "integer",          label: "Numerical",        hint: "Typed value, no options" },
  { key: "matching",         label: "Match the list",   hint: "Match column I to column II" },
  { key: "assertion_reason", label: "Assertion–reason", hint: "Statement pair" },
];

/**
 * Marks per question type for one paper.
 *
 * Shown only for exams with no uniform scheme. NEET and JEE Main mark every
 * question +4/-1, so asking would be four identical numbers and four chances
 * to mistype one.
 *
 * JEE Advanced is the reason this exists: single-correct and multiple-correct
 * questions in the same paper carry different marks, and the numbers change
 * between years, so they belong to the paper rather than to the exam.
 */
export function MarkingSchemeEditor({
  value,
  onChange,
}: {
  value: MarkingScheme;
  onChange: (next: MarkingScheme) => void;
}) {
  const setField = (type: string, field: keyof QuestionMarking, raw: string | boolean) => {
    const entry: QuestionMarking = value[type] ?? { correct: 0, incorrect: 0 };
    const next: QuestionMarking =
      field === "partial"
        ? { ...entry, partial: raw ? "per_correct_option" : null }
        : { ...entry, [field]: raw === "" ? 0 : Number(raw) };
    onChange({ ...value, [type]: next });
  };

  const clear = (type: string) => {
    const next = { ...value };
    delete next[type];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-t-secondary">Marking scheme *</p>
        <p className="mt-1 text-[12px] text-t-secondary">
          This exam scores question types differently, so the paper has to say how.
          Fill in only the types this paper actually contains — the total marks are
          summed from them.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {TYPES.map(({ key, label, hint }) => {
          const entry = value[key];
          const active = Boolean(entry);
          return (
            <div
              key={key}
              className={`rounded-[12px] border p-3 transition-colors ${
                active ? "border-t-primary/40 bg-b-surface1" : "border-s-stroke2/40 bg-b-surface1/50"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex min-w-[190px] flex-1 items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => (e.target.checked ? setField(key, "correct", "0") : clear(key))}
                    className="size-4 shrink-0 cursor-pointer accent-primary-01"
                  />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-t-primary">{label}</span>
                    <span className="block text-[11px] text-t-secondary">{hint}</span>
                  </span>
                </label>

                {active && (
                  <>
                    <label className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase text-t-secondary">Correct</span>
                      <input
                        type="number"
                        value={entry.correct}
                        onChange={(e) => setField(key, "correct", e.target.value)}
                        className="h-9 w-[72px] rounded-[8px] border border-s-stroke2/40 bg-b-surface2 px-2 text-center text-[14px] font-semibold text-t-primary outline-none focus:border-t-primary"
                      />
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase text-t-secondary">Wrong</span>
                      <input
                        type="number"
                        value={entry.incorrect}
                        onChange={(e) => setField(key, "incorrect", e.target.value)}
                        className="h-9 w-[72px] rounded-[8px] border border-s-stroke2/40 bg-b-surface2 px-2 text-center text-[14px] font-semibold text-t-primary outline-none focus:border-t-primary"
                      />
                    </label>
                  </>
                )}
              </div>

              {/* Partial credit only means anything where more than one option
                  can be right. */}
              {active && key === "mcq_multi" && (
                <label className="mt-2.5 flex items-start gap-2.5 border-t border-s-stroke2/30 pt-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entry.partial === "per_correct_option"}
                    onChange={(e) => setField(key, "partial", e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary-01"
                  />
                  <span className="text-[12px] text-t-secondary">
                    <strong className="text-t-primary">Partial credit.</strong> Choosing only
                    correct options but not all of them scores one mark each — three of four
                    scores 3, one of three scores 1. Choosing any wrong option scores{" "}
                    {entry.incorrect} instead.
                  </span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
