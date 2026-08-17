"use client";

import Link from "next/link";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { useQueryClient } from "@tanstack/react-query";
import { PaperCard, type PaperCardBadge } from "@/components/questions/PaperCard";
import {
  RiFileTextLine,
  RiLoader4Line,
  RiArchiveLine,
  RiInboxUnarchiveLine,
} from "@remixicon/react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:             { label: "Draft",              className: "bg-b-surface1 border border-s-stroke2 text-t-secondary" },
  needs_review:      { label: "Ready for review",   className: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
  changes_requested: { label: "Changes requested",  className: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" },
  approved:          { label: "Ready to publish",   className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
  scheduled:         { label: "Scheduled",          className: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  published:         { label: "Published",          className: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  archived:          { label: "Archived",           className: "bg-b-surface1 border border-s-stroke2 text-t-tertiary" },
};

const ACTIVE_PATH = "/api/v1/test-department/papers";
const ARCHIVED_PATH = "/api/v1/test-department/papers?status=archived";

export default function TestDepartmentPage() {
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  // One capability set, matching canOperatePapers on the server. A Test Head
  // does the whole job; an Institute Admin can do all of it too, because a
  // coaching with no Test Department is the common case and its owner is then
  // the only person who will ever build a paper here.
  const canOperate =
    user?.role === "test_department_head" ||
    user?.role === "test_department_member" ||
    user?.role === "institute_admin";

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
          {canOperate && (
            <Link href="/test-department/create" className="flex h-9 items-center justify-center rounded-[10px] bg-[#151515] px-4 text-sm font-semibold text-white dark:bg-white dark:text-black">
              Create Test
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
            {papers.map((paper) => {
              const status = STATUS_CONFIG[paper.workflow_status] ?? STATUS_CONFIG.draft;
              const exam = Array.isArray(paper.exams) ? paper.exams[0] : paper.exams;
              const badges: PaperCardBadge[] = [
                { label: status.label, className: status.className },
                { label: `v${paper.review_version}`, className: "bg-b-surface1 border border-s-stroke2 text-t-tertiary" },
              ];
              const archived = tab === "archived";
              return (
                <PaperCard
                  key={paper.id}
                  href={`/test-department/${paper.id}`}
                  title={paper.title}
                  subtitle={exam?.full_name}
                  badges={badges}
                  totalQuestions={paper.total_questions}
                  durationMin={paper.duration_min}
                  totalMarks={paper.total_marks}
                  ctaLabel="Review"
                  cornerAction={canOperate && (
                    <button
                      type="button"
                      disabled={busyId === paper.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (archived) restorePaper(paper.id);
                        else archivePaper(paper.id);
                      }}
                      title={archived ? "Restore to draft" : "Archive"}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-s-stroke2 bg-b-surface1 text-t-secondary transition-colors hover:border-t-secondary/50 hover:text-t-primary disabled:opacity-40"
                    >
                      {archived ? <RiInboxUnarchiveLine size={14} /> : <RiArchiveLine size={14} />}
                    </button>
                  )}
                />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
