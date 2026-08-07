"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { PaperReviewWorkspace } from "@/components/questions/PaperReviewWorkspace";
import type { MarkingScheme } from "@/components/questions/MarkingSchemeEditor";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api.client";
import { apiQueryKey, useApiQuery } from "@/lib/hooks/useApiQuery";
import { EXAM_LABELS, detectExamCode } from "@/lib/exam-config";

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

/**
 * Reviewing an institute's own extracted paper.
 *
 * The screen is PaperReviewWorkspace, shared with the Superadmin question bank.
 * What belongs to this route is the review workflow — submit, request changes,
 * mark ready, publish — which a global paper does not have.
 *
 * Reached by the Test Department and by the Institute Admin. A large coaching
 * separates those roles; a small one is a single person doing every step, so the
 * screen has to serve both identically.
 */
export default function ReviewPaperPage() {
  const params = useParams<{ id: string }>();
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [transacting, setTransacting] = useState(false);

  // The Institute Admin sits above the Head, so they can do everything the Head
  // can — including publish, which in a coaching with no department is otherwise
  // a step nobody is allowed to take.
  const isInstituteAdmin = user?.role === "institute_admin";
  const isHead = user?.role === "test_department_head" || isInstituteAdmin;
  const isMember = user?.role === "test_department_member";
  const isDepartmentUser = isHead || isMember;

  const PAPER_PATH = params.id ? `/api/v1/test-department/papers/${params.id}` : null;
  const { data, error: loadError } = useApiQuery<any>(PAPER_PATH);

  useEffect(() => {
    if (loadError) setMessage(loadError.message);
  }, [loadError]);

  const paper = data?.paper;
  const questions: any[] = data?.questions ?? [];
  const status = paper?.workflow_status ?? "draft";
  const examCode = useMemo(
    () => detectExamCode(questions, paper?.exam_code?.code ?? ""),
    [questions, paper?.exam_code?.code],
  );
  const canEdit = ["draft", "changes_requested", "needs_review"].includes(status) && isDepartmentUser;

  const patchCache = (updater: (previous: any) => any) =>
    queryClient.setQueryData<any>(apiQueryKey(PAPER_PATH as string), (previous: any) =>
      previous ? updater(previous) : previous);

  // ── Workflow ───────────────────────────────────────────────────────────────
  const transition = async (action: string) => {
    setTransacting(true);
    try {
      const response: any = await apiClient.post(
        `/api/v1/test-department/papers/${params.id}/workflow`, { action }, session!.access_token);
      // Workflow only moves the paper's status; the questions are untouched, so
      // the cached copy is patched rather than the whole paper refetched.
      patchCache((previous) => ({ ...previous, paper: response.data.paper }));
      setMessage(
        action === "publish"         ? "Test published." :
        action === "approve"         ? "Paper approved." :
        action === "request_changes" ? "Changes requested." : "Updated.",
      );
      setTimeout(() => setMessage(""), 4000);
    } catch (error: any) { setMessage(error.message); }
    finally { setTransacting(false); }
  };

  // ── Workspace callbacks ────────────────────────────────────────────────────
  const saveQuestion = async (payload: Record<string, unknown>, question: any) => {
    const response: any = await apiClient.patch(
      `/api/v1/test-department/papers/${params.id}/questions/${question.id}`,
      payload, session!.access_token);
    const saved = response.data?.question ?? payload;
    // Written straight into the cache rather than refetched: the reviewer edits
    // one field at a time and a full reload between keystrokes would be both
    // slow and disruptive.
    patchCache((previous) => ({
      ...previous,
      questions: previous.questions.map((q: any) => q.id === question.id ? { ...q, ...saved } : q),
    }));
  };

  const deleteQuestion = async (question: any) => {
    await apiClient.delete(
      `/api/v1/test-department/papers/${params.id}/questions/${question.id}`, session!.access_token);
    patchCache((previous) => ({
      ...previous,
      questions: previous.questions.filter((q: any) => q.id !== question.id),
    }));
  };

  const saveMarkingScheme = async (scheme: MarkingScheme) => {
    const response: any = await apiClient.patch(
      `/api/v1/test-department/papers/${params.id}`, { marking_scheme: scheme }, session!.access_token);
    patchCache((previous) => ({ ...previous, paper: { ...previous.paper, ...response.data?.paper } }));
  };

  const validate = async () => {
    const response: any = await apiClient.get(
      `/api/v1/test-department/papers/${params.id}/validate`, session!.access_token);
    return response.data;
  };

  if (!data) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-t-secondary">Loading…</main>;
  }

  const complete = questions.filter((q) => (q.correct_answer?.length ?? 0) > 0).length;

  return (
    <>
      <Navbar
        title={paper.title}
        breadcrumbs="TEST DEPARTMENT › PAPER REVIEW"
        subtitle={`${questions.length} questions · ${complete} answered · ${EXAM_LABELS[examCode] ?? examCode}`}
      >
        <StatusBadge status={status} />
      </Navbar>

      <main className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-5 md:px-6">
        {message && (
          <p className="mb-3 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-3 text-sm text-t-secondary">
            {message}
          </p>
        )}

        <PaperReviewWorkspace
          paper={paper}
          questions={questions}
          canEdit={canEdit}
          examCode={examCode}
          onSaveQuestion={saveQuestion}
          onDeleteQuestion={deleteQuestion}
          onSaveMarkingScheme={saveMarkingScheme}
          onValidate={validate}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {["draft", "changes_requested"].includes(status) && isDepartmentUser && (
                <button
                  type="button" disabled={transacting} onClick={() => transition("submit")}
                  className="h-11 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary disabled:opacity-60"
                >
                  Submit for review
                </button>
              )}
              {isHead && status === "needs_review" && (
                <>
                  <button
                    type="button" disabled={transacting} onClick={() => transition("request_changes")}
                    className="h-11 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary disabled:opacity-60"
                  >
                    Request changes
                  </button>
                  <button
                    type="button" disabled={transacting} onClick={() => transition("approve")}
                    className="h-11 rounded-[10px] bg-[#151515] px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
                  >
                    Mark ready
                  </button>
                </>
              )}
              {isHead && status === "approved" && (
                <button
                  type="button" disabled={transacting} onClick={() => transition("publish")}
                  className="h-11 rounded-[10px] bg-[#151515] px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
                >
                  Publish test
                </button>
              )}
            </div>
          }
        />
      </main>
    </>
  );
}
