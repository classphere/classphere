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
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");
  const LIMIT = 20;

  // Edit states
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    subject: "",
    chapter: "",
    topic: "",
    difficulty: "Medium",
  });
  const [saving, setSaving] = useState(false);

  const fetchQuestions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (subject) qs.set("subject", subject);
      if (difficulty) qs.set("difficulty", difficulty);

      const res = await apiClient.get(`/api/v1/questions?${qs}`, token);
      if (res.success) {
        let qs2 = res.data.questions ?? [];
        if (search) {
          const q = search.toLowerCase();
          qs2 = qs2.filter((item: any) =>
            (item.subject ?? "").toLowerCase().includes(q) ||
            (item.chapter ?? "").toLowerCase().includes(q) ||
            (item.topic ?? "").toLowerCase().includes(q) ||
            (item.id ?? "").toLowerCase().includes(q)
          );
        }
        setQuestions(qs2);
        setTotal(res.data.total ?? 0);
      }
    } catch (e) {
      console.error("[QuestionBank]", e);
    } finally {
      setLoading(false);
    }
  }, [token, page, subject, difficulty]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this question?")) return;
    if (!token) return;
    try {
      const res = await apiClient.delete<{ success: boolean }>(`/api/v1/questions/${id}`, token);
      if (res.success) {
        await fetchQuestions();
      } else {
        alert("Failed to delete question.");
      }
    } catch (err: any) {
      alert(err.message ?? "Error deleting question.");
    }
  };

  const handleEditClick = (q: any) => {
    setEditingQuestion(q);
    setEditForm({
      subject: q.subject ?? "",
      chapter: q.chapter ?? "",
      topic: q.topic ?? "",
      difficulty: q.difficulty ?? "Medium",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !token) return;
    setSaving(true);
    try {
      const res = await apiClient.patch<{ success: boolean }>(
        `/api/v1/questions/${editingQuestion.id}`,
        editForm,
        token
      );
      if (res.success) {
        setEditingQuestion(null);
        await fetchQuestions();
      } else {
        alert("Failed to save changes.");
      }
    } catch (err: any) {
      alert(err.message ?? "Error saving question details.");
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
          title="Questions Inventory"
          headerRight={
            <div className="flex flex-wrap items-center gap-3">
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

              <select
                className="h-11 px-4 bg-b-surface1 border border-s-stroke2/40 rounded-[10px] font-sans text-[14px] font-medium text-t-primary outline-none focus:border-t-primary transition-colors cursor-pointer appearance-none min-w-[140px]"
                value={difficulty}
                onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
              >
                <option value="">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          }
        >
          {/* Table */}
          <div className="flex flex-col gap-3 mt-6">
            <div className="hidden md:flex flex-row items-center w-full px-6 py-2 text-xs font-semibold uppercase tracking-wider text-t-secondary">
              <div className="w-[260px]">Question ID / Source</div>
              <div className="w-[130px]">Subject</div>
              <div className="flex-1">Chapter / Topic</div>
              <div className="w-[120px]">Difficulty</div>
              <div className="w-[100px]">Type</div>
              <div className="w-[120px] text-right">Actions</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 py-16 text-t-secondary">
                <RiLoader4Line size={22} className="animate-spin text-primary-01" />
                <span className="font-sans font-semibold text-[14px]">Loading questions...</span>
              </div>
            ) : questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-t-secondary">
                <p className="font-sans font-semibold text-[14px]">No questions found.</p>
                <p className="font-sans text-[13px] mt-1">Try adjusting your filters.</p>
              </div>
            ) : questions.map((question) => (
              <div
                key={question.id}
                className="group/item relative flex flex-col md:flex-row md:items-center w-full p-4 md:px-6 gap-4 md:gap-0 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all cursor-pointer"
              >
                <div className="w-full md:w-[260px] font-sans text-[13px] font-medium text-t-secondary group-hover/item:text-[#0A84FF] transition-colors truncate" title={question.id}>
                  {question.id.slice(0, 20)}…
                </div>
                <div className="w-full md:w-[130px] font-sans text-[15px] font-semibold text-t-primary">
                  {question.subject}
                </div>
                <div className="flex-1 font-sans text-[14px] font-medium text-t-primary truncate">
                  {question.chapter}{question.topic ? ` · ${question.topic}` : ""}
                </div>
                <div className="w-full md:w-[120px]">
                  <span className={`inline-flex items-center px-3 py-1 rounded-[10px] text-[11px] font-bold uppercase tracking-wider border ${DIFFICULTY_CLASS[question.difficulty] ?? DIFFICULTY_CLASS.Medium}`}>
                    {question.difficulty ?? "Medium"}
                  </span>
                </div>
                <div className="w-full md:w-[100px]">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] border bg-b-surface1 border-s-stroke2/40 text-t-secondary">
                    <span className="font-sans text-[11px] font-bold uppercase tracking-wider">{question.question_type || "mcq_single"}</span>
                  </span>
                </div>
                <div className="w-full md:w-[120px] text-right flex md:justify-end items-center gap-1 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity">
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
          title={`Edit Question details: #${editingQuestion.id.slice(0, 10)}`}
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

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Difficulty</label>
              <select
                className="h-11 px-4 bg-b-surface1 border border-s-stroke2/40 rounded-[10px] font-sans text-[14px] text-t-primary outline-none focus:border-t-primary transition-colors cursor-pointer"
                value={editForm.difficulty}
                onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
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
