"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

const statusLabel: Record<string, string> = {
  draft: "Draft", needs_review: "Ready for review", changes_requested: "Changes requested",
  approved: "Ready to publish", scheduled: "Scheduled", published: "Published",
};

export default function TestDepartmentPage() {
  const { session, user } = useAuth();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canOperate = user?.role === "test_department_head" || user?.role === "test_department_member";
  const roleLabel = user?.role === "test_department_head" ? "Department Head" : "Test Editor";

  useEffect(() => {
    if (!session?.access_token) return;
    apiClient.get("/api/v1/test-department/papers", session.access_token)
      .then((res: any) => setPapers(res.data?.papers ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  return (
    <>
      <Navbar title="Test Department" subtitle="Prepare, verify, and release every assessment with confidence.">
        {canOperate && <Link href="/test-department/create" className="flex h-11 items-center justify-center rounded-[10px] bg-[#151515] px-5 text-sm font-semibold text-white dark:bg-white dark:text-black">Upload test PDF</Link>}
      </Navbar>
      <main className="mx-auto w-full max-w-[1560px] px-4 pb-12 pt-5 md:px-6">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-s-stroke2 px-5 py-4">
            <div>
              <h2 className="font-semibold text-t-primary">Review workspace</h2>
              <p className="mt-1 text-sm text-t-secondary">Editors prepare and verify drafts. The Department Head publishes them.</p>
            </div>
            <span className="rounded-full bg-b-surface2 px-3 py-1 text-xs font-semibold text-t-secondary">{roleLabel}</span>
          </div>
          {loading ? <p className="p-8 text-sm text-t-secondary">Loading papers…</p> : papers.length === 0 ? (
            <div className="p-12 text-center"><p className="font-semibold text-t-primary">No test drafts yet.</p><p className="mt-2 text-sm text-t-secondary">Upload a master PDF to create a reviewable draft.</p></div>
          ) : <div className="divide-y divide-s-stroke2">
            {papers.map((paper) => <Link href={`/test-department/${paper.id}`} key={paper.id} className="flex flex-col gap-3 p-5 transition-colors hover:bg-b-surface2/50 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold text-t-primary">{paper.title}</p><p className="mt-1 text-sm text-t-secondary">{paper.total_questions} questions · {paper.duration_min} min · v{paper.review_version}</p></div><span className="w-fit rounded-full border border-s-stroke2 bg-b-surface2 px-3 py-1 text-xs font-bold text-t-secondary">{statusLabel[paper.workflow_status] ?? paper.workflow_status}</span></Link>)}
          </div>}
        </section>
      </main>
    </>
  );
}
