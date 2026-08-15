"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { PaperReviewWorkspace } from "@/components/questions/PaperReviewWorkspace";
import type { MarkingScheme } from "@/components/questions/MarkingSchemeEditor";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api.client";
import { apiQueryKey, useApiQuery } from "@/lib/hooks/useApiQuery";
import { EXAM_LABELS, detectExamCode } from "@/lib/exam-config";
import { useBatches } from "@/lib/hooks/useBatches";
import { Modal } from "@/components/shared/Modal";

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

// Matches the backend's own transitions["archive"] source list exactly —
// kept here rather than derived so the button and the 409 it would otherwise
// hit stay in sync without a round trip.
const ARCHIVABLE_STATUSES = ["draft", "changes_requested", "approved", "scheduled", "published"];

/**
 * Assigning a paper to batches used to happen exactly once, folded into
 * upload/creation. This is the standalone version — pick any of the
 * institute's batches for this paper's exam and a start time, submit, done.
 * Reusable any time: assign to Batch A today, come back next term and assign
 * the same paper to Batch B, or reassign A again for a resit.
 */
function AssignModal({
  open, onClose, examCode, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  examCode: string;
  onSubmit: (batchIds: string[], scheduledAt: string) => Promise<void>;
}) {
  const { batches, loading: batchesLoading } = useBatches();
  const [selected, setSelected] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Wrong-exam assignment is exactly the mix-up flagged as a serious concern
  // earlier — a JEE paper has no business being offered to a NEET batch, so
  // this list only ever shows batches sitting the same exam as the paper.
  const eligibleBatches = batches.filter((b) => b.exam === examCode);

  useEffect(() => {
    if (!open) { setSelected([]); setScheduledAt(""); setError(""); }
  }, [open]);

  const toggle = (id: string) =>
    setSelected((current) => current.includes(id) ? current.filter((b) => b !== id) : [...current, id]);

  const submit = async () => {
    if (!selected.length) { setError("Select at least one batch."); return; }
    if (!scheduledAt) { setError("Choose when the test should open."); return; }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(selected, new Date(scheduledAt).toISOString());
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Could not assign this test.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign to batches" subtitle="Reusable — assign this same paper to more batches any time.">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-t-secondary">Batches</label>
          {batchesLoading ? (
            <p className="text-sm text-t-secondary">Loading batches…</p>
          ) : eligibleBatches.length === 0 ? (
            <p className="text-sm text-t-secondary">
              No {EXAM_LABELS[examCode] ?? examCode} batches yet. Create one first.
            </p>
          ) : (
            <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
              {eligibleBatches.map((batch) => (
                <label
                  key={batch.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-sm font-medium transition-colors ${
                    selected.includes(batch.id) ? "border-primary-01 bg-primary-01/5 text-t-primary" : "border-s-stroke2 text-t-secondary hover:border-t-secondary/40"
                  }`}
                >
                  <input type="checkbox" checked={selected.includes(batch.id)} onChange={() => toggle(batch.id)} className="h-4 w-4 accent-primary-01" />
                  {batch.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-t-secondary">Test opens at</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3 text-sm font-medium text-t-primary outline-none focus:border-primary-01"
          />
        </div>

        {error && <p className="text-sm text-primary-03">{error}</p>}

        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="h-11 rounded-[10px] bg-[#151515] text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {submitting ? "Assigning…" : "Assign"}
        </button>
      </div>
    </Modal>
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
  const [assignOpen, setAssignOpen] = useState(false);

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
        action === "request_changes" ? "Changes requested." :
        action === "archive"         ? "Test archived. Find it under the Archived tab to restore it later." :
        action === "restore"         ? "Test restored as a draft. Review and re-publish when ready." : "Updated.",
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

  const assignToBatches = async (batchIds: string[], scheduledAt: string) => {
    await apiClient.post(
      `/api/v1/test-department/papers/${params.id}/assign`,
      { batch_ids: batchIds, scheduled_at: scheduledAt },
      session!.access_token,
    );
    setMessage(`Assigned to ${batchIds.length} batch${batchIds.length === 1 ? "" : "es"}.`);
    setTimeout(() => setMessage(""), 4000);
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
              {isDepartmentUser && status !== "archived" && (
                <button
                  type="button" onClick={() => setAssignOpen(true)}
                  className="h-11 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary disabled:opacity-60"
                >
                  Assign to batches
                </button>
              )}
              {/* Only meaningful once it is live — a draft has no submissions
                  to aggregate. */}
              {isDepartmentUser && status === "published" && (
                <Link
                  href={`/institute/tests/${params.id}/results`}
                  className="flex h-11 items-center rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary"
                >
                  Batch results
                </Link>
              )}
              {isHead && status === "archived" && (
                <button
                  type="button" disabled={transacting} onClick={() => transition("restore")}
                  className="h-11 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary disabled:opacity-60"
                >
                  Restore
                </button>
              )}
              {isHead && ARCHIVABLE_STATUSES.includes(status) && (
                <button
                  type="button" disabled={transacting}
                  onClick={() => {
                    if (confirm("Archive this test? It will be hidden from the active list and unpublished if it's live. You can restore it later from the Archived tab.")) {
                      transition("archive");
                    }
                  }}
                  className="h-11 rounded-[10px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] px-4 text-sm font-semibold text-[#EF4444] disabled:opacity-60"
                >
                  Archive
                </button>
              )}
            </div>
          }
        />
      </main>

      <AssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        examCode={examCode}
        onSubmit={assignToBatches}
      />
    </>
  );
}
