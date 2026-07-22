"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { QuestionReviewEditor } from "@/components/test-department/QuestionReviewEditor";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { EXAM_LABELS, EXAM_SUBJECTS, SUBJECT_ABBR, SUBJECT_COLOR } from "@/lib/exam-config";
import {
  RiCheckLine, RiAlertLine, RiErrorWarningLine, RiArrowDownSLine, RiShieldCheckLine,
} from "@remixicon/react";

// ── Workflow status badge ─────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  draft:             "bg-b-surface2 text-t-secondary border-s-stroke2",
  needs_review:      "bg-amber-500/10 text-amber-500 border-amber-500/30",
  changes_requested: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  approved:          "bg-green-500/10 text-green-600 border-green-500/30",
  published:         "bg-blue-500/10 text-blue-500 border-blue-500/30",
  archived:          "bg-b-surface2 text-t-tertiary border-s-stroke2",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLES[status] ?? "bg-b-surface2 text-t-secondary border-s-stroke2"}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

// ── Validation panel ──────────────────────────────────────────────────────────
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  counts: Record<string, number>;
  total: number;
  examCode: string;
}

function ValidationPanel({ result, onClose }: { result: ValidationResult; onClose: () => void }) {
  return (
    <div className={`mb-4 rounded-[14px] border p-4 ${result.valid ? "border-green-500/30 bg-green-500/5" : "border-primary-03/30 bg-primary-03/5"}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {result.valid
            ? <RiShieldCheckLine size={18} className="text-green-600" />
            : <RiErrorWarningLine size={18} className="text-primary-03" />
          }
          <p className="text-sm font-bold text-t-primary">
            {result.valid ? "Paper is valid ✓" : "Paper validation failed"}
          </p>
        </div>
        <button onClick={onClose} className="text-[11px] text-t-tertiary hover:text-t-primary">Dismiss</button>
      </div>

      {/* Subject counts */}
      <div className="mb-3 flex flex-wrap gap-2">
        {Object.entries(result.counts).map(([sub, count]) => {
          const color = SUBJECT_COLOR[sub];
          return (
            <span
              key={sub}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                color ? `${color.bg} ${color.border} ${color.text}` : "border-s-stroke2 bg-b-surface2 text-t-secondary"
              }`}
            >
              {sub}: {count}
            </span>
          );
        })}
        <span className="rounded-full border border-s-stroke2 bg-b-surface2 px-2.5 py-0.5 text-xs text-t-secondary">
          Total: {result.total}
        </span>
      </div>

      {result.errors.map((e, i) => (
        <div key={i} className="mb-1.5 flex items-start gap-2">
          <RiErrorWarningLine size={13} className="mt-0.5 shrink-0 text-primary-03" />
          <p className="text-xs text-primary-03">{e}</p>
        </div>
      ))}
      {result.warnings.map((w, i) => (
        <div key={i} className="mb-1.5 flex items-start gap-2">
          <RiAlertLine size={13} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-600 dark:text-amber-400">{w}</p>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReviewPaperPage() {
  const params = useParams<{ id: string }>();
  const { session, user } = useAuth();

  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState(0);
  const [message, setMessage] = useState("");
  const [transacting, setTransacting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  // Track collapsed sections in the sidebar
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const isHead         = user?.role === "test_department_head";
  const isMember       = user?.role === "test_department_member";
  const isDepartmentUser = isHead || isMember;

  // ── Data fetching ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!session?.access_token || !params.id) return;
    const result: any = await apiClient.get(
      `/api/v1/test-department/papers/${params.id}`,
      session.access_token,
    );
    setData(result.data);
  }, [session?.access_token, params.id]);

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, [load]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const paper     = data?.paper;
  const questions: any[] = data?.questions ?? [];
  const status    = paper?.workflow_status ?? "draft";
  const examCode  = paper?.exam_code?.code ?? "";
  const examLabel = EXAM_LABELS[examCode] ?? examCode;
  const subjects  = EXAM_SUBJECTS[examCode] ?? [];

  const canEdit = ["draft", "changes_requested", "needs_review"].includes(status) && isDepartmentUser;

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as Element)?.tagName;
      // Don't intercept when typing in inputs — BUT allow arrows if not in a textarea
      if (["INPUT", "SELECT"].includes(tag)) return;
      if (tag === "TEXTAREA") return;
      // Also skip contenteditable spans
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, questions.length - 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [questions.length]);

  // ── Workflow actions ────────────────────────────────────────────────────────
  const transition = async (action: string) => {
    setTransacting(true);
    try {
      const response: any = await apiClient.post(
        `/api/v1/test-department/papers/${params.id}/workflow`,
        { action },
        session!.access_token,
      );
      setData({ ...data, paper: response.data.paper });
      setMessage(
        action === "publish"         ? "Test published. Students will see it at the scheduled time." :
        action === "approve"         ? "Paper approved and ready to publish." :
        action === "request_changes" ? "Changes requested. The editor will be notified." :
        "Workflow updated.",
      );
    } catch (e: any) { setMessage(e.message); }
    finally { setTransacting(false); }
  };

  // ── Validate paper ──────────────────────────────────────────────────────────
  const runValidation = async () => {
    if (!session?.access_token || !params.id) return;
    setValidating(true);
    setValidation(null);
    try {
      const res: any = await apiClient.get(
        `/api/v1/test-department/papers/${params.id}/validate`,
        session.access_token,
      );
      setValidation(res.data);
    } catch (e: any) { setMessage(e.message); }
    finally { setValidating(false); }
  };

  // ── Save handlers ───────────────────────────────────────────────────────────
  const question = questions[active];

  const save = async (payload: Record<string, unknown>) => {
    await apiClient.patch(
      `/api/v1/test-department/papers/${params.id}/questions/${question.id}`,
      payload,
      session!.access_token,
    );
    await load();
    setMessage("Question saved.");
    setTimeout(() => setMessage(""), 3000);
  };

  const saveMetadata = async (payload: Record<string, unknown>) => {
    await apiClient.patch(
      `/api/v1/test-department/papers/${params.id}/questions/${question.id}`,
      payload,
      session!.access_token,
    );
    await load();
    setMessage("Classification saved.");
    setTimeout(() => setMessage(""), 3000);
  };

  // ── Sidebar: section-by-section (mirrors student exam view) ────────────────
  /**
   * Group questions into sections in canonical subject order.
   * Each section shows all questions with that subject, in position order.
   * This exactly matches how students see the paper during the exam.
   */
  const sections = useMemo(() => {
    if (!questions.length) return [];
    // Use canonical subject order from exam config; then any leftover subjects
    const canonicalOrder = subjects.length ? subjects : [];
    const seenSubjects = new Set(questions.map((q) => q.subject).filter(Boolean));
    const extraSubjects = [...seenSubjects].filter((s) => !canonicalOrder.includes(s));
    const orderedSubjects = [...canonicalOrder.filter((s) => seenSubjects.has(s)), ...extraSubjects];

    // If no subjects at all, show a single "All Questions" section
    if (orderedSubjects.length === 0) {
      return [{ subject: "All Questions", questions: questions.map((q, i) => ({ ...q, _pos: i })) }];
    }

    return orderedSubjects.map((sub) => ({
      subject: sub,
      questions: questions
        .map((q, i) => ({ ...q, _pos: i }))
        .filter((q) => q.subject === sub),
    }));
  }, [questions, subjects]);

  const toggleSection = (sub: string) =>
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.has(sub) ? next.delete(sub) : next.add(sub);
      return next;
    });

  // ── Loading state ───────────────────────────────────────────────────────────
  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-t-secondary">
        Loading review workspace…
      </main>
    );
  }

  // ── Completion stats ────────────────────────────────────────────────────────
  const complete = questions.filter((q) => (q.correct_answer?.length ?? 0) > 0).length;
  const pct      = questions.length ? Math.round((complete / questions.length) * 100) : 0;

  return (
    <>
      {/* ── Navbar ────────────────────────────────────────────────────────────── */}
      <Navbar
        title={paper.title}
        breadcrumbs="TEST DEPARTMENT › PAPER REVIEW"
        subtitle={`${questions.length} questions`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {examLabel && (
            <span className="rounded-full border border-s-stroke2 bg-b-surface2 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-t-secondary">
              {examLabel}
            </span>
          )}

          {/* Validate button — always visible for dept users */}
          {isDepartmentUser && (
            <button
              disabled={validating}
              onClick={runValidation}
              className="h-9 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary disabled:opacity-60 hover:border-primary-01/40"
            >
              {validating ? "Validating…" : "Validate paper"}
            </button>
          )}

          {/* Workflow buttons */}
          {["draft", "changes_requested"].includes(status) && isDepartmentUser && (
            <button
              disabled={transacting}
              onClick={() => transition("submit")}
              className="h-9 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary disabled:opacity-60"
            >
              Submit for review
            </button>
          )}
          {isHead && status === "needs_review" && (
            <>
              <button
                disabled={transacting}
                onClick={() => transition("request_changes")}
                className="h-9 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary disabled:opacity-60"
              >
                Request changes
              </button>
              <button
                disabled={transacting}
                onClick={() => transition("approve")}
                className="h-9 rounded-[10px] bg-[#151515] px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
              >
                Mark ready to publish
              </button>
            </>
          )}
          {isHead && status === "approved" && (
            <button
              disabled={transacting}
              onClick={() => transition("publish")}
              className="h-9 rounded-[10px] bg-[#151515] px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
            >
              Publish test
            </button>
          )}
        </div>
      </Navbar>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <main className="mx-auto grid w-full max-w-[1600px] gap-5 px-4 pb-12 pt-5 md:px-6 lg:grid-cols-[300px_minmax(0,1fr)]">

        {/* ── LEFT sidebar ─────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-3">
          {/* Progress card */}
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-t-secondary">Completion</p>
              <p className="text-xs font-bold text-t-primary">{complete} / {questions.length}</p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-b-surface2">
              <div
                className="h-full rounded-full bg-primary-01 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-t-tertiary">{pct}% have a correct answer set</p>
          </div>

          {/* Section-by-section navigator — mirrors student exam order */}
          <div className="card overflow-hidden p-0">
            <div className="border-b border-s-stroke2 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-t-secondary">
                Question navigator
              </p>
              <p className="mt-0.5 text-[10px] text-t-tertiary">
                Matches student exam order
              </p>
            </div>
            <div className="max-h-[620px] overflow-y-auto">
              {sections.map(({ subject, questions: secQs }) => {
                const color      = SUBJECT_COLOR[subject];
                const collapsed  = collapsedSections.has(subject);
                const secComplete = secQs.filter((q) => (q.correct_answer?.length ?? 0) > 0).length;

                return (
                  <div key={subject} className="border-b border-s-stroke2 last:border-0">
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(subject)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-b-surface2/50 transition-colors"
                    >
                      {/* Subject color dot */}
                      {color && (
                        <span className={`h-2 w-2 rounded-full ${color.dot ?? "bg-primary-01"} shrink-0`} />
                      )}
                      <span className="flex-1 text-left text-xs font-bold text-t-primary">
                        {subject}
                      </span>
                      <span className="text-[10px] text-t-tertiary">
                        {secComplete}/{secQs.length}
                      </span>
                      <RiArrowDownSLine
                        size={14}
                        className={`shrink-0 text-t-tertiary transition-transform ${collapsed ? "-rotate-90" : ""}`}
                      />
                    </button>

                    {/* Question cells */}
                    {!collapsed && (
                      <div className="grid grid-cols-6 gap-1.5 px-3 pb-3">
                        {secQs.map((item) => {
                          const isActive  = active === item._pos;
                          const hasAnswer = (item.correct_answer?.length ?? 0) > 0;
                          return (
                            <button
                              key={item.id}
                              onClick={() => setActive(item._pos)}
                              title={`Q${item._pos + 1} · ${item.subject ?? ""} · ${item.question_type?.replaceAll("_", " ")}`}
                              className={[
                                "flex flex-col items-center justify-center gap-0.5 rounded-[9px] border p-1.5 text-[11px] font-bold transition-all",
                                isActive
                                  ? "border-primary-01 bg-primary-01 text-white shadow-sm"
                                  : hasAnswer
                                    ? color
                                      ? `${color.bg} ${color.border} ${color.text}`
                                      : "border-green-500/30 bg-green-500/10 text-green-600"
                                    : "border-s-stroke2 bg-b-surface2/50 text-t-secondary hover:border-primary-01/40 hover:text-t-primary",
                              ].join(" ")}
                            >
                              <span className="leading-none">{item._pos + 1}</span>
                              {hasAnswer && !isActive && (
                                <RiCheckLine size={8} className="opacity-60" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Keyboard hint */}
          <p className="px-1 text-[11px] text-t-tertiary">
            Tip:{" "}
            <kbd className="rounded border border-s-stroke2 bg-b-surface1 px-1 font-mono text-[10px]">←</kbd>{" "}
            <kbd className="rounded border border-s-stroke2 bg-b-surface1 px-1 font-mono text-[10px]">→</kbd>{" "}
            to navigate questions
          </p>
        </aside>

        {/* ── RIGHT: editor ────────────────────────────────────────────────── */}
        <section>
          {/* Validation panel */}
          {validation && (
            <ValidationPanel result={validation} onClose={() => setValidation(null)} />
          )}

          {/* Toast message */}
          {message && (
            <p className="mb-4 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-3 text-sm text-t-secondary">
              {message}
            </p>
          )}

          {/* Question editor */}
          {question ? (
            <div className="card overflow-hidden p-0" style={{ minHeight: "calc(100vh - 200px)" }}>
              <QuestionReviewEditor
                key={question.id}
                question={{ ...question, position: active + 1 }}
                canEdit={canEdit}
                onSave={save}
                onSaveMetadata={saveMetadata}
                examCode={examCode}
              />
            </div>
          ) : (
            <p className="card p-8 text-t-secondary">No questions are attached to this paper.</p>
          )}
        </section>
      </main>
    </>
  );
}
