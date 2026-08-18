"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QuestionReviewEditor } from "./QuestionReviewEditor";
import { ValidationPanel, type ValidationResult } from "./ValidationPanel";
import { PaperComposition } from "./PaperComposition";
import { MarkingSchemeEditor, type MarkingScheme } from "./MarkingSchemeEditor";
import { PaperDetailsEditor, type PaperDetails } from "./PaperDetailsEditor";
import { EXAM_LABELS, EXAM_SUBJECTS, SUBJECT_COLOR, requiresExplicitScheme, uniformScheme } from "@/lib/exam-config";
import { RiShieldCheckLine, RiLoader4Line } from "@remixicon/react";

/**
 * Reviewing a PDF-extracted paper.
 *
 * One workspace for every role that does this job. A large coaching has a test
 * department; a small one has an owner who does everything; a superadmin curates
 * the global bank. They are all looking at the same extracted paper with the
 * same defects, so they get the same screen — validation worklist, marks
 * summary, subject navigation, the question editor, and removal.
 *
 * Previously this lived twice: a Test Department page and a Superadmin page,
 * sharing only the question editor. Anything added to one appeared on that one
 * alone, which is how the Superadmin screen ended up with no validation and no
 * way to delete a question the extractor had invented.
 *
 * The pages keep what genuinely differs — their own heading and their own
 * workflow buttons — and pass the endpoints in, because an institute paper and a
 * global one are reached by different routes.
 */

export interface PaperReviewWorkspaceProps {
  paper: any;
  questions: any[];
  canEdit: boolean;
  examCode: string;
  onSaveQuestion: (payload: Record<string, unknown>, question: any) => Promise<void>;
  /** Omitted where the surface cannot remove questions. */
  onDeleteQuestion?: (question: any) => Promise<void>;
  /** Omitted where the surface cannot set the paper's marks. */
  onSaveMarkingScheme?: (scheme: MarkingScheme) => Promise<void>;
  /**
   * Duration, total marks, marking scheme and delivery windows in one save.
   *
   * Where this is supplied it replaces the marking-scheme-only panel below: an
   * institute paper is scheduled and sat, so its duration and windows matter and
   * are edited alongside its marks. A global bank paper has none of that and
   * keeps the narrower panel.
   */
  onSavePaperDetails?: (details: Partial<PaperDetails>) => Promise<void>;
  onValidate: () => Promise<ValidationResult>;
  /** Omitted where the surface has no AI gap-fill (only the institute PDF-upload review flow does). */
  onAiFillGap?: (question: any) => Promise<void>;
  /** Rendered beside the Validate button — the page's own workflow actions. */
  actions?: React.ReactNode;
}

const PANEL_H = "calc(100vh - 260px)";

