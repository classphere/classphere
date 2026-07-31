"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { QuestionBody } from "@/components/QuestionBody";
import { EXAM_SUBJECTS, DIFFICULTY_OPTIONS } from "@/lib/exam-config";
import {
  RiCheckLine, RiAddLine, RiDeleteBin7Line, RiEyeLine, RiEditLine,
} from "@remixicon/react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Option = {
  id: string;
  text?: string;
  image_url?: string | null;
  content_blocks?: any[] | null;
  extraction_confidence?: "high" | "medium" | "low" | number | null;
  needs_review?: boolean;
  review_reasons?: string[] | null;
};
type Question = Record<string, any> & {
  options?: Option[];
  correct_answer?: string[];
  content_version?: number;
};

// Tiptap + its extensions are a heavy, DOM-only editor dependency — keep them
// out of every route that merely reviews questions but never edits math.
const TiptapMathField = dynamic(() => import("./TiptapMathField"), {
  ssr: false,
  loading: () => <div className="h-24 w-full animate-pulse rounded-lg bg-b-surface2" />,
});

// ── Sub-components ────────────────────────────────────────────────────────────

/** Locked <select> with visual affordance */
function LockedSelect({
  id, label, value, options, disabled, onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-t-secondary">
        {label}
      </label>
      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={[
            "flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border px-3 text-sm transition-colors",
            disabled
              ? "border-s-stroke2 bg-b-surface2/50 text-t-secondary cursor-not-allowed"
              : "border-s-stroke2 bg-b-surface1 text-t-primary hover:border-primary-01/50 cursor-pointer",
          ].join(" ")}
        >
          <span className="truncate">{selected?.label ?? "—"}</span>
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {open && !disabled && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-[10px] border border-s-stroke2 bg-b-surface1 shadow-lg">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={[
                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-b-surface2",
                    opt.value === value ? "font-semibold text-primary-01" : "text-t-primary",
                  ].join(" ")}
                >
                  {opt.value === value && <RiCheckLine size={14} />}
                  {opt.value !== value && <span className="w-3.5" />}
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────
interface QuestionReviewEditorProps {
  question: Question;
  canEdit: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  examCode: string;
}

export function QuestionReviewEditor({
  question,
  canEdit,
  onSave,
  examCode,
}: QuestionReviewEditorProps) {
  const [draft, setDraft] = useState<Question>({ ...question });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false); // student-preview mode

  // Sync when the parent switches to a different question
  useEffect(() => {
    setDraft({ ...question });
    setError(null);
    setSavedAt(null);
    setPreview(false);
  }, [question.id]);

  // Derived subject options from exam code
  const subjectOptions = (EXAM_SUBJECTS[examCode] ?? EXAM_SUBJECTS["default"]).map((s) => ({
    value: s,
    label: s,
  }));

  const set = (patch: Partial<Question>) => setDraft((d) => ({ ...d, ...patch }));

  // ── Option helpers ──────────────────────────────────────────────────────────
  const isSingle = !["mcq_multi", "msq"].includes(draft.question_type ?? "");

  const toggleAnswer = (id: string) => {
    if (!canEdit) return;
    const cur = draft.correct_answer ?? [];
    set({
      correct_answer: isSingle
        ? [id]
        : cur.includes(id) ? cur.filter((a) => a !== id) : [...cur, id],
    });
  };

  const updateOptionText = (index: number, text: string) => {
    const opts = [...(draft.options ?? [])];
    // Once a reviewer changes legacy text, discard the stale extracted block
    // projection. The backend can regenerate ordered blocks from the saved text.
    opts[index] = { ...opts[index], text, content_blocks: null };
    set({ options: opts });
  };

  const removeOption = (index: number) => {
    const opts = [...(draft.options ?? [])].filter((_, i) => i !== index);
    const removed = draft.options?.[index]?.id;
    set({
      options: opts,
      correct_answer: (draft.correct_answer ?? []).filter((a) => a !== removed),
    });
  };

  // ── Save everything ─────────────────────────────────────────────────────────
  const saveAll = async () => {
    setError(null);
    setSaving(true);
    try {
      await onSave({
        subject: draft.subject,
        chapter: draft.chapter,
        topic: draft.topic,
        difficulty: draft.difficulty,
        question_text: draft.question_text,
        options: draft.options,
        correct_answer: draft.correct_answer,
        explanation: draft.explanation,
        content_blocks: draft.content_blocks,
        extraction_metadata: draft.extraction_metadata,
        extractor_version: draft.extractor_version,
        source_crop_url: draft.source_crop_url,
        content_version: draft.content_version,
      });
      setSavedAt(new Date());
      set({ content_version: (draft.content_version ?? 0) + 1 });
    } catch (e: any) {
      setError(e?.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Header: Classification + Save ─────────────────────────────── */}
      <div className="shrink-0 border-b border-s-stroke2 bg-b-surface1 px-5 py-3 rounded-t-[24px]">
        <div className="flex items-end gap-3">
          {/* Dropdowns */}
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            <LockedSelect
              id="q-subject"
              label="Subject"
              value={draft.subject ?? ""}
              options={subjectOptions}
              disabled={!canEdit}
              onChange={(v) => set({ subject: v })}
            />
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-t-secondary">Chapter</label>
              <input
                value={draft.chapter ?? ""}
                disabled={!canEdit}
                onChange={(e) => set({ chapter: e.target.value })}
                placeholder="Chapter name"
                className="h-9 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3 text-sm text-t-primary placeholder:text-t-tertiary focus:border-primary-01/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-t-secondary">Topic</label>
              <input
                value={draft.topic ?? ""}
                disabled={!canEdit}
                onChange={(e) => set({ topic: e.target.value })}
                placeholder="Topic name"
                className="h-9 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3 text-sm text-t-primary placeholder:text-t-tertiary focus:border-primary-01/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <LockedSelect
              id="q-difficulty"
              label="Difficulty"
              value={draft.difficulty ?? "medium"}
              options={DIFFICULTY_OPTIONS}
              disabled={!canEdit}
              onChange={(v) => set({ difficulty: v })}
            />
          </div>

          {/* Save + preview — aligned with inputs, same height */}
          {canEdit && (
            <div className="shrink-0 flex flex-col justify-end gap-1">
              <div className="flex items-center justify-end gap-2 text-[10px] h-[14px]">
                {error && <span className="text-primary-03 truncate max-w-[160px]">{error}</span>}
                {!draft.correct_answer?.length && !error && (
                  <span className="text-amber-500">No answer set</span>
                )}
                {savedAt && !error && (
                  <span className="text-t-tertiary">
                    Saved {savedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <span className="text-t-tertiary">v{draft.content_version ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreview((p) => !p)}
                  title={preview ? "Back to editor" : "Preview as student"}
                  className={[
                    "flex h-9 items-center gap-1 rounded-[10px] border px-3 text-sm font-semibold transition-colors",
                    preview
                      ? "border-primary-01/40 bg-primary-01/10 text-primary-01"
                      : "border-s-stroke2 bg-b-surface1 text-t-primary hover:border-primary-01/40",
                  ].join(" ")}
                >
                  {preview ? <RiEditLine size={15} /> : <RiEyeLine size={15} />}
                  {preview ? "Edit" : "Preview"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveAll}
                  className="h-9 rounded-[10px] bg-[#151515] px-5 text-sm font-semibold text-white transition-opacity disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

        {preview ? (
          /* ── Student preview: render exactly as a student sees it ─────── */
          <div className="space-y-3">
            <div className="rounded-[12px] border border-s-stroke2 bg-b-surface1 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-t-tertiary mb-2">Question (student view)</p>
              <div className="text-[15px] leading-relaxed text-t-primary">
                <QuestionBody
                  blocks={draft.content_blocks}
                  legacyText={draft.question_text ?? ""}
                  legacyImageUrl={draft.image_url}
                  legacyImageAlt="Question figure"
                  reviewerMode
                  confidence={draft.extraction_metadata?.confidence}
                  needs_review={draft.extraction_metadata?.needs_review}
                  review_reasons={draft.extraction_metadata?.review_reasons}
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-t-tertiary">
                Options {isSingle ? "— select one correct" : "— select all correct"}
              </p>
              <div className="space-y-2">
                {(draft.options ?? []).map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isCorrect = draft.correct_answer?.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      className={[
                        "flex items-start gap-3 rounded-[12px] border p-3",
                        isCorrect ? "border-green-500/40 bg-green-500/5" : "border-s-stroke2 bg-b-surface2/40",
                      ].join(" ")}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-s-stroke2 bg-b-surface1 text-xs font-bold text-t-secondary">
                        {letter}
                      </span>
                      <div className="flex-1 min-w-0 text-[15px] leading-relaxed text-t-primary">
                        <QuestionBody
                          blocks={opt.content_blocks}
                          legacyText={opt.text ?? ""}
                          legacyImageUrl={opt.image_url}
                          legacyImageAlt={`Option ${letter}`}
                          reviewerMode
                          compact
                          confidence={opt.extraction_confidence}
                          needs_review={opt.needs_review}
                          review_reasons={opt.review_reasons}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {draft.explanation?.trim() && (
              <div className="rounded-[12px] border border-s-stroke2 bg-b-surface2/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-t-tertiary mb-2">Explanation</p>
                <div className="text-sm leading-relaxed text-t-secondary">
                  <QuestionBody legacyText={draft.explanation ?? ""} reviewerMode />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Edit mode ──────────────────────────────────────────────── */
          <>
            <TiptapMathField
              label="Question text"
              value={draft.question_text ?? ""}
              disabled={!canEdit}
              onChange={(v: string) => set({ question_text: v, content_blocks: null })}
              placeholder="Type question text…"
            />

            {/* Options */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-t-secondary">
                  Options
                  {isSingle ? " — select one correct" : " — select all correct"}
                </p>
                {canEdit && (draft.options?.length ?? 0) < 8 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `opt-${Date.now()}`;
                      set({ options: [...(draft.options ?? []), { id: newId, text: "" }] });
                    }}
                    className="flex h-6 items-center gap-1 rounded-full border border-s-stroke2 px-2 text-[11px] text-t-secondary hover:text-primary-01"
                  >
                    <RiAddLine size={11} />Add option
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(draft.options ?? []).map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isCorrect = draft.correct_answer?.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      className={[
                        "group flex items-start gap-2 rounded-[12px] border p-3 transition-colors",
                        isCorrect
                          ? "border-green-500/40 bg-green-500/5"
                          : "border-s-stroke2 bg-b-surface2/40",
                      ].join(" ")}
                    >
                      {/* Correct-answer toggle */}
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => toggleAnswer(opt.id)}
                        title={isCorrect ? "Marked correct" : "Mark as correct"}
                        className={[
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all",
                          isCorrect
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-s-stroke2 bg-b-surface1 text-t-tertiary hover:border-primary-01/50",
                          !canEdit && "cursor-default",
                        ].join(" ")}
                      >
                        {isCorrect ? <RiCheckLine size={13} /> : letter}
                      </button>

                      {/* Option text (WYSIWYG inline math) */}
                      <div className="flex-1 min-w-0">
                        <TiptapMathField
                          value={opt.text ?? ""}
                          disabled={!canEdit}
                          onChange={(v: string) => updateOptionText(i, v)}
                          placeholder={`Option ${letter}`}
                        />
                      </div>

                      {/* Remove option */}
                      {canEdit && (draft.options?.length ?? 0) > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="mt-0.5 shrink-0 rounded-full p-1 text-t-tertiary opacity-0 transition-opacity hover:text-primary-03 group-hover:opacity-100"
                          title="Remove option"
                        >
                          <RiDeleteBin7Line size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <TiptapMathField
              label="Explanation"
              value={draft.explanation ?? ""}
              disabled={!canEdit}
              onChange={(v: string) => set({ explanation: v })}
              placeholder="Solution / explanation…"
            />
          </>
        )}
      </div>

    </div>
  );
}
