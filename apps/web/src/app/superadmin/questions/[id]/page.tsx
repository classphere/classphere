"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { QuestionReviewEditor } from "@/components/questions/QuestionReviewEditor";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { detectExamCode } from "@/lib/exam-config";

export default function GlobalPaperReviewPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!session?.access_token || !params.id) return;
    const result: any = await apiClient.get(`/api/v1/tests/${params.id}`, session.access_token);
    setData(result.data);
  };

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, [session?.access_token, params.id]);

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
                {itemIndex + 1}
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
          {question && (
            <QuestionReviewEditor
              question={{ ...question, position: index + 1 }}
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
