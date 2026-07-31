"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { QuestionReviewEditor } from "@/components/questions/QuestionReviewEditor";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api.client";
import { apiQueryKey, useApiQuery } from "@/lib/hooks/useApiQuery";
import { EXAM_LABELS, EXAM_SUBJECTS, SUBJECT_COLOR, detectExamCode } from "@/lib/exam-config";
import { RiShieldCheckLine, RiErrorWarningLine, RiAlertLine } from "@remixicon/react";

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
const PANEL_H = "calc(100vh - 210px)"; // both panels same height

export default function ReviewPaperPage() {
  const params = useParams<{ id: string }>();
  const { session, user } = useAuth();

  const queryClient = useQueryClient();
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null); // subject tab
  const [message, setMessage]     = useState("");
  const [transacting, setTransacting]   = useState(false);
  const [validating, setValidating]     = useState(false);
  const [validation, setValidation]     = useState<ValidationResult | null>(null);

  const isHead          = user?.role === "test_department_head";
  const isMember        = user?.role === "test_department_member";
  const isDepartmentUser = isHead || isMember;

  // ── Load ──────────────────────────────────────────────────────────────────
  const PAPER_PATH = params.id ? `/api/v1/test-department/papers/${params.id}` : null;
  const { data, error: loadError } = useApiQuery<any>(PAPER_PATH);

  useEffect(() => {
    if (loadError) setMessage(loadError.message);
  }, [loadError]);

  // First question and its subject select themselves once, then the reviewer
  // owns the selection — the `cur ??` guards keep a revalidation from yanking
  // them back to the top of the paper mid-review.
  const firstQuestion = data?.questions?.[0];
  useEffect(() => {
    if (!firstQuestion) return;
    setActiveId((cur) => cur ?? firstQuestion.id ?? null);
    setActiveTab((cur) => cur ?? firstQuestion.subject ?? null);
  }, [firstQuestion]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const paper        = data?.paper;
  const questions: any[] = data?.questions ?? [];
  const status       = paper?.workflow_status ?? "draft";

  // Detect exam code from actual subject names in the paper, not the DB exam_id.
  // Uses the shared detectExamCode (same logic as the superadmin global page and
  // the backend validatePaper/loadPaperQuestions).
  const examCode  = useMemo(
    () => detectExamCode(questions, paper?.exam_code?.code ?? ""),
    [questions, paper?.exam_code?.code],
  );
  const examLabel = EXAM_LABELS[examCode] ?? examCode;
  const subjects  = EXAM_SUBJECTS[examCode] ?? [];
  const canEdit   = ["draft", "changes_requested", "needs_review"].includes(status) && isDepartmentUser;

  const question = useMemo(
    () => questions.find((q) => q.id === activeId) ?? questions[0] ?? null,
    [questions, activeId],
  );

  // ── Subject sections ──────────────────────────────────────────────────────
  const sections = useMemo(() => {
    if (!questions.length) return [];
    const seenSubs = [...new Set(questions.map((q) => q.subject).filter(Boolean))] as string[];
    const canonical = subjects.length ? subjects.filter((s) => seenSubs.includes(s)) : seenSubs;
    const extras    = seenSubs.filter((s) => !subjects.includes(s));
    const ordered   = [...canonical, ...extras];
    if (!ordered.length) return [{ subject: "All", qs: questions }];
    return ordered.map((sub) => ({ subject: sub, qs: questions.filter((q) => q.subject === sub) }));
  }, [questions, subjects]);

  // Auto-select first tab only if none set yet (preserves user choice)
  useEffect(() => {
    if (sections.length && !activeTab) setActiveTab(sections[0].subject);
  }, [sections, activeTab]);

  // Keep the active subject tab in sync when the user selects a DIFFERENT question.
  // We track the previous activeId so the tab only follows question changes,
  // NOT user tab-clicks (which would otherwise be immediately overridden).
  const prevActiveId = useRef<string | null>(null);
  useEffect(() => {
    if (activeId !== prevActiveId.current) {
      prevActiveId.current = activeId;
      if (question?.subject && sections.some((s) => s.subject === question.subject)) {
        setActiveTab(question.subject);
      }
    }
  }, [activeId, question, sections]);

  const activeSection = sections.find((s) => s.subject === activeTab) ?? sections[0];

  // ── Keyboard nav ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as Element)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      const idx = questions.findIndex((q) => q.id === activeId);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = questions[Math.min(idx + 1, questions.length - 1)];
        if (next) { setActiveId(next.id); setActiveTab(next.subject ?? activeTab); }
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = questions[Math.max(idx - 1, 0)];
        if (prev) { setActiveId(prev.id); setActiveTab(prev.subject ?? activeTab); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [questions, activeId, activeTab]);

  // ── Workflow ──────────────────────────────────────────────────────────────
  const transition = async (action: string) => {
    setTransacting(true);
    try {
      const r: any = await apiClient.post(`/api/v1/test-department/papers/${params.id}/workflow`, { action }, session!.access_token);
      // Workflow only moves the paper's status; the questions are untouched, so
      // the cached copy is patched rather than the whole paper refetched.
      queryClient.setQueryData<any>(apiQueryKey(PAPER_PATH as string), (prev: any) =>
        prev ? { ...prev, paper: r.data.paper } : prev,
      );
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

  // ── Save (optimistic local update — no full reload) ───────────────────────
  const save = async (payload: Record<string, unknown>) => {
    if (!question) return;
    const r: any = await apiClient.patch(
      `/api/v1/test-department/papers/${params.id}/questions/${question.id}`,
      payload,
      session!.access_token,
    );
    const saved = r.data?.question ?? payload;
    // Written straight into the cache rather than refetched: the reviewer is
    // editing one field at a time and a full reload between keystrokes would
    // be both slow and disruptive.
    queryClient.setQueryData<any>(apiQueryKey(PAPER_PATH as string), (prev: any) =>
      prev
        ? { ...prev, questions: prev.questions.map((q: any) => q.id === question.id ? { ...q, ...saved } : q) }
        : prev,
    );
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const complete = questions.filter((q) => (q.correct_answer?.length ?? 0) > 0).length;
  const pct      = questions.length ? Math.round((complete / questions.length) * 100) : 0;

  if (!data) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-t-secondary">Loading…</main>;
  }

  return (
    <>
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
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

      {/* ── 2-column layout ─────────────────────────────────────────────── */}
      <main className="mx-auto grid w-full max-w-[1600px] gap-4 px-4 pt-4 md:px-6 lg:grid-cols-[240px_minmax(0,1fr)]" style={{ height: PANEL_H }}>

        {/* ── LEFT sidebar ──────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-3 overflow-hidden" style={{ height: PANEL_H }}>
          {/* Completion */}
          <div className="shrink-0 rounded-[12px] border border-s-stroke2 bg-b-surface1 px-4 py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-t-secondary">Completion</p>
              <p className="text-[11px] font-bold text-t-primary">{complete}/{questions.length}</p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-b-surface2">
              <div className="h-full rounded-full bg-primary-01 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Question navigator with subject tabs */}
          <div className="flex-1 min-h-0 rounded-[12px] border border-s-stroke2 bg-b-surface1 overflow-hidden flex flex-col">
            {/* Subject tab strip */}
            <div className="shrink-0 flex border-b border-s-stroke2">
              {sections.map(({ subject, qs }) => {
                const color = SUBJECT_COLOR[subject];
                const done  = qs.filter((q) => (q.correct_answer?.length ?? 0) > 0).length;
                const isTab = activeTab === subject;
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => setActiveTab(subject)}
                    className={[
                      "flex-1 flex flex-col items-center py-2 px-1 text-[11px] font-bold border-b-2 transition-colors",
                      isTab
                        ? `border-current ${color?.text ?? "text-primary-01"}`
                        : "border-transparent text-t-tertiary hover:text-t-secondary",
                    ].join(" ")}
                  >
                    <span className="truncate">{subject.slice(0, 3).toUpperCase()}</span>
                    <span className={`text-[9px] font-normal ${isTab ? "opacity-70" : "opacity-50"}`}>{done}/{qs.length}</span>
                  </button>
                );
              })}
            </div>

            {/* Question cells — only active subject */}
            <div className="flex-1 overflow-y-auto p-3">
              {activeSection && (
                <div className="grid grid-cols-5 gap-1.5">
                  {activeSection.qs.map((q: any) => {
                    const color     = SUBJECT_COLOR[q.subject];
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
                          "flex items-center justify-center rounded-[8px] border py-2 text-[12px] font-semibold transition-colors",
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
              )}
            </div>
          </div>
        </aside>

        {/* ── RIGHT: editor ─────────────────────────────────────────────── */}
        <section className="min-w-0 flex flex-col" style={{ height: PANEL_H }}>
          {validation && <ValidationPanel result={validation} onClose={() => setValidation(null)} />}
          {message && (
            <div className="mb-3 shrink-0 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-2.5 text-sm text-t-secondary">{message}</div>
          )}
          {question ? (
            <div className="card flex-1 min-h-0 overflow-hidden p-0 rounded-[12px]">
              <QuestionReviewEditor
                key={question.id}
                question={question}
                canEdit={canEdit}
                onSave={save}
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
