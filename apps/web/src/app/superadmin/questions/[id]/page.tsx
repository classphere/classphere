"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { PaperReviewWorkspace } from "@/components/questions/PaperReviewWorkspace";
import type { MarkingScheme } from "@/components/questions/MarkingSchemeEditor";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api.client";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { detectExamCode } from "@/lib/exam-config";

/**
 * Reviewing a paper in the global question bank.
 *
 * The screen itself is PaperReviewWorkspace, shared with the Test Department and
 * the Institute Admin. Only two things are particular to a superadmin: the
 * heading, and that publishing here publishes globally. Everything else —
 * validation, the marks summary, the marking-scheme editor, question navigation,
 * editing and removal — comes from the shared workspace, so a capability added
 * for one role appears for all of them.
 */
export default function GlobalPaperReviewPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const PAPER_PATH = params.id ? `/api/v1/tests/${params.id}` : null;
  const { data, error: loadError } = useApiQuery<any>(PAPER_PATH);
  const load = () => queryClient.invalidateQueries({ queryKey: [PAPER_PATH] });

  useEffect(() => {
    if (loadError) setMessage(loadError.message);
  }, [loadError]);

  const questions: any[] = data?.questions ?? [];

  // Detected from the subjects actually present, falling back to the stored
  // code — the same rule the backend validator applies.
  const examCode = useMemo(
    () => detectExamCode(questions, data?.paper?.exam_code ?? ""),
    [questions, data?.paper?.exam_code],
  );

  const saveQuestion = async (payload: Record<string, unknown>, question: any) => {
    await apiClient.patch(`/api/v1/questions/${question.id}`, payload, session!.access_token);
    await load();
  };

  const deleteQuestion = async (question: any) => {
    await apiClient.delete(`/api/v1/tests/${params.id}/questions/${question.id}`, session!.access_token);
    await load();
  };

  const saveMarkingScheme = async (scheme: MarkingScheme) => {
    await apiClient.patch(`/api/v1/tests/${params.id}/global`, { marking_scheme: scheme }, session!.access_token);
    await load();
  };

  const validate = async () => {
    const response: any = await apiClient.get(`/api/v1/tests/${params.id}/validate`, session!.access_token);
    return response.data;
  };

  const publish = async () => {
    try {
      await apiClient.post(`/api/v1/tests/${params.id}/publish`, {}, session!.access_token);
      setMessage("Global paper published.");
      await load();
    } catch (error: any) {
      setMessage(error.message);
    }
  };

  if (!data) return <main className="p-8 text-sm text-t-secondary">Loading global review…</main>;

  return (
    <>
      <Navbar
        title={data.paper.title}
        breadcrumbs="SUPER ADMIN > GLOBAL QUESTION BANK"
        subtitle={`${questions.length} questions · ${data.paper.test_type}`}
      />

      <main className="mx-auto w-full max-w-[1560px] px-4 pb-12 pt-5 md:px-6">
        {message && (
          <p className="mb-3 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-3 text-sm text-t-secondary">
            {message}
          </p>
        )}

        <PaperReviewWorkspace
          paper={data.paper}
          questions={questions}
          canEdit
          examCode={examCode}
          onSaveQuestion={saveQuestion}
          onDeleteQuestion={deleteQuestion}
          onSaveMarkingScheme={saveMarkingScheme}
          onValidate={validate}
          actions={
            <button
              type="button"
              onClick={publish}
              className="btn btn-primary h-11 px-5 text-sm"
            >
              Publish global paper
            </button>
          }
        />
      </main>
    </>
  );
}
