"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { RiArrowLeftLine, RiCheckLine, RiLoader4Line } from "@remixicon/react";
import { apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";

type Option = { id: string; text: string };
type Question = { id: string; question_text: string; options: Option[] | null; question_type: string; subject: string; chapter: string };

export default function RevisionPracticePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState("Revision practice");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session?.access_token || !id) return;
    apiClient.get<{ success: boolean; data: { task: { title: string }; questions: Question[] } }>(`/api/v1/dashboard/student/revision-queue/${id}/questions`, session.access_token)
      .then((response) => { if (response.success) { setTitle(response.data.task.title); setQuestions(response.data.questions); } })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, session?.access_token]);

  const submit = async () => {
    if (!session?.access_token) return;
    setSubmitting(true);
    try {
      const response = await apiClient.post<{ success: boolean; data: any }>(`/api/v1/dashboard/student/revision-queue/${id}/submit`, { answers }, session.access_token);
      if (response.success) setResult(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <><Navbar title="Revision Practice" /><div className="flex min-h-80 items-center justify-center text-t-secondary"><RiLoader4Line className="animate-spin" size={28} /></div></>;
  if (!questions.length) return <><Navbar title="Revision Practice" /><div className="mx-auto max-w-xl px-6 py-10 text-center"><p className="font-semibold text-t-primary">No suitable questions are available for this topic yet.</p><button onClick={() => router.push("/student/mistakes")} className="mt-3 text-sm font-bold text-primary-01">Back to Mistake Diary</button></div></>;

  const feedback = new Map((result?.results ?? []).map((item: any) => [item.question_id, item]));
  return (
    <>
      <Navbar title={result ? "Revision complete" : title} subtitle={result ? `You got ${result.correctCount}/${result.totalQuestions} correct.` : "Solve without looking at notes. Review the explanation after submitting."} />
      <main className="mx-auto w-full max-w-4xl space-y-3 px-4 pb-12 pt-4 md:px-6">
        <button onClick={() => router.push("/student/dashboard")} className="flex items-center gap-2 text-sm font-semibold text-t-secondary hover:text-t-primary"><RiArrowLeftLine size={16} /> Back to dashboard</button>
        {questions.map((question, index) => {
          const item = feedback.get(question.id) as any;
          return <section key={question.id} className="card p-5 md:p-6"><div className="mb-4 flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-wide text-t-secondary">Question {index + 1}</span>{item && <span className={item.is_correct ? "text-xs font-bold text-primary-02" : "text-xs font-bold text-primary-03"}>{item.is_correct ? "Correct" : "Review this"}</span>}</div><div className="text-[16px] leading-7 text-t-primary"><MarkdownRenderer>{question.question_text}</MarkdownRenderer></div>
            {question.options?.length ? <div className="mt-3 space-y-2">{question.options.map((option) => <button key={option.id} disabled={Boolean(result)} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} className={`w-full rounded-[10px] border px-4 py-3 text-left text-sm ${answers[question.id] === option.id ? "border-primary-01 bg-primary-01/5" : "border-s-stroke2 bg-b-surface2"}`}><span className="mr-3 inline-flex size-6 items-center justify-center rounded-full border border-s-stroke2 text-xs font-bold">{option.id}</span><MarkdownRenderer>{option.text}</MarkdownRenderer></button>)}</div> : <input disabled={Boolean(result)} value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="mt-3 h-11 w-full rounded-[10px] border border-s-stroke2 bg-b-surface2 px-3 text-sm" placeholder="Enter your answer" />}
            {item && !item.is_correct && <div className="mt-4 rounded-[10px] border border-primary-03/20 bg-primary-03/5 p-3 text-sm text-t-secondary"><p><strong className="text-t-primary">Correct answer:</strong> {item.correct_answer.join(", ")}</p>{item.explanation && <div className="mt-2"><MarkdownRenderer>{item.explanation}</MarkdownRenderer></div>}</div>}
          </section>;
        })}
        {result ? <button onClick={() => router.push("/student/dashboard")} className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#161616] text-sm font-bold text-white"><RiCheckLine size={17} /> Finish revision</button> : <button onClick={submit} disabled={submitting} className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#161616] text-sm font-bold text-white disabled:opacity-60">{submitting ? <RiLoader4Line className="animate-spin" size={17} /> : null} Submit practice</button>}
      </main>
    </>
  );
}
