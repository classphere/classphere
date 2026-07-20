"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { QuestionReviewEditor } from "@/components/test-department/QuestionReviewEditor";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

export default function ReviewPaperPage() {
  const params = useParams<{ id: string }>(); const router = useRouter(); const { session, user } = useAuth(); const [data, setData] = useState<any>(null); const [active, setActive] = useState(0); const [message, setMessage] = useState("");
  const load = async () => { if (!session?.access_token || !params.id) return; const result: any = await apiClient.get(`/api/v1/test-department/papers/${params.id}`, session.access_token); setData(result.data); };
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [session?.access_token, params.id]);
  const question = useMemo(() => data?.questions?.[active], [data, active]);
  const canEdit = ["draft", "changes_requested", "needs_review"].includes(data?.paper?.workflow_status) && user?.role === "test_department_head";
  const save = async (payload: Record<string, unknown>) => { await apiClient.patch(`/api/v1/test-department/papers/${params.id}/questions/${question.id}`, payload, session!.access_token); await load(); setMessage("Question saved as a draft."); };
  const transition = async (action: string) => { try { const response: any = await apiClient.post(`/api/v1/test-department/papers/${params.id}/workflow`, { action }, session!.access_token); setData({ ...data, paper: response.data.paper }); setMessage(action === "publish" ? "Test published. Students will see it at its scheduled opening time." : "Workflow updated."); } catch (error: any) { setMessage(error.message); } };
  if (!data) return <main className="mx-auto max-w-6xl p-8 text-sm text-t-secondary">Loading review workspace…</main>;
  const status = data.paper.workflow_status; const head = user?.role === "test_department_head";
  return <><Navbar title={data.paper.title} breadcrumbs="TEST DEPARTMENT > PAPER REVIEW" subtitle={`${data.questions.length} questions · ${status.replaceAll("_", " ")}`}><div className="flex flex-wrap gap-2">{["draft", "changes_requested"].includes(status) && <button onClick={() => transition("submit")} className="h-11 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary">Submit for review</button>}{head && status === "needs_review" && <><button onClick={() => transition("request_changes")} className="h-11 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-4 text-sm font-semibold text-t-primary">Request changes</button><button onClick={() => transition("approve")} className="h-11 rounded-[10px] bg-[#151515] px-4 text-sm font-semibold text-white dark:bg-white dark:text-black">Approve paper</button></>}{head && status === "approved" && <button onClick={() => transition("publish")} className="h-11 rounded-[10px] bg-[#151515] px-4 text-sm font-semibold text-white dark:bg-white dark:text-black">Publish test</button>}</div></Navbar><main className="mx-auto grid w-full max-w-[1560px] gap-5 px-4 pb-12 pt-5 md:px-6 lg:grid-cols-[250px_minmax(0,1fr)]"><aside className="card h-fit p-3"><p className="px-2 pb-3 text-xs font-bold uppercase tracking-wider text-t-secondary">Questions</p><div className="grid grid-cols-6 gap-2 lg:grid-cols-4">{data.questions.map((item: any, index: number) => <button key={item.id} onClick={() => setActive(index)} className={`aspect-square rounded-[9px] border text-sm font-bold ${active === index ? "border-primary-01 bg-primary-01 text-white" : "border-s-stroke2 bg-b-surface2 text-t-primary"}`}>{index + 1}</button>)}</div></aside><section>{message && <p className="mb-4 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-3 text-sm text-t-secondary">{message}</p>}{question ? <QuestionReviewEditor question={{ ...question, position: active + 1 }} canEdit={canEdit} onSave={save} /> : <p className="card p-8 text-t-secondary">No questions are attached to this paper.</p>}</section></main></>;
}
