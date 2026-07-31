"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import {
  RiQuestionLine,
  RiTimeLine,
  RiFileTextLine,
  RiLoader4Line,
} from "@remixicon/react";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft:             { label: "Draft",              bg: "bg-b-surface2",           text: "text-t-secondary" },
  needs_review:      { label: "Ready for review",   bg: "bg-amber-50 dark:bg-amber-900/30",   text: "text-amber-600 dark:text-amber-400" },
  changes_requested: { label: "Changes requested",  bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400" },
  approved:          { label: "Ready to publish",   bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  scheduled:         { label: "Scheduled",          bg: "bg-blue-50 dark:bg-blue-900/30",     text: "text-blue-600 dark:text-blue-400" },
  published:         { label: "Published",          bg: "bg-blue-50 dark:bg-blue-900/30",     text: "text-blue-600 dark:text-blue-400" },
};

function PaperCard({ paper }: { paper: any }) {
  const status = STATUS_CONFIG[paper.workflow_status] ?? STATUS_CONFIG.draft;

  return (
    <Link
      href={`/test-department/${paper.id}`}
      className="group relative flex flex-col justify-between bg-b-surface2 p-5 rounded-[20px] border border-s-stroke2 hover:border-t-secondary/30 transition-all duration-300 overflow-hidden"
    >
      {/* Hover gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-violet-500/[0.03] to-blue-500/[0.03] rounded-[20px]" />

      <div className="relative z-10">
        {/* Status badge */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          <span className="inline-flex text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-b-surface2 border border-s-stroke2 text-t-tertiary">
            v{paper.review_version}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-[16px] leading-[1.35] text-t-primary mb-4 tracking-[-0.01em] line-clamp-2">
          {paper.title}
        </h3>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-t-secondary">
          <span className="flex items-center gap-1.5">
            <RiQuestionLine size={13} className="opacity-70" />
            {paper.total_questions} Questions
          </span>
          <span className="flex items-center gap-1.5">
            <RiTimeLine size={13} className="opacity-70" />
            {paper.duration_min} Min
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-3 pt-4 border-t border-s-stroke2 flex justify-end">
        <span className="flex items-center gap-1.5 h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-b-surface1 border border-s-stroke2 text-t-secondary group-hover:border-t-secondary/50 group-hover:text-t-primary transition-all">
          <RiFileTextLine size={14} />
          Open
        </span>
      </div>
    </Link>
  );
}

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
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-b-surface2 border border-s-stroke2 px-3 py-1 text-xs font-semibold text-t-secondary">{roleLabel}</span>
          {canOperate && (
            <Link href="/test-department/create" className="flex h-9 items-center justify-center rounded-[10px] bg-[#151515] px-4 text-sm font-semibold text-white dark:bg-white dark:text-black">
              Upload test PDF
            </Link>
          )}
        </div>
      </Navbar>

      <main className="mx-auto w-full max-w-[1560px] px-4 pb-12 pt-5 md:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <RiLoader4Line size={32} className="animate-spin text-t-secondary" />
          </div>
        ) : papers.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-b-surface2 flex items-center justify-center">
              <RiFileTextLine size={28} className="text-t-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-[15px] text-t-primary mb-1">No test drafts yet</h3>
              <p className="text-[13px] text-t-secondary">Upload a master PDF to create a reviewable draft.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
