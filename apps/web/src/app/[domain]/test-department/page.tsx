"use client";

import Link from "next/link";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { useQueryClient } from "@tanstack/react-query";
import {
  RiQuestionLine,
  RiTimeLine,
  RiFileTextLine,
  RiLoader4Line,
  RiArchiveLine,
  RiInboxUnarchiveLine,
} from "@remixicon/react";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft:             { label: "Draft",              bg: "bg-b-surface2",           text: "text-t-secondary" },
  needs_review:      { label: "Ready for review",   bg: "bg-amber-50 dark:bg-amber-900/30",   text: "text-amber-600 dark:text-amber-400" },
  changes_requested: { label: "Changes requested",  bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400" },
  approved:          { label: "Ready to publish",   bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  scheduled:         { label: "Scheduled",          bg: "bg-blue-50 dark:bg-blue-900/30",     text: "text-blue-600 dark:text-blue-400" },
  published:         { label: "Published",          bg: "bg-blue-50 dark:bg-blue-900/30",     text: "text-blue-600 dark:text-blue-400" },
  archived:          { label: "Archived",           bg: "bg-b-surface2",           text: "text-t-tertiary" },
};

const ACTIVE_PATH = "/api/v1/test-department/papers";
const ARCHIVED_PATH = "/api/v1/test-department/papers?status=archived";

function PaperCard({
  paper, canManage, archived, busy, onArchive, onRestore,
}: {
  paper: any;
  canManage: boolean;
  archived: boolean;
  busy: boolean;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const status = STATUS_CONFIG[paper.workflow_status] ?? STATUS_CONFIG.draft;

  return (
    <div className="group relative flex flex-col justify-between bg-b-surface2 p-5 rounded-[20px] border border-s-stroke2 hover:border-t-secondary/30 transition-all duration-300 overflow-hidden">
      {/* Full-card link, sitting under the content and the quick-action button
          so the whole card stays clickable without nesting a button inside
          an anchor. */}
      <Link href={`/test-department/${paper.id}`} className="absolute inset-0 z-0" aria-label={paper.title} />

      {/* Hover gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-violet-500/[0.03] to-blue-500/[0.03] rounded-[20px]" />

      {canManage && (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (archived) onRestore(paper.id);
            else onArchive(paper.id);
          }}
          title={archived ? "Restore to draft" : "Archive"}
          className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-[8px] bg-b-surface1 border border-s-stroke2 text-t-secondary hover:text-t-primary hover:border-t-secondary/50 transition-colors disabled:opacity-40"
        >
          {archived ? <RiInboxUnarchiveLine size={14} /> : <RiArchiveLine size={14} />}
        </button>
      )}

      <div className="relative z-10 pointer-events-none">
        {/* Status badge */}
        <div className="flex items-center gap-2 mb-3 flex-wrap pr-8">
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

      <div className="relative z-10 mt-3 pt-4 border-t border-s-stroke2 flex justify-end pointer-events-none">
        <span className="flex items-center gap-1.5 h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-b-surface1 border border-s-stroke2 text-t-secondary group-hover:border-t-secondary/50 group-hover:text-t-primary transition-all">
          <RiFileTextLine size={14} />
          Open
        </span>
      </div>
    </div>
  );
}

export default function TestDepartmentPage() {
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  const canOperate = user?.role === "test_department_head" || user?.role === "test_department_member";
  // Archiving and restoring are Head/Institute Admin actions server-side too
  // (transitionReviewPaper) — a Test Editor can see the Archived tab but
  // shouldn't get a quick-action it would just 403 on.
  const canManage = user?.role === "test_department_head" || user?.role === "institute_admin";
  const roleLabel = user?.role === "test_department_head" ? "Department Head" : "Test Editor";

  const [tab, setTab] = useState<"active" | "archived">("active");
  const [busyId, setBusyId] = useState<string | null>(null);

  const listPath = tab === "archived" ? ARCHIVED_PATH : ACTIVE_PATH;
  const { data: paperData, isPending: loading } = useApiQuery<{ papers: any[] }>(listPath);
  const papers = paperData?.papers ?? [];

  const refreshLists = () => {
    queryClient.invalidateQueries({ queryKey: [ACTIVE_PATH] });
    queryClient.invalidateQueries({ queryKey: [ARCHIVED_PATH] });
  };

  const runTransition = async (id: string, action: "archive" | "restore") => {
    if (!session?.access_token) return;
    setBusyId(id);
    try {
      await apiClient.post(`/api/v1/test-department/papers/${id}/workflow`, { action }, session.access_token);
      refreshLists();
    } catch (err: any) {
      alert(err.message ?? `Could not ${action} this test.`);
    } finally {
      setBusyId(null);
    }
  };

  const archivePaper = (id: string) => {
    if (!confirm("Archive this test? It will be hidden from the active list and unpublished if it's live. You can restore it later from the Archived tab.")) return;
    runTransition(id, "archive");
  };

  const restorePaper = (id: string) => runTransition(id, "restore");

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
        <div className="mb-5 flex gap-2 border-b border-s-stroke2">
          {(["active", "archived"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-1 pb-3 -mb-px border-b-2 text-sm font-semibold transition-colors ${
                tab === t
                  ? "border-t-primary text-t-primary"
                  : "border-transparent text-t-secondary hover:text-t-primary"
              }`}
            >
              {t === "active" ? "Active" : "Archived"}
            </button>
          ))}
        </div>

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
              <h3 className="font-semibold text-[15px] text-t-primary mb-1">
                {tab === "archived" ? "No archived tests" : "No test drafts yet"}
              </h3>
              <p className="text-[13px] text-t-secondary">
                {tab === "archived"
                  ? "Tests you archive from the Active tab will show up here."
                  : "Upload a master PDF to create a reviewable draft."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {papers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                canManage={canManage}
                archived={tab === "archived"}
                busy={busyId === paper.id}
                onArchive={archivePaper}
                onRestore={restorePaper}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
