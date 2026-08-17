"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { Modal } from "@/components/shared/Modal";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import {
  RiSearchLine,
  RiDeleteBinLine,
  RiEditLine,
  RiLoader4Line,
} from "@remixicon/react";
import { PaperCard, type PaperCardBadge } from "@/components/questions/PaperCard";

const DIFFICULTY_CLASS: Record<string, string> = {
  Hard: "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] text-primary-03",
  Medium: "bg-[rgba(255,159,10,0.08)] border-[rgba(255,159,10,0.2)] text-[#FF9F0A]",
  Easy: "bg-[rgba(0,166,86,0.08)] border-[rgba(0,166,86,0.2)] text-primary-02",
};

export default function QuestionBankPage() {
  const { session } = useAuth();
  const token = session?.access_token;

  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [examCategory, setExamCategory] = useState("all");
  const [testType, setTestType] = useState("all");
  const LIMIT = 20;

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit states
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    subject: "",
    chapter: "",
    topic: "",
  });
  const [saving, setSaving] = useState(false);

  // Only exam and type are server-side filters. Subject, search and paging are
  // applied below over the response we already hold — previously all six were
  // in the fetch dependencies, so every keystroke in the search box refetched
  // the entire paper list.
  const listPath = (() => {
    const qs = new URLSearchParams();
    if (examCategory !== "all") qs.set("exam", examCategory);
    if (testType !== "all") qs.set("type", testType);
    return `/api/v1/questions/tests?${qs.toString()}`;
  })();
  const { data: listData, isPending: loading } = useApiQuery<{ papers: any[] }>(listPath);
  const fetchQuestions = () => queryClient.invalidateQueries({ queryKey: [listPath] });

  const filteredPapers = (() => {
    let rows = listData?.papers ?? [];
    if (subject) rows = rows.filter((item: any) => item.subject === subject);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((item: any) =>
        (item.subject ?? "").toLowerCase().includes(q) ||
        (item.chapter ?? "").toLowerCase().includes(q) ||
        (item.topic ?? "").toLowerCase().includes(q) ||
        (item.title ?? "").toLowerCase().includes(q) ||
        (item.id ?? "").toLowerCase().includes(q)
      );
    }
    return rows;
  })();
  const total = filteredPapers.length;
  const allFilteredIds = filteredPapers.map((item: any) => item.id);
  const questions = filteredPapers.slice((page - 1) * LIMIT, (page - 1) * LIMIT + LIMIT);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this test?")) return;
    if (!token) return;
    try {
      const res = await apiClient.delete<{ success: boolean }>(`/api/v1/tests/${id}`, token);
      if (res.success) {
        await fetchQuestions();
      } else {
        alert("Failed to delete test.");
      }
    } catch (err: any) {
      alert(err.message ?? "Error deleting test.");
    }
  };

  const handleEditClick = (q: any) => {
    setEditingQuestion(q);
    setEditForm({
      subject: q.subject ?? "",
      chapter: q.chapter ?? "",
      topic: q.topic ?? "",
    });
  };

  const handleBulkEditClick = () => {
    setEditingQuestion({ id: "bulk" });
    setEditForm({
      subject: "",
      chapter: "",
      topic: "",
    });
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected tests?`)) return;
    if (!token) return;
    try {
      await apiClient.deleteWithBody<{ success: boolean }>(
        "/api/v1/tests/bulk/global",
        { ids: Array.from(selectedIds) },
        token
      );
      setSelectedIds(new Set());
      await fetchQuestions();
    } catch (err: any) {
      alert("Error deleting tests: " + (err.message ?? ""));
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !token) return;
    setSaving(true);
    try {
      const isBulk = editingQuestion.id === "bulk";
      const payload = isBulk
        ? Object.fromEntries(Object.entries(editForm).filter(([_, v]) => v !== ""))
        : editForm;
      if (isBulk && Object.keys(payload).length === 0) return;

      if (isBulk) {
        await apiClient.patch<{ success: boolean }>("/api/v1/tests/bulk/global", {
          ids: Array.from(selectedIds),
          updates: payload,
        }, token);
      } else {
        await apiClient.patch<{ success: boolean }>(`/api/v1/tests/${editingQuestion.id}/global`, payload, token);
      }
      
      setEditingQuestion(null);
      if (isBulk) setSelectedIds(new Set());
      await fetchQuestions();
    } catch (err: any) {
      alert("Error saving details.");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <Navbar title="Global Question Bank" subtitle="Manage JEE and NEET question databases." />
      
      <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6">
        
        <SectionCard 
          title="Tests Inventory"
          headerRight={
            <div className="flex flex-wrap items-center gap-3">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-[13px] font-semibold text-t-secondary">{selectedIds.size} selected</span>
                  <button 
                    onClick={handleBulkEditClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-b-surface1 border border-s-stroke2/40 rounded-[8px] text-[12px] font-medium text-t-primary hover:bg-s-stroke2/30 transition-colors"
                  >
                    <RiEditLine size={14} /> Edit
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-[8px] text-[12px] font-medium text-[#EF4444] hover:bg-[rgba(239,68,68,0.2)] transition-colors"
                  >
                    <RiDeleteBinLine size={14} /> Delete
                  </button>
                </div>
              )}
              <div className="relative w-[300px]">
                <RiSearchLine size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-t-secondary" />
                <input 
                  type="text" 
                  placeholder="Search questions..." 
                  className="w-full h-11 pl-11 pr-4 bg-b-surface1 border border-s-stroke2/40 rounded-[10px] text-[14px] text-t-primary placeholder:text-t-secondary focus:border-t-primary outline-none transition-colors"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>

              <select
                className="h-11 px-4 bg-b-surface1 border border-s-stroke2/40 rounded-[10px] font-sans text-[14px] font-medium text-t-primary outline-none focus:border-t-primary transition-colors cursor-pointer appearance-none min-w-[140px]"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setPage(1); }}
              >
                <option value="">All Subjects</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
              </select>

            </div>
          }
        >
          {/* Categories / Filters */}
          <div className="flex flex-col gap-4 mt-2">
            {/* Exam Tabs */}
            <div className="flex flex-row gap-3 border-b border-s-stroke2/40 overflow-x-auto hide-scrollbar">
              {[
                { id: "all", label: "All Exams" },
                { id: "jee-main", label: "JEE Main" },
                { id: "jee-advanced", label: "JEE Advanced" },
                { id: "neet-ug", label: "NEET UG" },
              ].map(exam => (
                <button
                  key={exam.id}
                  onClick={() => { setExamCategory(exam.id); setPage(1); }}
                  className={`px-1 py-3 font-sans text-[14px] font-semibold transition-colors whitespace-nowrap border-b-[3px] ${examCategory === exam.id ? "text-t-primary border-t-primary" : "text-t-secondary border-transparent hover:text-t-primary hover:border-s-stroke2/60"}`}
                >
                  {exam.label}
                </button>
              ))}
            </div>

            {/* Test Type Pills */}
            <div className="flex flex-row flex-wrap gap-2">
              {[
                { id: "all", label: "All Types" },
                { id: "chapter-wise", label: "Chapter-wise" },
                { id: "mock-test", label: "Mock Test" },
                { id: "pyq", label: "PYQ (by chapter)" },
                { id: "pyq-paper", label: "Past Year Paper" },
                { id: "ncert", label: "NCERT" },
                { id: "assigned", label: "Assigned Test" },
              ]
                .map(type => (
                <button
                  key={type.id}
                  onClick={() => { setTestType(type.id); setPage(1); }}
                  className={`px-4 py-1.5 rounded-[12px] font-sans text-[13px] font-semibold border transition-all ${testType === type.id ? "bg-[#070707] border-[#070707] text-white dark:bg-white dark:border-white dark:text-[#070707]" : "bg-b-surface1 border-s-stroke2/40 text-t-secondary hover:text-t-primary"}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards — the same PaperCard Test Department and Institute Admin use,
              so a style change here reaches both instead of just this table. */}
          <div className="flex flex-col gap-3 mt-3">
            {!loading && questions.length > 0 && (
              <label className="flex w-fit cursor-pointer items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-t-secondary">
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer accent-primary-01"
                  checked={total > 0 && selectedIds.size === total}
                  onChange={(e) => setSelectedIds(e.target.checked ? new Set(allFilteredIds) : new Set())}
                />
                Select all {total.toLocaleString()} results
              </label>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-3 py-10 text-t-secondary">
                <RiLoader4Line size={22} className="animate-spin text-primary-01" />
                <span className="font-sans font-semibold text-[14px]">Loading tests...</span>
              </div>
            ) : questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-t-secondary">
                <p className="font-sans font-semibold text-[14px]">No tests found.</p>
                <p className="font-sans text-[13px] mt-1">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {questions.map((question) => {
                  const badges: PaperCardBadge[] = [
                    { label: question.test_type || "N/A", className: "bg-b-surface1 border border-s-stroke2 text-t-secondary" },
                  ];
                  if (!question.is_published) {
                    badges.push({ label: "Draft", className: "bg-[rgba(255,159,10,0.08)] border border-[rgba(255,159,10,0.2)] text-[#FF9F0A]" });
                  }
                  if (question.difficulty && DIFFICULTY_CLASS[question.difficulty]) {
                    badges.push({ label: question.difficulty, className: `border ${DIFFICULTY_CLASS[question.difficulty]}` });
                  }
                  const subtitle = [question.subject, question.chapter, question.topic].filter(Boolean).join(" · ");
                  return (
                    <PaperCard
                      key={question.id}
                      href={`/superadmin/questions/${question.id}`}
                      title={question.title || "Untitled Test"}
                      badges={badges}
                      subtitle={subtitle || undefined}
                      totalQuestions={question.total_questions}
                      durationMin={question.duration_min}
                      totalMarks={question.total_marks}
                      ctaLabel="Review"
                      leadingAccessory={
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-primary-01"
                          checked={selectedIds.has(question.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const newSet = new Set(selectedIds);
                            if (e.target.checked) newSet.add(question.id);
                            else newSet.delete(question.id);
                            setSelectedIds(newSet);
                          }}
                        />
                      }
                      cornerAction={
                        <>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditClick(question); }}
                            title="Edit details"
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-s-stroke2 bg-b-surface1 text-t-secondary transition-colors hover:border-t-secondary/50 hover:text-t-primary"
                          >
                            <RiEditLine size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(question.id); }}
                            title="Delete"
                            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-s-stroke2 bg-b-surface1 text-t-secondary transition-colors hover:border-[rgba(239,68,68,0.4)] hover:text-primary-03"
                          >
                            <RiDeleteBinLine size={14} />
                          </button>
                        </>
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && total > LIMIT && (
            <div className="mt-4 pt-4 border-t border-s-stroke2/30 flex justify-between items-center text-sm font-medium text-t-secondary px-2">
              <div>
                Showing <span className="font-bold text-t-primary">{((page - 1) * LIMIT) + 1}</span> to <span className="font-bold text-t-primary">{Math.min(page * LIMIT, total)}</span> of <span className="font-bold text-t-primary">{total.toLocaleString()}</span> entries
              </div>
              <div className="flex flex-row items-center gap-2">
                <button
                  className="px-4 py-2 rounded-[10px] border border-s-stroke2/40 bg-b-surface1 font-sans text-[13px] font-semibold text-t-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-s-stroke2/30 transition-colors"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <span className="text-[13px] font-semibold text-t-secondary px-2">{page} / {totalPages}</span>
                <button
                  className="px-4 py-2 rounded-[10px] border border-s-stroke2/40 bg-b-surface1 font-sans text-[13px] font-semibold text-t-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-s-stroke2/30 transition-colors"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </SectionCard>
      </main>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <Modal
          open={!!editingQuestion}
          onClose={() => setEditingQuestion(null)}
          title={editingQuestion.id === "bulk" ? `Edit details for ${selectedIds.size} selected tests` : `Edit Test details: #${editingQuestion.id.slice(0, 10)}`}
          maxWidth="max-w-[500px]"
        >
          <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Subject</label>
              <select
                className="h-11 px-4 bg-b-surface1 border border-s-stroke2/40 rounded-[10px] font-sans text-[14px] text-t-primary outline-none focus:border-t-primary transition-colors cursor-pointer"
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
              >
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Chapter</label>
              <input
                type="text"
                className="w-full h-11 px-4 bg-b-surface1 border border-s-stroke2/40 rounded-[10px] text-[14px] font-medium text-t-primary focus:border-t-primary outline-none transition-colors"
                value={editForm.chapter}
                onChange={(e) => setEditForm({ ...editForm, chapter: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Topic</label>
              <input
                type="text"
                className="w-full h-11 px-4 bg-b-surface1 border border-s-stroke2/40 rounded-[10px] text-[14px] font-medium text-t-primary focus:border-t-primary outline-none transition-colors"
                value={editForm.topic}
                onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
              />
            </div>



            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary mt-2 w-full h-12 gap-2 text-[14px]"
            >
              {saving ? (
                <RiLoader4Line size={18} className="animate-spin" />
              ) : (
                "Save Changes"
              )}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
