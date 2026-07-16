"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";
import { RiCheckLine, RiCloseLine, RiLoader4Line, RiArrowRightLine } from "@remixicon/react";

export default function CreateDPPPage() {
  const router = useRouter();
  const { session } = useAuth();
  
  const [batches, setBatches] = useState<any[]>([]);
  const [examsMeta, setExamsMeta] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    title: "",
    batchId: "",
    dueDate: "",
    subject: "",
    chapter: "",
  });
  
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);

  // 1. Fetch Batches and Exams Meta
  useEffect(() => {
    if (!session?.access_token) return;
    
    Promise.all([
      apiClient.get("/api/v1/dashboard/teacher", session.access_token),
      apiClient.get("/api/v1/questions/meta/exams", session.access_token)
    ]).then(([dashRes, metaRes]) => {
      if (dashRes.success) setBatches(dashRes.data.batches ?? []);
      if (metaRes.success) setExamsMeta(metaRes.data.exams ?? []);
    }).catch(console.error);
  }, [session?.access_token]);

  // Derived selections based on batch's exam
  const selectedBatch = batches.find(b => b.id === form.batchId);
  const selectedExamCode = selectedBatch?.exam; // e.g. "jee-main"
  const currentExamMeta = examsMeta.find(e => e.code === selectedExamCode);
  
  const availableSubjects = currentExamMeta?.subjects ?? [];
  const currentSubject = availableSubjects.find((s: any) => s.name === form.subject);
  const availableChapters = currentSubject?.chapters ?? [];
  const currentChapter = availableChapters.find((c: any) => c.name === form.chapter);
  const availableTopics = currentChapter?.topics ?? [];

  // Downstream resets are handled explicitly in the select onChange event handlers below to avoid cascading render passes.

  const toggleTopic = (topic: string) => {
    const newSet = new Set(selectedTopics);
    if (newSet.has(topic)) newSet.delete(topic);
    else newSet.add(topic);
    setSelectedTopics(newSet);
  };

  const toggleQuestion = (id: string) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedQuestions(newSet);
  };

  // 2. Fetch Questions based on filters
  useEffect(() => {
    if (!session?.access_token || !selectedExamCode || !form.subject || !form.chapter) {
      setQuestions([]);
      return;
    }
    
    setLoadingQuestions(true);
    let url = `/api/v1/questions?exam=${encodeURIComponent(selectedExamCode)}&subject=${encodeURIComponent(form.subject)}&chapter=${encodeURIComponent(form.chapter)}&limit=100`;
    if (selectedTopics.size > 0) {
      url += `&topics=${encodeURIComponent(Array.from(selectedTopics).join(","))}`;
    }
    
    apiClient.get(url, session.access_token)
      .then(res => {
        if (res.success) setQuestions(res.data.questions ?? []);
        else setQuestions([]);
      })
      .catch(console.error)
      .finally(() => setLoadingQuestions(false));
  }, [session?.access_token, selectedExamCode, form.subject, form.chapter, selectedTopics]);

  // 3. Publish
  const handlePublish = async () => {
    if (!form.title || !form.batchId || !form.dueDate || selectedQuestions.size === 0) {
      alert("Please fill all fields and select at least 1 question.");
      return;
    }
    setPublishing(true);
    try {
      const res = await apiClient.post("/api/v1/dpps", {
        title: form.title,
        batch_id: form.batchId,
        subject: form.subject,
        chapter: form.chapter,
        question_ids: Array.from(selectedQuestions),
        due_date: form.dueDate,
      }, session?.access_token);

      if (res.success) {
        router.push("/teacher/dpps");
      } else {
        alert(res.message ?? "Failed to publish DPP");
      }
    } catch (e: any) {
      alert(e.message ?? "Network error");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <Navbar
        title="Create New DPP"
        subtitle="Select specific topics and pick questions for your batch."
        breadcrumbs="Dashboard > DPPs > Create"
      />
      
      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-12 pt-4 md:px-8 overflow-x-hidden flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Configuration */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6 shrink-0">
          <div className="card !p-6 flex flex-col gap-5">
            <h3 className="text-sub-title-2 font-bold text-t-primary border-b border-s-stroke2/40 pb-4">DPP Settings</h3>
            
            <div>
              <label className="block text-caption font-bold text-t-secondary mb-2">DPP Title *</label>
              <input
                className="input"
                placeholder="e.g. Newton's Laws — Advanced Level"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-caption font-bold text-t-secondary mb-2">Assign to Batch *</label>
              <select
                className="input"
                value={form.batchId}
                onChange={e => {
                  setForm(f => ({ ...f, batchId: e.target.value, subject: "", chapter: "" }));
                  setSelectedTopics(new Set());
                }}
              >
                <option value="">Select a batch...</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.exam})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-bold text-t-secondary mb-2">Due Date *</label>
              <input
                className="input"
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="card !p-6 flex flex-col gap-5">
            <h3 className="text-sub-title-2 font-bold text-t-primary border-b border-s-stroke2/40 pb-4">Curriculum Filter</h3>
            
            {!selectedBatch ? (
              <p className="text-caption text-t-secondary">Select a batch first to see available subjects.</p>
            ) : (
              <>
                <div>
                  <label className="block text-caption font-bold text-t-secondary mb-2">Subject *</label>
                  <select
                    className="input"
                    value={form.subject}
                    onChange={e => {
                      setForm(f => ({ ...f, subject: e.target.value, chapter: "" }));
                      setSelectedTopics(new Set());
                    }}
                  >
                    <option value="">Select subject...</option>
                    {availableSubjects.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                {form.subject && (
                  <div>
                    <label className="block text-caption font-bold text-t-secondary mb-2">Chapter *</label>
                    <select
                      className="input"
                      value={form.chapter}
                      onChange={e => {
                        setForm(f => ({ ...f, chapter: e.target.value }));
                        setSelectedTopics(new Set());
                      }}
                    >
                      <option value="">Select chapter...</option>
                      {availableChapters.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {form.chapter && availableTopics.length > 0 && (
                  <div>
                    <label className="block text-caption font-bold text-t-secondary mb-3">Filter by Topics (Optional)</label>
                    <div className="flex flex-wrap gap-2">
                      {availableTopics.map((topic: string) => (
                        <button
                          key={topic}
                          onClick={() => toggleTopic(topic)}
                          className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all cursor-pointer ${
                            selectedTopics.has(topic)
                              ? "bg-primary-02/10 border-primary-02/40 text-primary-02"
                              : "bg-transparent border-s-stroke2 text-t-secondary hover:text-t-primary hover:border-t-primary/30"
                          }`}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Question Picker */}
        <div className="w-full flex-1 flex flex-col min-h-[600px]">
          <div className="card !p-0 flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-s-stroke2/40 flex justify-between items-center bg-b-surface1 z-10 sticky top-0">
              <div>
                <h3 className="text-sub-title-2 font-bold text-t-primary">Question Picker</h3>
                <p className="text-caption text-t-secondary mt-1">
                  {loadingQuestions ? "Loading..." : `${questions.length} questions available`}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-sm font-semibold text-t-primary">
                  Selected: <span className="text-primary-01">{selectedQuestions.size}</span>
                </div>
                <button 
                  className="btn btn-primary"
                  onClick={handlePublish}
                  disabled={publishing || selectedQuestions.size === 0 || !form.title || !form.batchId || !form.dueDate}
                >
                  {publishing ? "Publishing..." : "Publish DPP"} <RiArrowRightLine size={18} className="ml-1" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-shade-01 dark:bg-black/20">
              {!form.chapter ? (
                <div className="flex flex-col items-center justify-center h-full text-t-secondary opacity-60 mt-20">
                  <RiCheckLine size={48} className="mb-4" />
                  <p>Select a chapter to browse questions</p>
                </div>
              ) : loadingQuestions ? (
                <div className="flex justify-center mt-20">
                  <RiLoader4Line size={32} className="animate-spin text-t-secondary" />
                </div>
              ) : questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-t-secondary mt-20">
                  <p>No questions found for the selected criteria.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {questions.map((q, idx) => {
                    const isSelected = selectedQuestions.has(q.id);
                    return (
                      <div 
                        key={q.id}
                        onClick={() => toggleQuestion(q.id)}
                        className={`p-5 rounded-[16px] border transition-all cursor-pointer select-none relative overflow-hidden ${
                          isSelected 
                            ? "bg-primary-02/5 border-primary-02/40" 
                            : "bg-b-surface1 border-s-stroke2/40 hover:border-t-secondary/30"
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className="pt-1 shrink-0">
                            <div className={`w-5 h-5 rounded-[6px] border flex items-center justify-center ${
                              isSelected ? "bg-primary-02 border-primary-02 text-white" : "border-s-stroke2 bg-transparent"
                            }`}>
                              {isSelected && <RiCheckLine size={14} />}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-t-secondary">Q{idx + 1}</span>
                              <span className="label label-gray">{q.difficulty}</span>
                              {q.topic && <span className="label label-gray">{q.topic}</span>}
                            </div>
                            
                            <p className="text-sm font-medium text-t-primary leading-relaxed whitespace-pre-wrap">
                              {q.question_text}
                            </p>
                            
                            {q.image_url && (
                              <img src={q.image_url} alt="Question" className="mt-4 max-w-full h-auto max-h-48 rounded-[10px]" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
