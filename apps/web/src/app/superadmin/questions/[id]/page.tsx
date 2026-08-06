"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { QuestionReviewEditor } from "@/components/questions/QuestionReviewEditor";
import { PaperComposition } from "@/components/superadmin/PaperComposition";
import { MarkingSchemeEditor, type MarkingScheme } from "@/components/superadmin/MarkingSchemeEditor";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api.client";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { detectExamCode } from "@/lib/exam-config";

export default function GlobalPaperReviewPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState("");

  const PAPER_PATH = params.id ? `/api/v1/tests/${params.id}` : null;
  const { data, error: loadError } = useApiQuery<any>(PAPER_PATH);
  // Edits here rewrite the paper, so the cached copy is dropped after a save.
  const load = () => queryClient.invalidateQueries({ queryKey: [PAPER_PATH] });

  useEffect(() => {
    if (loadError) setMessage(loadError.message);
  }, [loadError]);

  const questions: any[] = data?.questions ?? [];
  const question = useMemo(() => questions[index], [data, index]);

  // Detect exam code from the subjects actually present in the paper (NEET vs
  // JEE), falling back to the code the backend sends if any. The old code used a
  // hardcoded `|| "JEE_MAIN"` fallback which (a) used the wrong casing — the
  // config keys are hyphenated lowercase ("jee-main") — and (b) would show
  // Mathematics instead of Biology for NEET papers. detectExamCode mirrors the
  // backend's subject-based detection so the subject dropdown is always correct.
  const examCode = useMemo(
    () => detectExamCode(questions, data?.paper?.exam_code ?? ""),
    [questions, data?.paper?.exam_code]
  );

  // A paper is missing its marks when some question type it contains has no
  // entry and there is no paper-wide default. That is the state a JEE Advanced
  // paper lands in when its instructions page was absent or unreadable — the
  // upload no longer rejects it, so the numbers get entered here instead,
  // where the questions they apply to are on screen.
  const scheme: MarkingScheme = (data?.paper?.marking_scheme as MarkingScheme) ?? {};
  const unpricedTypes = useMemo(() => {
    if (scheme.default) return [];
    const present = new Set(questions.map((q) => String(q?.question_type ?? "").trim()).filter(Boolean));
    return [...present].filter((type) => !scheme[type]);
  }, [questions, data?.paper?.marking_scheme]);

  const [draftScheme, setDraftScheme] = useState<MarkingScheme | null>(null);
  const [savingScheme, setSavingScheme] = useState(false);
  const editingScheme = draftScheme ?? scheme;

  const saveScheme = async () => {
    setSavingScheme(true);
    try {
      await apiClient.patch(
        `/api/v1/tests/${params.id}/global`,
        { marking_scheme: editingScheme },
        session!.access_token,
      );
      setDraftScheme(null);
      await load();
      setMessage("Marking scheme saved. The totals above now reflect it.");
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setSavingScheme(false);
    }
  };

  const save = async (payload: Record<string, unknown>) => {
    await apiClient.patch(`/api/v1/questions/${question.id}`, payload, session!.access_token);
    await load();
    setMessage("Question updated. This change is recorded in the global review draft.");
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
        subtitle={`${data.questions.length} questions · ${data.paper.test_type}`}
      >
        <button
          onClick={publish}
          className="h-11 rounded-[10px] bg-[#151515] px-5 text-sm font-semibold text-white dark:bg-white dark:text-black"
        >
          Publish global paper
        </button>
      </Navbar>

      <main className="mx-auto grid w-full max-w-[1560px] gap-3 px-4 pb-12 pt-5 md:px-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="card h-fit p-3">
          <p className="px-2 pb-3 text-xs font-bold uppercase tracking-wider text-t-secondary">Questions</p>
          <div className="grid grid-cols-6 gap-2 lg:grid-cols-4">
            {data.questions.map((item: any, itemIndex: number) => (
              <button
                key={item.id}
                onClick={() => setIndex(itemIndex)}
                className={`aspect-square rounded-[9px] border text-sm font-bold ${
                  index === itemIndex
                    ? "border-primary-01 bg-primary-01 text-white"
                    : "border-s-stroke2 bg-b-surface2 text-t-primary"
                }`}
              >
                {item.question_number ?? itemIndex + 1}
              </button>
            ))}
          </div>
        </aside>

        <section>
          {message && (
            <p className="mb-4 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-3 text-sm text-t-secondary">
              {message}
            </p>
          )}
          <PaperComposition
            questions={questions}
            markingScheme={data.paper.marking_scheme}
            statedTotal={data.paper.total_marks}
          />

          {unpricedTypes.length > 0 && (
            <div className="card mb-4 p-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-t-secondary">
                This paper does not say what its questions are worth
              </p>
              <p className="mb-4 text-xs text-t-secondary">
                Its instructions page either was not included or could not be read. Enter the marks
                below — the paper cannot be published until it has them, because there is no safe
                default to score it against.
              </p>
              <MarkingSchemeEditor value={editingScheme} onChange={setDraftScheme} />
              <button
                onClick={saveScheme}
                disabled={savingScheme || draftScheme === null}
                className="mt-4 h-11 rounded-[10px] bg-[#151515] px-5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-black"
              >
                {savingScheme ? "Saving…" : "Save marking scheme"}
              </button>
            </div>
          )}
          {question && (
            <QuestionReviewEditor
              question={{ ...question, position: question.question_number ?? index + 1 }}
              canEdit
              examCode={examCode}
              onSave={save}
            />
          )}
        </section>
      </main>
    </>
  );
}
