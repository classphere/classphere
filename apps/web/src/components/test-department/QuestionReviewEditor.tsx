"use client";

import { useEffect, useState } from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type Option = { id: string; text?: string; image_url?: string | null };
type Question = Record<string, any> & { options?: Option[]; correct_answer?: string[]; content_version?: number };

export function QuestionReviewEditor({ question, canEdit, onSave }: { question: Question; canEdit: boolean; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const [draft, setDraft] = useState<Question>(question);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setDraft(question), [question]);
  const options = Array.isArray(draft.options) ? draft.options : [];
  const setOption = (index: number, patch: Partial<Option>) => setDraft((current) => ({ ...current, options: options.map((option, i) => i === index ? { ...option, ...patch } : option) }));
  const addOption = () => setDraft((current) => ({ ...current, options: [...options, { id: String.fromCharCode(65 + options.length), text: "", image_url: null }] }));
  const toggleCorrect = (id: string) => setDraft((current) => {
    const answers = Array.isArray(current.correct_answer) ? current.correct_answer : [];
    const single = current.question_type === "mcq_single" || current.question_type === "assertion_reason";
    return { ...current, correct_answer: single ? [id] : answers.includes(id) ? answers.filter((answer) => answer !== id) : [...answers, id] };
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
        marking_scheme: draft.marking_scheme ?? null,
      });
    } catch (saveError: any) { setError(saveError?.message ?? "Could not save this question."); }
    finally { setSaving(false); }
  };

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
    <section className="card p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-t-tertiary">Editable source</p>
          <h2 className="mt-1 text-lg font-semibold text-t-primary">Question {question.position}</h2>
        </div>
        <span className="rounded-full border border-s-stroke2 bg-b-surface2 px-3 py-1 text-xs font-semibold capitalize text-t-secondary">{draft.question_type?.replaceAll("_", " ")}</span>
      </div>
      {error && <p className="mb-4 rounded-[10px] border border-primary-03/30 bg-primary-03/10 px-3 py-2 text-sm text-primary-03">{error}</p>}
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-t-secondary">Question text</label>
      <textarea disabled={!canEdit} value={draft.question_text ?? ""} onChange={(event) => setDraft({ ...draft, question_text: event.target.value })} className="min-h-40 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 p-3 font-mono text-sm text-t-primary outline-none focus:border-primary-01 disabled:opacity-70" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[["Subject", "subject"], ["Chapter", "chapter"], ["Topic", "topic"], ["Difficulty", "difficulty"]].map(([label, field]) => <label key={field} className="text-xs font-bold uppercase tracking-wider text-t-secondary">{label}<input disabled={!canEdit} value={draft[field] ?? ""} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} className="mt-2 h-10 w-full rounded-[9px] border border-s-stroke2 bg-b-surface1 px-3 text-sm font-medium normal-case text-t-primary outline-none focus:border-primary-01" /></label>)}
      </div>
      <div className="mt-6 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-t-secondary">Options & answer key</p>{canEdit && <button onClick={addOption} className="rounded-[8px] border border-s-stroke2 px-3 py-1.5 text-xs font-semibold text-t-primary">Add option</button>}</div>
      <div className="mt-3 space-y-3">{options.map((option, index) => <div key={`${option.id}-${index}`} className="flex items-start gap-3 rounded-[10px] border border-s-stroke2 bg-b-surface2/50 p-3"><button disabled={!canEdit} onClick={() => toggleCorrect(option.id)} className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${draft.correct_answer?.includes(option.id) ? "border-primary-02 bg-primary-02 text-white" : "border-s-stroke2 bg-b-surface1 text-t-secondary"}`}>{option.id}</button><textarea disabled={!canEdit} value={option.text ?? ""} onChange={(event) => setOption(index, { text: event.target.value })} className="min-h-14 flex-1 resize-y bg-transparent text-sm text-t-primary outline-none" placeholder={`Option ${option.id}`} /></div>)}</div>
      <label className="mt-6 block text-xs font-bold uppercase tracking-wider text-t-secondary">Explanation / solution<textarea disabled={!canEdit} value={draft.explanation ?? ""} onChange={(event) => setDraft({ ...draft, explanation: event.target.value })} className="mt-2 min-h-28 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 p-3 text-sm text-t-primary outline-none focus:border-primary-01" /></label>
      {canEdit && <button disabled={saving} onClick={save} className="mt-5 h-11 rounded-[10px] bg-[#151515] px-5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black">{saving ? "Saving…" : "Save question"}</button>}
    </section>
    <aside className="card h-fit p-5 md:sticky md:top-6">
      <p className="text-[11px] font-bold uppercase tracking-wider text-t-tertiary">Student preview</p>
      <div className="mt-4 border-b border-s-stroke2 pb-5 text-base font-semibold leading-relaxed text-t-primary"><MarkdownRenderer>{draft.question_text || "Question text will appear here."}</MarkdownRenderer></div>
      <div className="mt-4 space-y-3">{options.map((option) => <div key={option.id} className={`rounded-[10px] border p-3 text-sm ${draft.correct_answer?.includes(option.id) ? "border-primary-02/50 bg-primary-02/5" : "border-s-stroke2 bg-b-surface2"}`}><span className="mr-2 font-bold">{option.id}.</span><MarkdownRenderer>{option.text || "—"}</MarkdownRenderer></div>)}</div>
      {draft.explanation && <div className="mt-5 rounded-[10px] bg-b-surface2 p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-t-secondary">Solution</p><MarkdownRenderer>{draft.explanation}</MarkdownRenderer></div>}
    </aside>
  </div>;
}