export function PaperReviewWorkspace({
  paper,
  questions,
  canEdit,
  examCode,
  onSaveQuestion,
  onDeleteQuestion,
  onSaveMarkingScheme,
  onSavePaperDetails,
  onValidate,
  onAiFillGap,
  actions,
}: PaperReviewWorkspaceProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [draftScheme, setDraftScheme] = useState<MarkingScheme | null>(null);
  const [savingScheme, setSavingScheme] = useState(false);

  // The first question selects itself once, then the reviewer owns the
  // selection — the `current ??` guard stops a refetch yanking them back to the
  // top of the paper mid-review.
  const firstQuestion = questions[0];
  useEffect(() => {
    if (!firstQuestion) return;
    setActiveId((current) => current ?? firstQuestion.id ?? null);
    setActiveTab((current) => current ?? firstQuestion.subject ?? null);
  }, [firstQuestion]);

  const question = useMemo(
    () => questions.find((q) => q.id === activeId) ?? questions[0] ?? null,
    [questions, activeId],
  );

  // ── Subject sections ───────────────────────────────────────────────────────
  const subjects = EXAM_SUBJECTS[examCode] ?? [];
  const sections = useMemo(() => {
    if (!questions.length) return [];
    const seen = [...new Set(questions.map((q) => q.subject).filter(Boolean))] as string[];
    const canonical = subjects.length ? subjects.filter((s) => seen.includes(s)) : seen;
    const extras = seen.filter((s) => !subjects.includes(s));
    const ordered = [...canonical, ...extras];
    if (!ordered.length) return [{ subject: "All", qs: questions }];
    return ordered.map((subject) => ({ subject, qs: questions.filter((q) => q.subject === subject) }));
  }, [questions, subjects]);

  useEffect(() => {
    if (sections.length && !activeTab) setActiveTab(sections[0].subject);
  }, [sections, activeTab]);

  // The tab follows the question, but only when the question changed — otherwise
  // a tab the reviewer just clicked would be immediately overridden.
  const previousActiveId = useRef<string | null>(null);
  useEffect(() => {
    if (activeId !== previousActiveId.current) {
      previousActiveId.current = activeId;
      if (question?.subject && sections.some((s) => s.subject === question.subject)) {
        setActiveTab(question.subject);
      }
    }
  }, [activeId, question, sections]);

  const activeSection = sections.find((s) => s.subject === activeTab) ?? sections[0];

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const tag = (event.target as Element)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if ((event.target as HTMLElement)?.isContentEditable) return;
      const index = questions.findIndex((q) => q.id === activeId);
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        const next = questions[Math.min(index + 1, questions.length - 1)];
        if (next) setActiveId(next.id);
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        const previous = questions[Math.max(index - 1, 0)];
        if (previous) setActiveId(previous.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [questions, activeId]);

  // ── Marks ──────────────────────────────────────────────────────────────────
  // Most papers never state a scheme and never need to: NEET and JEE Main mark
  // every question +4/-1, so the exam already answers the question. Only an exam
  // whose marks vary by question type — JEE Advanced — has to be asked, and only
  // when the paper itself did not say.
  //
  // This used to be decided from the stored scheme alone, which meant every
  // paper that had not stored one was treated as unpriced. A NEET paper would
  // demand five rows of marks that are the same five numbers every time, when
  // publishing it would have succeeded untouched — the API has always gated this
  // on the exam.
  const scheme: MarkingScheme = (paper?.marking_scheme as MarkingScheme) ?? {};
  const editingScheme = draftScheme ?? scheme;
  const needsOwnScheme = requiresExplicitScheme(examCode);

  // What the paper is actually scored on.
  //
  // A surface that sets its own details is scored on its own scheme and nothing
  // else, so an unpriced paper must read as unpriced — falling back to the
  // exam's conventional marks here would draw a fully-priced table for a paper
  // that has agreed to no marks at all, which is the one thing the reviewer
  // needs to see. Elsewhere the fallback stays: a global bank paper is scored on
  // the exam's standard scheme, so showing every row as "not set" would be the
  // misleading answer there.
  const effectiveScheme = useMemo(
    () => {
      if (Object.keys(scheme).length) return scheme;
      return onSavePaperDetails ? null : (uniformScheme(examCode) as MarkingScheme | null);
    },
    [paper?.marking_scheme, examCode, onSavePaperDetails],
  );

  const unpricedTypes = useMemo(() => {
    if (!needsOwnScheme) return [];
    if (scheme.default) return [];
    const present = new Set(questions.map((q) => String(q?.question_type ?? "").trim()).filter(Boolean));
    return [...present].filter((type) => !scheme[type]);
  }, [questions, paper?.marking_scheme, needsOwnScheme]);

  const validate = async () => {
    setValidating(true);
    setMessage("");
    try { setValidation(await onValidate()); }
    catch (error: any) { setMessage(error?.message ?? "Could not validate the paper."); }
    finally { setValidating(false); }
  };

  const saveScheme = async () => {
    if (!onSaveMarkingScheme) return;
    setSavingScheme(true);
    try {
      await onSaveMarkingScheme(editingScheme);
      setDraftScheme(null);
      setMessage("Marking scheme saved. The totals now reflect it.");
    } catch (error: any) { setMessage(error?.message ?? "Could not save the marking scheme."); }
    finally { setSavingScheme(false); }
  };

  const removeQuestion = onDeleteQuestion
    ? async (target: any) => {
        const index = questions.findIndex((q) => q.id === target.id);
        const next = questions[index + 1] ?? questions[index - 1] ?? null;
        await onDeleteQuestion(target);
        setActiveId(next?.id ?? null);
        setMessage(`Removed question ${target.question_number ?? ""}.`.trim());
        // The worklist named a question that is now gone.
        setValidation(null);
      }
    : undefined;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={validate}
          disabled={validating}
          className="flex h-11 items-center gap-2 rounded-md border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary transition-colors hover:border-primary-01/40 disabled:opacity-50"
        >
          {validating ? <RiLoader4Line size={16} className="animate-spin" /> : <RiShieldCheckLine size={16} />}
          {validating ? "Validating…" : "Validate paper"}
        </button>
        {actions}
      </div>

      {validation && (
        <ValidationPanel
          result={validation}
          onClose={() => setValidation(null)}
          // The panel stays open on jump: the reviewer is working through a list
          // and closing it after the first fix would lose their place.
          onJump={(questionId) => setActiveId(questionId)}
        />
      )}

      {message && (
        <div className="mb-3 rounded-md border border-s-stroke2 bg-b-surface2 px-4 py-2.5 text-sm text-t-secondary">
          {message}
        </div>
      )}

      {onSavePaperDetails && (
        <PaperDetailsEditor
          // Keyed on the paper alone. Keying on review_version too would remount
          // the panel on every save, collapsing it the instant the reviewer used
          // it — and the fields already hold what was just sent.
          key={paper?.id}
          paper={paper}
          questions={questions}
          examCode={examCode}
          canEdit={canEdit}
          onSave={onSavePaperDetails}
        />
      )}

      <PaperComposition
        questions={questions}
        markingScheme={effectiveScheme}
        statedTotal={paper?.total_marks}
      />

      {/* The narrower panel, for surfaces with no PaperDetailsEditor: a global
          bank paper has no duration to set and no window to open in. */}
      {!onSavePaperDetails && unpricedTypes.length > 0 && onSaveMarkingScheme && canEdit && (
        <div className="card mb-3 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-t-secondary">
            What is each question worth?
          </p>
          <p className="mb-3 mt-1 text-xs text-t-secondary">
            {EXAM_LABELS[examCode] ?? "This exam"} scores question types differently and this
            paper&apos;s instructions page was missing or unreadable, so there is no safe default
            to score it against. It cannot be published until these are set.
          </p>
          <MarkingSchemeEditor
            value={editingScheme}
            onChange={setDraftScheme}
            presentTypes={unpricedTypes}
          />
          <button
            type="button"
            onClick={saveScheme}
            disabled={savingScheme || draftScheme === null}
            className="btn btn-flat mt-3 h-10 px-5 text-sm"
          >
            {savingScheme ? "Saving…" : "Save marking scheme"}
          </button>
        </div>
      )}

      <main className="grid w-full gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="card flex flex-col p-3" style={{ height: PANEL_H }}>
          <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-s-stroke2 pb-2.5">
            <p className="text-sm font-bold text-t-primary">Questions</p>
            <p className="text-xs text-t-secondary">{questions.length} total</p>
          </div>
          {sections.length > 1 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {sections.map((section) => (
                <button
                  key={section.subject}
                  type="button"
                  onClick={() => setActiveTab(section.subject)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    activeTab === section.subject ? "bg-shade-02 text-white" : "bg-b-surface2 text-t-secondary hover:text-t-primary"
                  }`}
                >
                  {section.subject} <span className="opacity-60">{section.qs.length}</span>
                </button>
              ))}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2">
              {(activeSection?.qs ?? []).map((item: any) => {
                const blank = !String(item.question_text ?? "").trim();
                const unanswered = !(item.correct_answer?.length);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    title={blank ? "Empty slot" : unanswered ? "No answer set" : undefined}
                    className={`relative aspect-square rounded-md border text-sm font-bold transition ${
                      activeId === item.id
                        ? "border-primary-01 bg-primary-01 text-white"
                        : blank
                          ? "border-primary-03/40 bg-primary-03/10 text-primary-03"
                          : unanswered
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-600"
                            : "border-s-stroke2 bg-b-surface2 text-t-primary hover:border-primary-01/40"
                    }`}
                  >
                    {/* The tab bar only appears on a multi-subject paper, so
                        without this a reviewer scrolling a long single-subject
                        section has nothing telling them where they are. */}
                    {item.subject && SUBJECT_COLOR[item.subject] && (
                      <span
                        aria-hidden
                        className={`absolute left-1 top-1 size-1.5 rounded-full ${SUBJECT_COLOR[item.subject].dot}`}
                      />
                    )}
                    {item.question_number ?? item.position ?? "?"}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="min-w-0" style={{ height: PANEL_H }}>
          {question ? (
            <div className="card h-full overflow-hidden rounded-[12px] p-0">
              <QuestionReviewEditor
                // Remounts (and re-syncs its local draft) on content_version
                // too, not just id — otherwise an AI gap-fill updates the
                // question in the cache but the open editor keeps showing
                // the stale blank content until the reviewer navigates away
                // and back.
                key={`${question.id}-${question.content_version ?? 0}`}
                question={question}
                canEdit={canEdit}
                examCode={examCode}
                onSave={(payload) => onSaveQuestion(payload, question)}
                onDelete={canEdit ? removeQuestion : undefined}
                onAiFillGap={onAiFillGap}
              />
            </div>
          ) : (
            <p className="card p-8 text-t-secondary">No questions attached to this paper.</p>
          )}
        </section>
      </main>
    </>
  );
}
