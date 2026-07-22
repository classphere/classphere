"use client";

import { useEffect, useState } from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { EXAM_SUBJECTS, DIFFICULTY_OPTIONS, SUBJECT_COLOR } from "@/lib/exam-config";
import {
  RiEyeLine, RiEditLine, RiCheckLine, RiCloseLine, RiInformationLine,
  RiArrowDownSLine,
} from "@remixicon/react";

type Option = { id: string; text?: string; image_url?: string | null };
type Question = Record<string, any> & { options?: Option[]; correct_answer?: string[]; content_version?: number };

// ── LaTeX cheatsheet shown on demand ──────────────────────────────────────────
const LATEX_HINTS = [
  { label: "Inline math",   snippet: "$x^2$" },
  { label: "Display math",  snippet: "$$\\frac{a}{b}$$" },
  { label: "Vector",        snippet: "$\\vec{F}$" },
  { label: "Square root",   snippet: "$\\sqrt{2}$" },
  { label: "Subscript",     snippet: "$a_1$" },
  { label: "Superscript",   snippet: "$e^{i\\pi}$" },
  { label: "Greek letter",  snippet: "$\\alpha, \\beta, \\gamma$" },
  { label: "Fraction",      snippet: "$\\frac{p}{q}$" },
  { label: "Integral",      snippet: "$\\int_0^\\infty$" },
];

// ── Locked-select field ───────────────────────────────────────────────────────
function SelectField({
  label, value, options, disabled, onChange, placeholder,
}: {
  label: string; value: string; options: string[]; disabled?: boolean;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-t-secondary">
      {label}
      <div className="relative mt-2">
        <select
          disabled={disabled}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none rounded-[9px] border border-s-stroke2 bg-b-surface1 pl-3 pr-9 text-sm font-medium normal-case text-t-primary outline-none focus:border-primary-01 disabled:opacity-60"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <RiArrowDownSLine size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-t-secondary" />
      </div>
    </label>
  );
}

