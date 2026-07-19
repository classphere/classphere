"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { Modal } from "@/components/shared/Modal";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { 
  RiSearchLine, 
  RiFilter3Line, 
  RiAddLine, 
  RiDeleteBinLine, 
  RiEditLine, 
  RiMore2Fill, 
  RiLoader4Line,
  RiArrowDownSLine
} from "@remixicon/react";

const DIFFICULTY_CLASS: Record<string, string> = {
  Hard: "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] text-primary-03",
  Medium: "bg-[rgba(255,159,10,0.08)] border-[rgba(255,159,10,0.2)] text-[#FF9F0A]",
  Easy: "bg-[rgba(0,166,86,0.08)] border-[rgba(0,166,86,0.2)] text-primary-02",
};

export default function QuestionBankPage() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [questions, setQuestions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [allFilteredIds, setAllFilteredIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchQuestions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (examCategory !== "all") qs.set("exam", examCategory);
      if (testType !== "all") qs.set("type", testType);

      const res = await apiClient.get(`/api/v1/questions/tests?${qs.toString()}`, token);
      if (res.success) {
        let qs2 = res.data.papers ?? [];
        if (subject) {
          qs2 = qs2.filter((item: any) => item.subject === subject);
        }
        if (search) {
          const q = search.toLowerCase();
          qs2 = qs2.filter((item: any) =>
            (item.subject ?? "").toLowerCase().includes(q) ||
            (item.chapter ?? "").toLowerCase().includes(q) ||
            (item.topic ?? "").toLowerCase().includes(q) ||
            (item.title ?? "").toLowerCase().includes(q) ||
            (item.id ?? "").toLowerCase().includes(q)
          );
        }
        setTotal(qs2.length);
        setAllFilteredIds(qs2.map((item: any) => item.id));
        const startIndex = (page - 1) * LIMIT;
        setQuestions(qs2.slice(startIndex, startIndex + LIMIT));
      }
    } catch (e) {
      console.error("[QuestionBank]", e);
    } finally {
      setLoading(false);
    }
  }, [token, page, subject, search, examCategory, testType]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

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
    setLoading(true);
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
    } finally {
      setLoading(false);
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
      <Navbar title="Global Question Bank" subtitle="Manage JEE, NEET, and SSC question databases." />
      
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
            <div className="flex flex-row gap-6 border-b border-s-stroke2/40 overflow-x-auto hide-scrollbar">
              {[
                { id: "all", label: "All Exams" },
                { id: "jee-main", label: "JEE Main" },
                { id: "jee-advanced", label: "JEE Advanced" },
                { id: "neet-ug", label: "NEET UG" },
                { id: "ssc-cgl", label: "SSC CGL" },
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
                { id: "pyq", label: "PYQ" },
                { id: "ncert", label: "NCERT" },
                { id: "assigned", label: "Assigned Test" },
              ]
                .filter(type => !(examCategory === "ssc-cgl" && type.id === "ncert"))
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

          {/* Table */}
          <div className="flex flex-col gap-3 mt-6">
            <div className="hidden md:flex flex-row items-center w-full px-6 py-2 text-xs font-semibold uppercase tracking-wider text-t-secondary">
              <div className="w-[40px] flex items-center justify-center">
                <input 
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer accent-primary-01"
                  checked={total > 0 && selectedIds.size === total}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(allFilteredIds));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
              </div>
              <div className="flex-1 pr-4">Test Title</div>
              <div className="w-[130px]">Subject</div>
              <div className="flex-1">Chapter / Topic</div>
              <div className="w-[100px]">Type</div>
              <div className="w-[120px] text-right">Actions</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 py-16 text-t-secondary">
                <RiLoader4Line size={22} className="animate-spin text-primary-01" />
                <span className="font-sans font-semibold text-[14px]">Loading tests...</span>
              </div>
            ) : questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-t-secondary">
                <p className="font-sans font-semibold text-[14px]">No tests found.</p>
                <p className="font-sans text-[13px] mt-1">Try adjusting your filters.</p>
              </div>
            ) : questions.map((question) => (
              <div
                key={question.id}
                className={`group/item relative flex flex-col md:flex-row md:items-center w-full p-4 md:px-6 gap-4 md:gap-0 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all cursor-pointer ${selectedIds.has(question.id) ? 'border-primary-01/50 bg-primary-01/5' : ''}`}
              >
                <div className="hidden md:flex w-[40px] items-center justify-center">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer accent-primary-01"
                    checked={selectedIds.has(question.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedIds);
                      if (e.target.checked) newSet.add(question.id);
                      else newSet.delete(question.id);
                      setSelectedIds(newSet);
                    }}
                  />
                </div>
                <div className="flex-1 font-sans text-[14px] font-medium text-t-primary truncate pr-4" title={question.title}>
                  {question.title || "Untitled Test"}
                </div>
                <div className="w-full md:w-[130px] font-sans text-[15px] font-semibold text-t-primary">
                  {question.subject || "-"}
                </div>
                <div className="flex-1 font-sans text-[14px] font-medium text-t-primary truncate">
                  {question.chapter || "-"}{question.topic ? ` · ${question.topic}` : ""}
                </div>
                <div className="w-full md:w-[100px]">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] border bg-b-surface1 border-s-stroke2/40 text-t-secondary">
                    <span className="font-sans text-[11px] font-bold uppercase tracking-wider">{question.test_type || "N/A"}</span>
                  </span>
                </div>
                <div className="w-full md:w-[120px] text-right flex md:justify-end items-center gap-1 opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditClick(question)}
                    className="p-2 rounded-[10px] hover:bg-b-surface1 text-t-secondary hover:text-t-primary transition-colors"
                  >
                    <RiEditLine size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(question.id)}
                    className="p-2 rounded-[10px] hover:bg-[rgba(239,68,68,0.1)] text-t-secondary hover:text-primary-03 transition-colors"
                  >
                    <RiDeleteBinLine size={18} />
                  </button>
                  <button className="p-2 rounded-[10px] hover:bg-b-surface1 text-t-secondary hover:text-t-primary transition-colors">
                    <RiMore2Fill size={18} />
                  </button>
                </div>
              </div>
            ))}
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
          <form onSubmit={handleSaveEdit} className="flex flex-col gap-6">
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
              className="flex items-center justify-center gap-2 w-full h-12 rounded-[10px] border border-[#161616] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white text-[14px] font-bold shadow-[0px_4px_4px_-1px_rgba(0,0,0,0.16)] cursor-pointer disabled:opacity-50 transition-transform active:scale-[0.99] mt-2"
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
