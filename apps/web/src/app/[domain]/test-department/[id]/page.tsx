"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { QuestionReviewEditor } from "@/components/test-department/QuestionReviewEditor";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { EXAM_LABELS, EXAM_SUBJECTS, SUBJECT_ABBR, SUBJECT_COLOR } from "@/lib/exam-config";

// ── Workflow status badge ─────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  draft:             "bg-b-surface2 text-t-secondary border-s-stroke2",
  needs_review:      "bg-amber-500/10 text-amber-500 border-amber-500/30",
  changes_requested: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  approved:          "bg-green-500/10 text-green-500 border-green-500/30",
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

export default function ReviewPaperPage() {
  const params = useParams<{ id: string }>();
  const { session, user } = useAuth();

  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState(0);
  const [activeSubject, setActiveSubject] = useState<string>("All");
  const [message, setMessage] = useState("");
  const [transacting, setTransacting] = useState(false);

  const isHead   = user?.role === "test_department_head";
  const isMember = user?.role === "test_department_member";
  const isDepartmentUser = isHead || isMember;

  // ── data fetching ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!session?.access_token || !params.id) return;
    const result: any = await apiClient.get(
      `/api/v1/test-department/papers/${params.id}`,
      session.access_token,
    );
    setData(result.data);
  }, [session?.access_token, params.id]);

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, [load]);

  // ── derived state ──────────────────────────────────────────────────────────
  const paper     = data?.paper;
  const questions: any[] = data?.questions ?? [];
  const status    = paper?.workflow_status ?? "draft";
  // exam_code comes back as { code: "jee-main" } from the join
  const examCode  = paper?.exam_code?.code ?? "";
  const examLabel = EXAM_LABELS[examCode] ?? examCode;
  const subjects  = EXAM_SUBJECTS[examCode] ?? [];

  const canEdit = ["draft", "changes_requested", "needs_review"].includes(status) && isDepartmentUser;

  // Subject tabs: "All" + unique subjects present in this paper (in canonical order)
  const presentSubjects = useMemo(() => {
    const inPaper = new Set(questions.map((q) => q.subject).filter(Boolean));
    const ordered = subjects.filter((s) => inPaper.has(s));
    const extra   = [...inPaper].filter((s) => !subjects.includes(s));
    return ["All", ...ordered, ...extra];
  }, [questions, subjects]);

  // Questions visible in the sidebar given the active subject tab
  const filteredQuestions = useMemo(
    () => activeSubject === "All" ? questions : questions.filter((q) => q.subject === activeSubject),
    [questions, activeSubject],
  );

  const question = questions[active];

  // ── keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // don't hijack when typing in an input/textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as Element)?.tagName)) return;
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

  // ── workflow actions ───────────────────────────────────────────────────────
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
        action === "publish"          ? "Test published. Students will see it at its scheduled opening time." :
        action === "approve"          ? "Paper approved and ready to publish." :
        action === "request_changes"  ? "Changes requested. The editor will be notified." :
        "Workflow updated.",
      );
    } catch (e: any) { setMessage(e.message); }
    finally { setTransacting(false); }
  };

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

  // ── loading / empty state ──────────────────────────────────────────────────
  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-t-secondary">
        Loading review workspace…
      </main>
    );
  }

  // ── completeness indicator ─────────────────────────────────────────────────
  const complete  = questions.filter((q) => (q.correct_answer?.length ?? 0) > 0).length;
  const pct       = questions.length ? Math.round((complete / questions.length) * 100) : 0;

  return (
    <>
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
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
          {/* workflow buttons */}
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
      <main className="mx-auto grid w-full max-w-[1600px] gap-5 px-4 pb-12 pt-5 md:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">

        {/* ── LEFT: Question navigator sidebar ──────────────────────────────── */}
        <aside className="flex flex-col gap-3">
          {/* Progress */}
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-t-secondary">Completion</p>
              <p className="text-xs font-bold text-t-primary">{complete} / {questions.length}</p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-b-surface2">
              <div
                className="h-full rounded-full bg-primary-01 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-t-tertiary">{pct}% questions have a correct answer set</p>
          </div>

          {/* Subject tabs */}
          {presentSubjects.length > 2 && (
            <div className="card overflow-hidden p-0">
              <div className="border-b border-s-stroke2 px-3 pt-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-t-secondary">Filter by subject</p>
                <div className="flex flex-wrap gap-1.5 pb-3">
                  {presentSubjects.map((sub) => {
                    const color = SUBJECT_COLOR[sub];
                    const isActive = activeSubject === sub;
                    return (
                      <button
                        key={sub}
                        onClick={() => setActiveSubject(sub)}
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                          isActive
                            ? color
                              ? `${color.bg} ${color.text} ${color.border}`
                              : "bg-primary-01/10 text-primary-01 border-primary-01/30"
                            : "border-s-stroke2 bg-b-surface1 text-t-secondary hover:text-t-primary"
                        }`}
                      >
                        {sub}
                        {sub !== "All" && (
                          <span className="ml-1 opacity-60">
                            {questions.filter((q) => q.subject === sub).length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* question cells */}
              <div className="max-h-[520px] overflow-y-auto p-3">
                <div className="grid grid-cols-5 gap-1.5">
                  {filteredQuestions.map((item) => {
                    const globalIndex = questions.indexOf(item);
                    const isActive   = active === globalIndex;
                    const hasAnswer  = (item.correct_answer?.length ?? 0) > 0;
                    const color      = SUBJECT_COLOR[item.subject ?? ""];
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActive(globalIndex)}
                        title={`Q${globalIndex + 1} · ${item.subject ?? ""} · ${item.question_type?.replaceAll("_", " ")}`}
                        className={`flex flex-col items-center justify-center gap-0.5 rounded-[9px] border p-1.5 text-xs transition-colors ${
                          isActive
                            ? "border-primary-01 bg-primary-01 text-white"
                            : hasAnswer
                              ? color
                                ? `${color.bg} ${color.border} ${color.text}`
                                : "border-green-500/30 bg-green-500/10 text-green-500"
                              : "border-s-stroke2 bg-b-surface2 text-t-primary hover:border-primary-01/50"
                        }`}
                      >
                        <span className="font-bold leading-none">{globalIndex + 1}</span>
                        {item.subject && (
                          <span className={`text-[8px] font-semibold leading-none opacity-70 ${isActive ? "opacity-80" : ""}`}>
                            {SUBJECT_ABBR[item.subject] ?? item.subject?.slice(0, 3).toUpperCase()}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* fallback flat grid when no subjects */}
          {presentSubjects.length <= 2 && (
            <div className="card p-3">
              <p className="px-1 pb-3 text-xs font-bold uppercase tracking-wider text-t-secondary">Questions</p>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((item, idx) => {
                  const hasAnswer = (item.correct_answer?.length ?? 0) > 0;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActive(idx)}
                      className={`aspect-square rounded-[9px] border text-sm font-bold transition-colors ${
                        active === idx
                          ? "border-primary-01 bg-primary-01 text-white"
                          : hasAnswer
                            ? "border-green-500/30 bg-green-500/10 text-green-600"
                            : "border-s-stroke2 bg-b-surface2 text-t-primary hover:border-primary-01/50"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* keyboard hint */}
          <p className="px-1 text-[11px] text-t-tertiary">
            Tip: use <kbd className="rounded border border-s-stroke2 bg-b-surface1 px-1 font-mono text-[10px]">←</kbd>{" "}
            <kbd className="rounded border border-s-stroke2 bg-b-surface1 px-1 font-mono text-[10px]">→</kbd> to navigate questions
          </p>
        </aside>

        {/* ── RIGHT: editor + toast ─────────────────────────────────────────── */}
        <section>
          {message && (
            <p className="mb-4 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-3 text-sm text-t-secondary">
              {message}
            </p>
          )}
          {question ? (
            <QuestionReviewEditor
              key={question.id}
              question={{ ...question, position: active + 1 }}
              canEdit={canEdit}
              onSave={save}
              examCode={examCode}
            />
          ) : (
            <p className="card p-8 text-t-secondary">No questions are attached to this paper.</p>
          )}
        </section>
      </main>
    </>
  );
}
