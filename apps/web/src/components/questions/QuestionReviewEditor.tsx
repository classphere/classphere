"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { QuestionBody } from "@/components/QuestionBody";
import { EXAM_SUBJECTS, DIFFICULTY_OPTIONS } from "@/lib/exam-config";
import {
  RiCheckLine, RiAddLine, RiDeleteBin7Line, RiEyeLine, RiEditLine, RiImageAddLine, RiRobot2Line,
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
  /** Figures belonging to the stem, in reading order. */
  question_images?: string[];
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
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm transition-colors",
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
            <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-md border border-s-stroke2 bg-b-surface1 shadow-dropdown">
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
  /**
   * Remove this question from the paper.
   *
   * Lives here rather than in each page so every surface that reviews a
   * PDF-extracted paper gets it — Test Department, Institute Admin and
   * Superadmin all import this editor, and a capability added to one of their
   * pages would exist only there.
   *
   * The case it exists for: the extractor creates an empty slot for every
   * question-number anchor it finds in the PDF but cannot fill, so a stray "76."
   * in a formula sheet becomes a blank question that nobody can complete,
   * because there is nothing on the page to complete it with.
   *
   * Optional — a surface that cannot delete simply does not pass it.
   */
  onDelete?: (question: Question) => Promise<void>;
  /**
   * Generate a stand-in draft for a detected gap placeholder — a question
   * number the extractor found in the PDF but returned no content for. The
   * model never saw the source page, so this is a plausible substitute for
   * the reviewer to check or replace, not a recovery of the real question —
   * see the confirm prompt this button shows before calling it.
   *
   * Optional and only rendered when the active question actually is a gap
   * (source_reference.extraction_flags includes "gap_placeholder").
   */
  onAiFillGap?: (question: Question) => Promise<void>;
  /**
   * Repairs the active question against a free-text description of what's
   * wrong with it — the same action the validation panel's "Fix with AI"
   * triggers from a structural error, but reachable here too because a
   * reviewer often spots something the automated checks don't (a wrong
   * diagram, an option that reads oddly) with nothing formal to point at.
   *
   * For a shared bank question (content_scope "global") this is the ONLY
   * way its content can change at all — see isGlobalBankQuestion below.
   */
  onAiFixQuestion?: (question: Question, description: string) => Promise<void>;
  /**
   * Clears a shared bank question's ai_generated_unverified flag once a
   * reviewer has checked an AI fix against the source. Bank questions never
   * expose the normal Save path, so this is the only way that flag clears.
   */
  onConfirmBankFix?: (question: Question) => Promise<void>;
}

