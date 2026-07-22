"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { QuestionReviewEditor } from "@/components/test-department/QuestionReviewEditor";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { EXAM_LABELS, EXAM_SUBJECTS, SUBJECT_COLOR } from "@/lib/exam-config";
import { RiCheckLine, RiAlertLine, RiErrorWarningLine, RiShieldCheckLine } from "@remixicon/react";

// ── Status badge ──────────────────────────────────────────────────────────────
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
  valid: boolean; errors: string[]; warnings: string[];
  counts: Record<string, number>; total: number; examCode: string;
}
function ValidationPanel({ result, onClose }: { result: ValidationResult; onClose: () => void }) {
  return (
    <div className={`mb-4 rounded-[12px] border p-4 text-sm ${result.valid ? "border-green-500/30 bg-green-500/5" : "border-primary-03/30 bg-primary-03/5"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {result.valid ? <RiShieldCheckLine size={16} className="text-green-600" /> : <RiErrorWarningLine size={16} className="text-primary-03" />}
          <span className="font-semibold text-t-primary">{result.valid ? "Paper is valid" : "Validation failed"}</span>
        </div>
        <button onClick={onClose} className="text-[11px] text-t-tertiary hover:text-t-primary">Dismiss</button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {Object.entries(result.counts).map(([sub, count]) => {
          const color = SUBJECT_COLOR[sub];
          return (
            <span key={sub} className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${color ? `${color.bg} ${color.border} ${color.text}` : "border-s-stroke2 bg-b-surface2 text-t-secondary"}`}>
              {sub}: {count}
            </span>
          );
        })}
        <span className="rounded-full border border-s-stroke2 bg-b-surface2 px-2 py-0.5 text-xs text-t-secondary">Total: {result.total}</span>
      </div>
      {result.errors.map((e, i) => <div key={i} className="flex items-start gap-1.5 mb-1"><RiErrorWarningLine size={12} className="mt-0.5 shrink-0 text-primary-03" /><p className="text-xs text-primary-03">{e}</p></div>)}
      {result.warnings.map((w, i) => <div key={i} className="flex items-start gap-1.5 mb-1"><RiAlertLine size={12} className="mt-0.5 shrink-0 text-amber-500" /><p className="text-xs text-amber-600 dark:text-amber-400">{w}</p></div>)}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReviewPaperPage() {
  const params = useParams<{ id: string }>();
  const { session, user } = useAuth();

  const [data, setData] = useState<any>(null);
  // Use ID-based selection — avoids index-vs-array mismatch bugs
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [transacting, setTransacting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

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
    // Auto-select first question on initial load
    setActiveId((cur) => cur ?? result.data?.questions?.[0]?.id ?? null);
  }, [session?.access_token, params.id]);

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, [load]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const paper       = data?.paper;
  const questions: any[] = data?.questions ?? [];
  const status      = paper?.workflow_status ?? "draft";
  const examCode    = paper?.exam_code?.code ?? "";
  const examLabel   = EXAM_LABELS[examCode] ?? examCode;
  const subjects    = EXAM_SUBJECTS[examCode] ?? [];
  const canEdit     = ["draft", "changes_requested", "needs_review"].includes(status) && isDepartmentUser;

  // ID-based current question lookup — no index arithmetic
  const question = useMemo(
    () => questions.find((q) => q.id === activeId) ?? questions[0] ?? null,
    [questions, activeId],
  );

  // ── Keyboard nav: ←/→ across questions ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as Element)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      const idx = questions.findIndex((q) => q.id === activeId);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = questions[Math.min(idx + 1, questions.length - 1)];
        if (next) setActiveId(next.id);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = questions[Math.max(idx - 1, 0)];
        if (prev) setActiveId(prev.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [questions, activeId]);

  // ── Workflow ────────────────────────────────────────────────────────────────
  const transition = async (action: string) => {
    setTransacting(true);
    try {
      const r: any = await apiClient.post(`/api/v1/test-department/papers/${params.id}/workflow`, { action }, session!.access_token);
      setData({ ...data, paper: r.data.paper });
      setMessage(
        action === "publish"         ? "Test published." :
        action === "approve"         ? "Paper approved." :
        action === "request_changes" ? "Changes requested." : "Updated.",
      );
      setTimeout(() => setMessage(""), 4000);
    } catch (e: any) { setMessage(e.message); }
    finally { setTransacting(false); }
  };

  const runValidation = async () => {
    setValidating(true); setValidation(null);
    try {
      const r: any = await apiClient.get(`/api/v1/test-department/papers/${params.id}/validate`, session!.access_token);
      setValidation(r.data);
    } catch (e: any) { setMessage(e.message); }
    finally { setValidating(false); }
  };

  // ── Save handlers ───────────────────────────────────────────────────────────
  const save = async (payload: Record<string, unknown>) => {
    if (!question) return;
    await apiClient.patch(`/api/v1/test-department/papers/${params.id}/questions/${question.id}`, payload, session!.access_token);
    await load();
    setMessage("Saved."); setTimeout(() => setMessage(""), 2500);
  };

  const saveMetadata = async (payload: Record<string, unknown>) => {
    if (!question) return;
    await apiClient.patch(`/api/v1/test-department/papers/${params.id}/questions/${question.id}`, payload, session!.access_token);
    await load();
  };

  // ── Sidebar sections ────────────────────────────────────────────────────────
  const sections = useMemo(() => {
    if (!questions.length) return [];
    const seenSubjects = [...new Set(questions.map((q) => q.subject).filter(Boolean))] as string[];
    const canonicalSubs = subjects.length ? subjects.filter((s) => seenSubjects.includes(s)) : seenSubjects;
    const extras = seenSubjects.filter((s) => !subjects.includes(s));
    const ordered = [...canonicalSubs, ...extras];
    if (ordered.length === 0) return [{ subject: "All", qs: questions }];
    return ordered.map((sub) => ({ subject: sub, qs: questions.filter((q) => q.subject === sub) }));
  }, [questions, subjects]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const complete = questions.filter((q) => (q.correct_answer?.length ?? 0) > 0).length;
  const pct      = questions.length ? Math.round((complete / questions.length) * 100) : 0;

  if (!data) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-t-secondary">Loading…</main>;
  }

  return (
    <>
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <Navbar title={paper.title} breadcrumbs="TEST DEPARTMENT › PAPER REVIEW" subtitle={`${questions.length} questions`}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {examLabel && (
            <span className="rounded-full border border-s-stroke2 bg-b-surface2 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-t-secondary">{examLabel}</span>
          )}
          {isDepartmentUser && (
            <button disabled={validating} onClick={runValidation}
              className="h-9 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary disabled:opacity-60">
              {validating ? "Validating…" : "Validate paper"}
            </button>
          )}
          {["draft", "changes_requested"].includes(status) && isDepartmentUser && (
            <button disabled={transacting} onClick={() => transition("submit")}
              className="h-9 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary disabled:opacity-60">
              Submit for review
            </button>
          )}
          {isHead && status === "needs_review" && (<>
            <button disabled={transacting} onClick={() => transition("request_changes")}
              className="h-9 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary disabled:opacity-60">
              Request changes
            </button>
            <button disabled={transacting} onClick={() => transition("approve")}
              className="h-9 rounded-[10px] bg-[#151515] px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black">
              Mark ready
            </button>
          </>)}
          {isHead && status === "approved" && (
            <button disabled={transacting} onClick={() => transition("publish")}
              className="h-9 rounded-[10px] bg-[#151515] px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black">
              Publish test
            </button>
          )}
        </div>
      </Navbar>

      {/* ── 2-column layout ─────────────────────────────────────────────────── */}
      <main className="mx-auto grid w-full max-w-[1600px] gap-4 px-4 pb-12 pt-4 md:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">

        {/* ── LEFT: compact question navigator ─────────────────────────────── */}
        <aside className="flex flex-col gap-3">
          {/* Completion bar */}
          <div className="rounded-[12px] border border-s-stroke2 bg-b-surface1 px-4 py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-t-secondary">Completion</p>
              <p className="text-[11px] font-bold text-t-primary">{complete}/{questions.length}</p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-b-surface2">
              <div className="h-full rounded-full bg-primary-01 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Question navigator */}
          <div className="rounded-[12px] border border-s-stroke2 bg-b-surface1 overflow-hidden">
            <div className="sticky top-0 border-b border-s-stroke2 bg-b-surface1 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-t-secondary">Questions</p>
            </div>
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-3 space-y-3">
              {sections.map(({ subject, qs }) => {
                const color = SUBJECT_COLOR[subject];
                const secComplete = qs.filter((q) => (q.correct_answer?.length ?? 0) > 0).length;
                const globalStart = questions.indexOf(qs[0]) + 1;
                return (
                  <div key={subject}>
                    {/* Section label */}
                    <div className="mb-1.5 flex items-center gap-1.5">
                      {color && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${color.dot}`} />}
                      <span className={`text-[11px] font-bold ${color?.text ?? "text-t-secondary"}`}>{subject}</span>
                      <span className="ml-auto text-[10px] text-t-tertiary">{secComplete}/{qs.length}</span>
                    </div>
                    {/* 8-column grid of question cells */}
                    <div className="grid grid-cols-8 gap-1">
                      {qs.map((q) => {
                        const isActive  = q.id === activeId;
                        const hasAnswer = (q.correct_answer?.length ?? 0) > 0;
                        const globalIdx = questions.indexOf(q);
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setActiveId(q.id)}
                            title={`Q${globalIdx + 1} · ${q.subject}`}
                            className={[
                              "flex items-center justify-center rounded-[6px] border py-1 text-[11px] font-semibold transition-colors",
                              isActive
                                ? "border-primary-01 bg-primary-01 text-white"
                                : hasAnswer
                                  ? color
                                    ? `${color.bg} ${color.border} ${color.text}`
                                    : "border-green-500/30 bg-green-500/10 text-green-600"
                                  : "border-s-stroke2 bg-b-surface2/50 text-t-secondary hover:border-primary-01/30 hover:text-t-primary",
                            ].join(" ")}
                          >
                            {globalIdx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="px-1 text-[10px] text-t-tertiary">
            <kbd className="rounded border border-s-stroke2 bg-b-surface1 px-1 font-mono text-[9px]">←</kbd>{" "}
            <kbd className="rounded border border-s-stroke2 bg-b-surface1 px-1 font-mono text-[9px]">→</kbd>{" "}
            to navigate
          </p>
        </aside>

        {/* ── RIGHT: editor ────────────────────────────────────────────────── */}
        <section className="min-w-0">
          {validation && <ValidationPanel result={validation} onClose={() => setValidation(null)} />}
          {message && (
            <div className="mb-3 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-2.5 text-sm text-t-secondary">{message}</div>
          )}
          {question ? (
            <div className="card overflow-hidden p-0">
              <QuestionReviewEditor
                key={question.id}
                question={question}
                canEdit={canEdit}
                onSave={save}
                onSaveMetadata={saveMetadata}
                examCode={examCode}
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