// ── Split-pane textarea with live KaTeX preview ───────────────────────────────
function MathTextarea({
  label, value, disabled, onChange, minRows = 4, placeholder,
}: {
  label: string; value: string; disabled?: boolean;
  onChange: (v: string) => void; minRows?: number; placeholder?: string;
}) {
  const rows = Math.max(minRows, (value.match(/\n/g) ?? []).length + 2);
  return (
    <div>
      {label && (
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-t-secondary">{label}</p>
      )}
      <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-[12px] border border-s-stroke2">
        {/* raw source */}
        <div className="border-r border-s-stroke2 bg-b-surface2/40">
          <div className="flex items-center gap-1.5 border-b border-s-stroke2 px-3 py-1.5">
            <RiEditLine size={12} className="text-t-tertiary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-t-tertiary">LaTeX source</span>
          </div>
          <textarea
            disabled={disabled}
            value={value}
            rows={rows}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full resize-none bg-transparent p-3 font-mono text-sm leading-relaxed text-t-primary outline-none disabled:opacity-60"
          />
        </div>
        {/* live preview */}
        <div className="bg-b-surface1">
          <div className="flex items-center gap-1.5 border-b border-s-stroke2 px-3 py-1.5">
            <RiEyeLine size={12} className="text-t-tertiary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-t-tertiary">Preview</span>
          </div>
          <div className="min-h-[56px] p-3 text-sm leading-relaxed text-t-primary">
            <MarkdownRenderer>{value || ""}</MarkdownRenderer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Option row — split-pane + correct-answer toggle ───────────────────────────
function OptionRow({
  option, index, isCorrect, disabled, isSingle, onTextChange, onToggle,
}: {
  option: Option; index: number; isCorrect: boolean; disabled: boolean;
  isSingle: boolean; onTextChange: (v: string) => void; onToggle: () => void;
}) {
  return (
    <div className={`overflow-hidden rounded-[12px] border transition-colors ${isCorrect ? "border-primary-02/50 bg-primary-02/5" : "border-s-stroke2 bg-b-surface2/30"}`}>
      {/* header row */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-s-stroke2/60">
        <button
          disabled={disabled}
          onClick={onToggle}
          title={isCorrect ? "Marked correct — click to unmark" : "Mark as correct answer"}
          className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
            isCorrect
              ? "border-primary-02 bg-primary-02 text-white"
              : "border-s-stroke2 bg-b-surface1 text-t-secondary hover:border-primary-02/50"
          }`}
        >
          {isCorrect ? <RiCheckLine size={13} /> : option.id}
        </button>
        <span className="text-xs font-semibold text-t-secondary">Option {option.id}</span>
        {isCorrect && (
          <span className="ml-auto rounded-full bg-primary-02/15 px-2 py-0.5 text-[10px] font-bold text-primary-02">
            {isSingle ? "Correct answer" : "Correct"}
          </span>
        )}
      </div>
      {/* split-pane body */}
      <div className="grid grid-cols-2 gap-0">
        <div className="border-r border-s-stroke2/60">
          <div className="flex items-center gap-1.5 px-3 py-1">
            <RiEditLine size={10} className="text-t-tertiary" />
            <span className="text-[10px] text-t-tertiary">Source</span>
          </div>
          <textarea
            disabled={disabled}
            value={option.text ?? ""}
            rows={2}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={`Option ${option.id} (LaTeX allowed)`}
            className="w-full resize-none bg-transparent px-3 pb-3 font-mono text-sm text-t-primary outline-none disabled:opacity-60"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5 px-3 py-1">
            <RiEyeLine size={10} className="text-t-tertiary" />
            <span className="text-[10px] text-t-tertiary">Preview</span>
          </div>
          <div className="min-h-[40px] px-3 pb-3 text-sm text-t-primary">
            <MarkdownRenderer>{option.text || ""}</MarkdownRenderer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function QuestionReviewEditor({
  question, canEdit, onSave, examCode,
}: {
  question: Question;
  canEdit: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  examCode?: string;
}) {
  const [draft, setDraft] = useState<Question>(question);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [showHints, setShowHints] = useState(false);

  useEffect(() => setDraft(question), [question]);

  const subjects = EXAM_SUBJECTS[examCode ?? ""] ?? [];
  const options = Array.isArray(draft.options) ? draft.options : [];
  const isSingle = draft.question_type === "mcq_single" || draft.question_type === "assertion_reason";
  const subjectColor = SUBJECT_COLOR[draft.subject ?? ""] ?? { bg: "", text: "text-t-secondary", border: "border-s-stroke2" };

  const setOption = (index: number, patch: Partial<Option>) =>
    setDraft((cur) => ({ ...cur, options: options.map((o, i) => i === index ? { ...o, ...patch } : o) }));

  const addOption = () =>
    setDraft((cur) => ({ ...cur, options: [...options, { id: String.fromCharCode(65 + options.length), text: "", image_url: null }] }));

  const removeOption = (index: number) =>
    setDraft((cur) => ({
      ...cur,
      options: options.filter((_, i) => i !== index),
      correct_answer: (cur.correct_answer ?? []).filter((id) => id !== options[index]?.id),
    }));

  const toggleCorrect = (id: string) =>
    setDraft((cur) => {
      const answers = Array.isArray(cur.correct_answer) ? cur.correct_answer : [];
      return { ...cur, correct_answer: isSingle ? [id] : answers.includes(id) ? answers.filter((a) => a !== id) : [...answers, id] };
    });

  const save = async () => {
    setError("");
    if (!draft.question_text?.trim()) { setError("Question text is required."); return; }
    if (!draft.correct_answer?.length) { setError("Select the correct answer before saving."); return; }
    setSaving(true);
    try {
      await onSave({
        content_version: question.content_version,
        question_text: draft.question_text,
        question_type: draft.question_type,
        options: draft.options,
        correct_answer: draft.correct_answer,
        explanation: draft.explanation ?? null,
        image_url: draft.image_url ?? null,
        subject: draft.subject,
        chapter: draft.chapter,
        topic: draft.topic ?? null,
        difficulty: draft.difficulty ?? null,
      });
      setSavedAt(new Date());
    } catch (e: any) { setError(e?.message ?? "Could not save."); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]">
      {/* ── LEFT: editable source ──────────────────────────────────────── */}
      <section className="card flex flex-col gap-0 overflow-hidden p-0">
        {/* card header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-s-stroke2 px-5 py-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-t-tertiary">Editable source</p>
              <h2 className="mt-0.5 text-lg font-semibold text-t-primary">Question {question.position}</h2>
            </div>
            {draft.subject && (
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${subjectColor.bg} ${subjectColor.text} ${subjectColor.border}`}>
                {draft.subject}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-s-stroke2 bg-b-surface2 px-3 py-1 text-xs font-semibold capitalize text-t-secondary">
              {draft.question_type?.replaceAll("_", " ")}
            </span>
            <button
              onClick={() => setShowHints((v) => !v)}
              title="LaTeX quick reference"
              className="rounded-[8px] border border-s-stroke2 bg-b-surface2 px-2.5 py-1.5 text-xs font-semibold text-t-secondary transition-colors hover:text-t-primary"
            >
              <RiInformationLine size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-5">
          {/* LaTeX hints */}
          {showHints && (
            <div className="rounded-[10px] border border-s-stroke2 bg-b-surface2/60 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-t-secondary">LaTeX quick reference</p>
              <div className="flex flex-wrap gap-2">
                {LATEX_HINTS.map((h) => (
                  <div key={h.label} className="flex flex-col rounded-[6px] border border-s-stroke2 bg-b-surface1 px-2 py-1.5">
                    <span className="text-[10px] text-t-tertiary">{h.label}</span>
                    <code className="mt-0.5 text-xs text-t-primary">{h.snippet}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* error banner */}
          {error && (
            <p className="rounded-[10px] border border-primary-03/30 bg-primary-03/10 px-3 py-2 text-sm text-primary-03">{error}</p>
          )}

          {/* question text */}
          <MathTextarea
            label="Question text"
            value={draft.question_text ?? ""}
            disabled={!canEdit}
            onChange={(v) => setDraft({ ...draft, question_text: v })}
            minRows={5}
            placeholder="Type question text here. Use $...$ for inline math, $$...$$ for display math."
          />

          {/* metadata grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {subjects.length > 0 ? (
              <SelectField
                label="Subject"
                value={draft.subject ?? ""}
                options={subjects}
                disabled={!canEdit}
                onChange={(v) => setDraft({ ...draft, subject: v })}
                placeholder="Select…"
              />
            ) : (
              <label className="block text-xs font-bold uppercase tracking-wider text-t-secondary">
                Subject
                <input disabled={!canEdit} value={draft.subject ?? ""} onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  className="mt-2 h-10 w-full rounded-[9px] border border-s-stroke2 bg-b-surface1 px-3 text-sm font-medium normal-case text-t-primary outline-none focus:border-primary-01 disabled:opacity-60" />
              </label>
            )}
            <label className="block text-xs font-bold uppercase tracking-wider text-t-secondary col-span-1 sm:col-span-2">
              Chapter
              <input disabled={!canEdit} value={draft.chapter ?? ""} onChange={(e) => setDraft({ ...draft, chapter: e.target.value })}
                className="mt-2 h-10 w-full rounded-[9px] border border-s-stroke2 bg-b-surface1 px-3 text-sm font-medium normal-case text-t-primary outline-none focus:border-primary-01 disabled:opacity-60" />
            </label>
            <SelectField
              label="Difficulty"
              value={draft.difficulty ?? ""}
              options={DIFFICULTY_OPTIONS}
              disabled={!canEdit}
              onChange={(v) => setDraft({ ...draft, difficulty: v })}
              placeholder="Select…"
            />
          </div>

          {/* topic (full width) */}
          <label className="block text-xs font-bold uppercase tracking-wider text-t-secondary">
            Topic
            <input disabled={!canEdit} value={draft.topic ?? ""} onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
              className="mt-2 h-10 w-full rounded-[9px] border border-s-stroke2 bg-b-surface1 px-3 text-sm font-medium normal-case text-t-primary outline-none focus:border-primary-01 disabled:opacity-60" />
          </label>

          {/* options */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-t-secondary">Options & answer key</p>
              {canEdit && (
                <button onClick={addOption} className="rounded-[8px] border border-s-stroke2 bg-b-surface2 px-3 py-1.5 text-xs font-semibold text-t-primary transition-colors hover:bg-b-surface1">
                  + Add option
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {options.map((opt, idx) => (
                <div key={`${opt.id}-${idx}`} className="relative">
                  <OptionRow
                    option={opt}
                    index={idx}
                    isCorrect={!!draft.correct_answer?.includes(opt.id)}
                    disabled={!canEdit}
                    isSingle={isSingle}
                    onTextChange={(v) => setOption(idx, { text: v })}
                    onToggle={() => toggleCorrect(opt.id)}
                  />
                  {canEdit && options.length > 2 && (
                    <button
                      onClick={() => removeOption(idx)}
                      className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full border border-s-stroke2 bg-b-surface1 text-t-tertiary transition-colors hover:text-primary-03"
                    >
                      <RiCloseLine size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* explanation */}
          <MathTextarea
            label="Explanation / solution"
            value={draft.explanation ?? ""}
            disabled={!canEdit}
            onChange={(v) => setDraft({ ...draft, explanation: v })}
            minRows={3}
            placeholder="Explain the solution step by step…"
          />
        </div>

        {/* sticky save bar */}
        {canEdit && (
          <div className="mt-auto flex items-center gap-3 border-t border-s-stroke2 bg-b-surface1 px-5 py-3">
            <button
              disabled={saving}
              onClick={save}
              className="h-10 rounded-[10px] bg-[#151515] px-5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {saving ? "Saving…" : "Save question"}
            </button>
            {savedAt && (
              <p className="text-xs text-t-secondary">
                Saved {savedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <p className="ml-auto text-xs text-t-tertiary">v{question.content_version ?? 1}</p>
          </div>
        )}
      </section>

      {/* ── RIGHT: student preview ─────────────────────────────────────── */}
      <aside className="card h-fit p-5 md:sticky md:top-6">
        <div className="mb-1 flex items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-t-tertiary">Student preview</p>
        </div>
        {draft.subject && (
          <p className="mb-4 text-xs text-t-secondary">
            {draft.subject}{draft.chapter ? ` · ${draft.chapter}` : ""}{draft.topic ? ` · ${draft.topic}` : ""}
            {draft.difficulty && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                draft.difficulty === "Hard" ? "bg-red-500/10 text-red-500" :
                draft.difficulty === "Medium" ? "bg-amber-500/10 text-amber-500" :
                "bg-green-500/10 text-green-500"
              }`}>{draft.difficulty}</span>
            )}
          </p>
        )}
        <div className="border-b border-s-stroke2 pb-5 text-base font-semibold leading-relaxed text-t-primary">
          <MarkdownRenderer>{draft.question_text || "Question text will appear here."}</MarkdownRenderer>
        </div>
        <div className="mt-4 space-y-2.5">
          {options.map((opt) => (
            <div
              key={opt.id}
              className={`rounded-[10px] border px-3 py-2.5 text-sm transition-colors ${
                draft.correct_answer?.includes(opt.id)
                  ? "border-primary-02/50 bg-primary-02/5"
                  : "border-s-stroke2 bg-b-surface2"
              }`}
            >
              <span className="mr-2 font-bold">{opt.id}.</span>
              <MarkdownRenderer>{opt.text || "—"}</MarkdownRenderer>
            </div>
          ))}
        </div>
        {draft.explanation && (
          <div className="mt-5 rounded-[10px] bg-b-surface2 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-t-secondary">Solution</p>
            <MarkdownRenderer>{draft.explanation}</MarkdownRenderer>
          </div>
        )}
      </aside>
    </div>
  );
}