export function QuestionReviewEditor({
  question,
  canEdit,
  onSave,
  examCode,
  onDelete,
  onAiFillGap,
  onAiFixQuestion,
  onConfirmBankFix,
}: QuestionReviewEditorProps) {
  const [deleting, setDeleting] = useState(false);
  const [aiFilling, setAiFilling] = useState(false);
  const [draft, setDraft] = useState<Question>({ ...question });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false); // student-preview mode
  const [issueText, setIssueText] = useState("");
  const [reportingIssue, setReportingIssue] = useState(false);
  const [confirmingFix, setConfirmingFix] = useState(false);

  const isGapPlaceholder = Array.isArray(question?.source_reference?.extraction_flags)
    && question.source_reference.extraction_flags.includes("gap_placeholder");

  // Shared bank content — never owned by whichever institute happens to be
  // reviewing a paper that picked it. Editable only through AI, never by
  // hand: the review flag + audit trail an AI fix leaves behind is what
  // makes a wrong fix traceable and correctable; a free-text hand edit here
  // would leave none of that for a question every other institute using the
  // bank also depends on.
  const isGlobalBankQuestion = question.content_scope === "global";
  const canEditFields = canEdit && !isGlobalBankQuestion;
  const hasPendingAiFix = Array.isArray(question?.source_reference?.extraction_flags)
    && question.source_reference.extraction_flags.includes("ai_generated_unverified");

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
  // A numerical question has no options — the student types a value. Every type
  // used to be treated as a choice question here, so an integer question showed
  // an empty option list and invited the reviewer to add options it should
  // never have.
  const isNumeric = ["integer", "numerical"].includes(draft.question_type ?? "");
  const isSingle = !["mcq_multi", "msq"].includes(draft.question_type ?? "");

  const toggleAnswer = (id: string) => {
    if (!canEditFields) return;
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

  // ── Figure helpers ──────────────────────────────────────────────────────────
  // A chosen file is held as a data URL until save, which is what the browser
  // gives us and what the API converts to storage. Nothing uploads on pick, so
  // abandoning an edit leaves no orphaned image behind.
  const figures: string[] = draft.question_images ?? [];

  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const setFigures = (next: string[]) => set({ question_images: next, content_blocks: null });

  /** Appends a figure the toolbar's image button has already read. */
  const addFigure = (dataUrl: string) => setFigures([...figures, dataUrl]);

  const replaceFigure = async (index: number, file: File) => {
    try {
      const next = [...figures];
      next[index] = await readAsDataUrl(file);
      setFigures(next);
    } catch { setError("Could not read that image file."); }
  };

  const removeFigure = (index: number) => setFigures(figures.filter((_, i) => i !== index));

  /** An option's own figure. Options hold one each, in image_url. */
  const setOptionImage = (index: number, url: string | null) => {
    const opts = [...(draft.options ?? [])];
    opts[index] = { ...opts[index], image_url: url, content_blocks: null };
    set({ options: opts });
  };

  const replaceOptionImage = async (index: number, file: File) => {
    try { setOptionImage(index, await readAsDataUrl(file)); }
    catch { setError("Could not read that image file."); }
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
        question_images: draft.question_images,
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

  const runAiFillGap = async () => {
    if (!onAiFillGap) return;
    if (!confirm(
      "This asks an AI model to draft a stand-in question for this slot. It was never shown the source PDF page, so this is NOT the real exam question — only a plausible substitute in the same subject and style. " +
      "You'll still need to check it against the source PDF (or replace it) before publishing. Continue?"
    )) return;
    setError(null);
    setAiFilling(true);
    try {
      await onAiFillGap(draft);
    } catch (e: any) {
      setError(e?.message ?? "AI gap-fill failed.");
    } finally {
      setAiFilling(false);
    }
  };

  const runAiFixQuestion = async () => {
    if (!onAiFixQuestion || !issueText.trim()) return;
    setError(null);
    setReportingIssue(true);
    try {
      await onAiFixQuestion(draft, issueText.trim());
      setIssueText("");
    } catch (e: any) {
      setError(e?.message ?? "AI could not fix this.");
    } finally {
      setReportingIssue(false);
    }
  };

  const runConfirmBankFix = async () => {
    if (!onConfirmBankFix) return;
    setError(null);
    setConfirmingFix(true);
    try {
      await onConfirmBankFix(draft);
    } catch (e: any) {
      setError(e?.message ?? "Could not confirm this fix.");
    } finally {
      setConfirmingFix(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {isGapPlaceholder && canEdit && onAiFillGap && (
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-s-stroke2 bg-primary-03/5 px-5 py-2.5">
          <p className="text-sm text-t-secondary">
            <span className="font-semibold text-primary-03">Gap slot.</span> The extractor found this question
            number in the PDF but returned no content — open the source PDF and type it in, or try an AI-drafted
            stand-in below.
          </p>
          <button
            type="button"
            disabled={aiFilling}
            onClick={runAiFillGap}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-primary-03/30 bg-b-surface1 px-3 text-sm font-semibold text-primary-03 transition-colors hover:border-primary-03/60 disabled:opacity-50"
          >
            <RiRobot2Line size={15} />
            {aiFilling ? "Drafting…" : "Try AI fill"}
          </button>
        </div>
      )}
      {isGlobalBankQuestion && canEdit && (
        <div className="shrink-0 border-b border-s-stroke2 bg-primary-01/5 px-5 py-2.5">
          {hasPendingAiFix ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-t-secondary">
                <span className="font-semibold text-primary-01">Shared bank question, AI-fixed.</span> Check it
                against the source before confirming — this question is used across other institutes too.
              </p>
              <button
                type="button"
                disabled={confirmingFix}
                onClick={runConfirmBankFix}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-primary-01/30 bg-b-surface1 px-3 text-sm font-semibold text-primary-01 transition-colors hover:border-primary-01/60 disabled:opacity-50"
              >
                <RiCheckLine size={15} />
                {confirmingFix ? "Confirming…" : "Confirm fix is correct"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <p className="shrink-0 text-sm font-semibold text-primary-01">Shared bank question.</p>
              <p className="text-sm text-t-secondary sm:hidden">
                Can't be hand-edited — it's used across other institutes too. Describe the issue and AI will fix it.
              </p>
              <input
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
                placeholder="What's wrong with this question? e.g. option C repeats option A"
                className="h-9 min-w-0 flex-1 rounded-md border border-s-stroke2 bg-b-surface1 px-3 text-sm text-t-primary placeholder:text-t-tertiary focus:border-primary-01/40 focus:outline-none"
              />
              <button
                type="button"
                disabled={reportingIssue || !issueText.trim()}
                onClick={runAiFixQuestion}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-primary-01/30 bg-b-surface1 px-3 text-sm font-semibold text-primary-01 transition-colors hover:border-primary-01/60 disabled:opacity-50"
              >
                <RiRobot2Line size={15} />
                {reportingIssue ? "Fixing…" : "Fix with AI"}
              </button>
            </div>
          )}
        </div>
      )}
      {/* ── Header: Classification + Save ─────────────────────────────── */}
      <div className="shrink-0 border-b border-s-stroke2 bg-b-surface2 px-5 py-3.5 rounded-t-xl">
        {/* Dropdowns get the full row to themselves — Chapter and Topic hold
            free text that runs long, and squeezing them beside the Save/Preview
            buttons in one row was what clipped them mid-word. */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[1fr_1.3fr_1.3fr_1fr]">
          <LockedSelect
            id="q-subject"
            label="Subject"
            value={draft.subject ?? ""}
            options={subjectOptions}
            disabled={!canEditFields}
            onChange={(v) => set({ subject: v })}
          />
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-t-secondary">Chapter</label>
            <input
              value={draft.chapter ?? ""}
              disabled={!canEditFields}
              onChange={(e) => set({ chapter: e.target.value })}
              placeholder="Chapter name"
              className="h-9 w-full rounded-md border border-s-stroke2 bg-b-surface1 px-3 text-sm text-t-primary placeholder:text-t-tertiary focus:border-primary-01/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-t-secondary">Topic</label>
            <input
              value={draft.topic ?? ""}
              disabled={!canEditFields}
              onChange={(e) => set({ topic: e.target.value })}
              placeholder="Topic name"
              className="h-9 w-full rounded-md border border-s-stroke2 bg-b-surface1 px-3 text-sm text-t-primary placeholder:text-t-tertiary focus:border-primary-01/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <LockedSelect
            id="q-difficulty"
            label="Difficulty"
            value={draft.difficulty ?? "medium"}
            options={DIFFICULTY_OPTIONS}
            disabled={!canEditFields}
            onChange={(v) => set({ difficulty: v })}
          />
        </div>

        {/* Status + actions, on their own row beneath the fields. */}
        {canEdit && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-s-stroke2/60 pt-3">
            <div className="flex items-center gap-2.5 text-[11px]">
              {!isGlobalBankQuestion && error && <span className="text-primary-03 font-semibold">{error}</span>}
              {!isGlobalBankQuestion && !draft.correct_answer?.length && !error && (
                <span className="font-semibold text-amber-500">No answer set</span>
              )}
              {!isGlobalBankQuestion && savedAt && !error && (
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
                  "flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-semibold transition-colors",
                  preview
                    ? "border-primary-01/40 bg-primary-01/10 text-primary-01"
                    : "border-s-stroke2 bg-b-surface1 text-t-primary hover:border-primary-01/40",
                ].join(" ")}
              >
                {preview ? <RiEditLine size={15} /> : <RiEyeLine size={15} />}
                {preview ? "Edit" : "Preview"}
              </button>
              {!isGlobalBankQuestion && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveAll}
                  className="btn btn-flat h-9 px-5 text-sm"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

        {preview ? (
          /* ── Student preview: render exactly as a student sees it ─────── */
          <div className="space-y-3">
            <div className="rounded-md border border-s-stroke2 bg-b-surface1 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-t-tertiary mb-2">Question (student view)</p>
              <div className="text-[15px] leading-relaxed text-t-primary">
                <QuestionBody
                  blocks={draft.content_blocks}
                  legacyText={draft.question_text ?? ""}
                  images={draft.question_images}
                  legacyImageAlt="Question figure"
                  reviewerMode
                  confidence={draft.extraction_metadata?.confidence}
                  needs_review={draft.extraction_metadata?.needs_review}
                  review_reasons={draft.extraction_metadata?.review_reasons}
                />
              </div>
            </div>
            {isNumeric ? (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-t-tertiary">
                  Answer — a typed value, no options
                </p>
                <p className="rounded-md border border-green-500/40 bg-green-500/5 p-3 font-mono text-[14px] text-t-primary">
                  {(draft.correct_answer ?? []).join(", ") || (
                    <span className="font-sans text-t-secondary">No answer recorded</span>
                  )}
                </p>
              </div>
            ) : (
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
                        "flex items-start gap-3 rounded-md border p-3",
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
            )}
            {draft.explanation?.trim() && (
              <div className="rounded-md border border-s-stroke2 bg-b-surface2/40 p-4">
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
              disabled={!canEditFields}
              onChange={(v: string) => set({ question_text: v, content_blocks: null })}
              placeholder="Type question text…"
              onImageAdd={canEditFields ? addFigure : undefined}
            />

            {/* The question's figures, beside the text that refers to them.
                They were inline markdown inside question_text once, so this
                field drew them; when they moved to question_images the text was
                stripped and the editor began showing a question about a diagram
                with no diagram.

                Editable, because the reviewer is the person who can see that a
                figure is the wrong one or missing — that is most of what
                reviewing an extracted paper is.

                Adding one is the image button on the text toolbar above, so
                there is a single way to attach a figure rather than a second
                control beside it. It appends here rather than embedding the
                image in the sentence, because the figure belongs to the
                question, not to its prose. */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-t-secondary">
                Figures{figures.length > 0 ? ` — ${figures.length}` : ""}
              </p>

              {figures.length === 0 ? (
                <p className="rounded-md border border-dashed border-s-stroke2 px-3 py-4 text-center text-[12px] text-t-secondary">
                  No figures. Use the image button on the toolbar above to add one.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {figures.map((src, i) => (
                    <div key={`${src.slice(0, 40)}-${i}`} className="group relative">
                      <img src={src} alt={`Figure ${i + 1}`}
                        className="max-h-44 max-w-full rounded-md border border-s-stroke2 bg-white object-contain p-1" />
                      {canEditFields && (
                        <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <label title="Replace this figure"
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-s-stroke2 bg-b-surface1 text-t-secondary hover:text-primary-01">
                            <RiImageAddLine size={12} />
                            <input type="file" accept="image/*" className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceFigure(i, f); e.target.value = ""; }} />
                          </label>
                          <button type="button" title="Remove this figure" onClick={() => removeFigure(i)}
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-s-stroke2 bg-b-surface1 text-t-secondary hover:text-red-500">
                            <RiDeleteBin7Line size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* A numerical question is answered by typing a value, so it gets a
                field for that value rather than a list of options to choose
                between. Kept as a plain text input: an answer can be negative,
                a decimal, or written to a fixed number of places, and a number
                input would quietly reformat it. */}
            {isNumeric ? (
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-t-secondary">
                  Correct answer — a typed value
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  disabled={!canEditFields}
                  value={(draft.correct_answer ?? []).join(", ")}
                  onChange={(e) =>
                    set({
                      correct_answer: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="e.g. 42, -3.5 or 0.25"
                  className="h-11 w-full rounded-md border border-s-stroke2 bg-b-surface2 px-3 font-mono text-[14px] text-t-primary outline-none focus:border-primary-01 disabled:opacity-60"
                />
                <p className="mt-1.5 text-[11px] text-t-secondary">
                  Separate with commas only if the paper accepts more than one value.
                </p>
              </div>
            ) : (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-t-secondary">
                  Options
                  {isSingle ? " — select one correct" : " — select all correct"}
                </p>
                {canEditFields && (draft.options?.length ?? 0) < 8 && (
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
                        "group flex items-start gap-2 rounded-md border p-3 transition-colors",
                        isCorrect
                          ? "border-green-500/40 bg-green-500/5"
                          : "border-s-stroke2 bg-b-surface2/40",
                      ].join(" ")}
                    >
                      {/* Correct-answer toggle */}
                      <button
                        type="button"
                        disabled={!canEditFields}
                        onClick={() => toggleAnswer(opt.id)}
                        title={isCorrect ? "Marked correct" : "Mark as correct"}
                        className={[
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all",
                          isCorrect
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-s-stroke2 bg-b-surface1 text-t-tertiary hover:border-primary-01/50",
                          !canEditFields && "cursor-default",
                        ].join(" ")}
                      >
                        {isCorrect ? <RiCheckLine size={13} /> : letter}
                      </button>

                      {/* Option text (WYSIWYG inline math) */}
                      <div className="flex-1 min-w-0">
                        {/* An option that is a picture — a structural formula, a
                            circuit, a graph — keeps it in image_url and has no
                            text at all. This field only ever drew the text, so
                            a chemistry paper whose options are all structures
                            showed four empty boxes and read as a failed
                            extraction when every option was in fact present. */}
                        {opt.image_url && (
                          <div className="group/fig relative mb-2 inline-block">
                            <img
                              src={opt.image_url}
                              alt={`Option ${letter}`}
                              className="max-h-32 max-w-full rounded-[8px] border border-s-stroke2 bg-white object-contain p-1"
                            />
                            {canEditFields && (
                              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover/fig:opacity-100">
                                <label title="Replace this option's image"
                                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-s-stroke2 bg-b-surface1 text-t-secondary hover:text-primary-01">
                                  <RiImageAddLine size={10} />
                                  <input type="file" accept="image/*" className="hidden"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceOptionImage(i, f); e.target.value = ""; }} />
                                </label>
                                <button type="button" title="Remove this option's image"
                                  onClick={() => setOptionImage(i, null)}
                                  className="flex h-5 w-5 items-center justify-center rounded-full border border-s-stroke2 bg-b-surface1 text-t-secondary hover:text-red-500">
                                  <RiDeleteBin7Line size={10} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <TiptapMathField
                          value={opt.text ?? ""}
                          disabled={!canEditFields}
                          onChange={(v: string) => updateOptionText(i, v)}
                          placeholder={opt.image_url ? "Caption (optional)" : `Option ${letter}`}
                          onImageAdd={canEditFields && !opt.image_url ? (url: string) => setOptionImage(i, url) : undefined}
                        />
                      </div>

                      {/* Remove option */}
                      {canEditFields && (draft.options?.length ?? 0) > 2 && (
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
            )}

            <TiptapMathField
              label="Explanation"
              value={draft.explanation ?? ""}
              disabled={!canEditFields}
              onChange={(v: string) => set({ explanation: v })}
              placeholder="Solution / explanation…"
            />
          </>
        )}
      </div>

      {/* Removal. Shared with every surface that imports this editor — never
          offered for a bank question, matching the backend restriction. */}
      {canEditFields && onDelete && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-s-stroke2 px-5 py-2.5">
          <p className="text-[11px] text-t-tertiary">
            {!String(draft.question_text ?? "").trim()
              ? "This slot is empty — the extractor found the number but no question."
              : "Removing takes this question off the paper."}
          </p>
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              const label = draft.question_number ? `question ${draft.question_number}` : "this question";
              const blank = !String(draft.question_text ?? "").trim();
              if (!window.confirm(
                blank
                  ? `Remove the blank slot for ${label}? The extractor detected this number in the PDF but found no question to go with it.`
                  : `Remove ${label} from this paper? This cannot be undone from the review screen.`
              )) return;
              setDeleting(true);
              try { await onDelete(draft); }
              catch (e: any) { setError(e?.message ?? "Could not remove the question."); }
              finally { setDeleting(false); }
            }}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] border border-s-stroke2 px-3 text-[12px] font-semibold text-t-secondary transition-colors hover:border-red-500/40 hover:text-red-500 disabled:opacity-50"
          >
            <RiDeleteBin7Line size={13} />
            {deleting ? "Removing…" : "Remove from paper"}
          </button>
        </div>
      )}
    </div>
  );
}
