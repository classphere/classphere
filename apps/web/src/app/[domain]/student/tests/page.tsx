"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { API_V1_URL, apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";
import { scheduleTestReminder } from "@/lib/notifications/local-reminders";
import {
  RiSearchLine,
  RiTimeLine,
  RiQuestionLine,
  RiBarChartBoxLine,
  RiLoader4Line,
  RiDeleteBinLine,
  RiCalendarEventLine,
  RiPlayCircleLine,
  RiLockLine,
} from "@remixicon/react";

interface Paper {
  id: string;
  title: string;
  test_type: "chapter-wise" | "mock-test" | "pyq" | "ncert";
  subject?: string;
  chapter?: string;
  year?: number;
  shift?: string;
  total_questions: number;
  total_marks: number;
  duration_min: number;
  difficulty: "easy" | "medium" | "hard";
  exams?: { code: string; full_name: string };
}

interface AssignedTest {
  id: string;
  title: string;
  test_type: string;
  total_questions: number;
  total_marks: number;
  duration_min: number;
  is_published: boolean;
  created_at: string;
  scheduled_at: string | null;
  assigned_at: string;
}

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  resource_type: "pdf" | "link" | "video" | "note";
  resource_url?: string | null;
  subject?: string | null;
  chapter?: string | null;
  topic?: string | null;
}

const API_BASE = API_V1_URL;
const EXAM_LABELS: Record<string, string> = {
  "jee-main":          "JEE Main",
  "jee-advanced":      "JEE Advanced",
  "jee-main-advanced": "JEE Main + Advanced",
  "neet-ug":           "NEET-UG",
};
const TYPES = [
  { id: "assigned", label: "Assigned Tests" },
  { id: "topic-wise", label: "Topic-wise" },
  { id: "resources", label: "Study Material" },
  { id: "chapter-wise", label: "Chapter-wise" },
  { id: "mock-test", label: "Mock Tests" },
  { id: "pyq", label: "PYQs" },
  { id: "ncert", label: "Ncert Questions" },
];

type ExamMeta = { code: string; full_name: string; subjects: { name: string; chapters: { name: string; topics: string[] }[] }[] };

export default function TestsHubPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><RiLoader4Line size={40} className="animate-spin text-t-secondary" /></div>}>
      <TestsHubContent />
    </Suspense>
  );
}

function TestsHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, user } = useAuth();
  const role = user?.role ?? searchParams.get("role") ?? "student";
  const isAdmin = role === "super_admin" || role === "institute_admin";

  const [papers, setPapers] = useState<Paper[]>([]);
  const [assignedTests, setAssignedTests] = useState<AssignedTest[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeExam, setActiveExam] = useState("jee-main");
  const EXAM_OPTIONS = ["jee-main", "jee-advanced", "jee-main-advanced", "neet-ug"];
  const [activeType, setActiveType] = useState(() => searchParams.get("tab") === "resources" ? "resources" : "assigned");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [examMeta, setExamMeta] = useState<ExamMeta[]>([]);
  const [topicSubject, setTopicSubject] = useState("");
  const [topicChapter, setTopicChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [topicDifficulty, setTopicDifficulty] = useState("");
  const [creatingTopicPractice, setCreatingTopicPractice] = useState(false);
  const [notificationVersion, setNotificationVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setNotificationVersion((version) => version + 1);
    window.addEventListener("classphere:notification", refresh);
    return () => window.removeEventListener("classphere:notification", refresh);
  }, []);

  const handleDelete = async (paperId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const res = await fetch(`${API_BASE}/tests/${paperId}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete test.");
      setPapers(prev => prev.filter(p => p.id !== paperId));
    } catch (err: any) {
      alert(err.message || "An error occurred during deletion.");
    }
  };

  // Load assigned tests from institute
  useEffect(() => {
    if (!session?.access_token || activeType !== "assigned") return;
    setLoading(true);
    setError(null);
    apiClient.get("/api/v1/tests/assigned", session.access_token)
      .then((res) => {
        if (!res.success) throw new Error(res.message || "Failed to load assigned tests");
        const tests: AssignedTest[] = res.data.tests ?? [];
        setAssignedTests(tests);
        // Best-effort — schedules a local reminder ~30 min before each upcoming
        // scheduled test; no-ops on web / already-past-due tests.
        for (const test of tests) {
          void scheduleTestReminder({ id: test.id, title: test.title, scheduledAt: test.scheduled_at });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeType, session, notificationVersion]);

  useEffect(() => {
    if (!session?.access_token || activeType !== "resources") return;
    setLoading(true);
    setError(null);
    apiClient.get("/api/v1/resources/student", session.access_token)
      .then((res) => setResources(res.data?.resources ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeType, session, notificationVersion]);

  // Load PYQ / chapter-wise / mock tests from superadmin question bank
  useEffect(() => {
    if (!session?.access_token || activeType === "assigned" || activeType === "topic-wise" || activeType === "resources") return;
    setLoading(true);
    setError(null);
    apiClient.get(`/api/v1/questions/tests?exam=${activeExam}&type=${activeType}`, session.access_token)
      .then(res => {
        if (res.success) setPapers(res.data.papers);
        else throw new Error(res.message || "Failed to load tests");
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeType, activeExam, session]);

  useEffect(() => {
    if (!session?.access_token || activeType !== "topic-wise") return;
    apiClient.get("/api/v1/questions/meta/exams", session.access_token)
      .then((res) => {
        const exams = res.data?.exams ?? [];
        setExamMeta(exams);
        const chosen = exams.find((entry: ExamMeta) => entry.code === activeExam) ?? exams[0];
        if (chosen && chosen.code !== activeExam) setActiveExam(chosen.code);
      })
      .catch((err) => setError(err.message));
  }, [activeType, session, activeExam]);

  const selectedExamMeta = examMeta.find((entry) => entry.code === activeExam);
  const selectedSubjectMeta = selectedExamMeta?.subjects.find((entry) => entry.name === topicSubject);
  const selectedChapterMeta = selectedSubjectMeta?.chapters.find((entry) => entry.name === topicChapter);

  const startTopicPractice = async () => {
    if (!session?.access_token || !topicSubject || !topicChapter || !topic) return;
    setCreatingTopicPractice(true);
    setError(null);
    try {
      const response = await apiClient.post("/api/v1/questions/topic-practice", {
        exam: activeExam, subject: topicSubject, chapter: topicChapter, topic, difficulty: topicDifficulty || undefined,
      }, session.access_token);
      window.location.href = `/test/${response.data.paper_id}?mode=practice`;
    } catch (err: any) {
      setError(err.message ?? "Could not start topic practice.");
    } finally {
      setCreatingTopicPractice(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(papers.map(p =>
      activeType === "chapter-wise" ? (p.subject || "General") :
        activeType === "pyq" ? String(p.year || "All") : "All"
    ));
    return ["All", ...Array.from(cats).filter(c => c !== "All")];
  }, [papers, activeType]);

  const filtered = useMemo(() => {
    return papers.filter(p => {
      const cat = activeType === "chapter-wise" ? (p.subject || "General") :
        activeType === "pyq" ? String(p.year || "") : "All";
      if (activeCategory !== "All" && cat !== activeCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.title.toLowerCase().includes(q) || (p.subject || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [papers, activeCategory, activeType, search]);

  const filteredAssigned = useMemo(() => {
    if (!search) return assignedTests;
    const q = search.toLowerCase();
    return assignedTests.filter(t => t.title.toLowerCase().includes(q));
  }, [assignedTests, search]);

  return (
    <>
      <Navbar title="Tests Hub" subtitle="All your chapter-wise tests, mock tests, and PYQs in one place." breadcrumbs="Student > Tests Hub" />
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-4 md:px-8 overflow-x-hidden">
        {/* Type Tabs */}
        <div className="no-scrollbar mb-5 flex max-w-full items-center gap-1.5 overflow-x-auto rounded-[14px] border border-s-stroke2/40 bg-b-surface2 p-1 shadow-widget select-none dark:shadow-[inset_0_0_0_1.5px_rgba(229,229,229,0.04),0px_5px_1.5px_-4px_rgba(8,8,8,0.5)]">
          {TYPES.map(type => {
            const isActive = activeType === type.id;
            return (
              <button key={type.id} onClick={() => { setActiveType(type.id); setActiveCategory("All"); setSearch(""); }}
                className={`relative shrink-0 px-5 py-2.5 rounded-[10px] text-[13px] font-sans font-semibold transition-all overflow-hidden cursor-pointer ${isActive ? "bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white border border-[#161616] shadow-[0px_6.8656px_6.8656px_-2.33333px_rgba(0,0,0,0.16),inset_0px_1px_0px_rgba(255,255,255,0.16),inset_0px_-2px_0px_#191919]" : "bg-transparent text-t-secondary hover:text-t-primary"}`}>
                {isActive && <i className="absolute -right-3 top-0 h-3 w-20 rotate-[125deg] rounded-full bg-white/10 blur-[3px]" />}
                <span className="relative">{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filters — only for non-assigned tabs */}
        {activeType !== "assigned" && activeType !== "topic-wise" && activeType !== "resources" && (
          <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center gap-4 mb-6 bg-b-surface2 border border-s-stroke2/40 p-4 sm:p-5 rounded-[24px] select-none">
            <div className="relative flex-1 min-w-0 sm:min-w-[240px]">
              <RiSearchLine size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-t-secondary" />
              <input type="text" placeholder={`Search...`} value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-s-stroke2 rounded-[10px] bg-b-surface1 text-[13px] font-sans text-t-primary placeholder-t-secondary focus:border-t-secondary outline-none transition-all" />
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <FilterGroup label="Exam" options={EXAM_OPTIONS} active={activeExam} onChange={setActiveExam} displayMap={EXAM_LABELS} />
              {categories.length > 1 && <FilterGroup label={activeType === "pyq" ? "Year" : "Subject"} options={categories} active={activeCategory} onChange={setActiveCategory} />}
            </div>
          </div>
        )}

        {activeType === "topic-wise" && (
          <section className="card mx-auto max-w-3xl p-5 sm:p-8">
            <div className="mb-6"><h2 className="text-lg font-bold text-t-primary">Practice a topic</h2><p className="mt-1 text-sm text-t-secondary">Build a private practice set from one topic. It will not affect your institute tests.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Exam" value={activeExam} onChange={(value) => { setActiveExam(value); setTopicSubject(""); setTopicChapter(""); setTopic(""); }} options={examMeta.map((entry) => ({ value: entry.code, label: entry.full_name }))} />
              <SelectField label="Subject" value={topicSubject} onChange={(value) => { setTopicSubject(value); setTopicChapter(""); setTopic(""); }} options={(selectedExamMeta?.subjects ?? []).map((entry) => ({ value: entry.name, label: entry.name }))} />
              <SelectField label="Chapter" value={topicChapter} onChange={(value) => { setTopicChapter(value); setTopic(""); }} options={(selectedSubjectMeta?.chapters ?? []).map((entry) => ({ value: entry.name, label: entry.name }))} />
              <SelectField label="Topic" value={topic} onChange={setTopic} options={(selectedChapterMeta?.topics ?? []).map((entry) => ({ value: entry, label: entry }))} />
              <SelectField label="Difficulty (optional)" value={topicDifficulty} onChange={setTopicDifficulty} options={[{ value: "", label: "Mixed difficulty" }, { value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }]} />
            </div>
            {error && <p className="mt-4 text-sm text-primary-03">{error}</p>}
            <button disabled={!topic || creatingTopicPractice} onClick={startTopicPractice} className="mt-7 flex h-11 items-center justify-center rounded-[10px] bg-shade-02 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{creatingTopicPractice ? "Creating practice set…" : "Practice Questions"}</button>
          </section>
        )}

        {activeType === "resources" && (
          <section>
            <div className="mb-5"><h2 className="text-lg font-bold text-t-primary">Study Material</h2><p className="mt-1 text-sm text-t-secondary">Notes and resources shared with your batch by your institute.</p></div>
            {loading ? <div className="card py-16 text-center"><RiLoader4Line size={30} className="mx-auto animate-spin text-t-secondary" /></div>
              : error ? <div className="card py-12 text-center text-sm text-primary-03">{error}</div>
              : resources.length === 0 ? <div className="card py-16 text-center text-sm text-t-secondary">Your institute has not shared study material with this batch yet.</div>
              : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{resources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div>}
          </section>
        )}

        {/* Assigned Tests Tab */}
        {activeType === "assigned" && (
          <>
            {/* Search bar for assigned */}
            <div className="relative max-w-[360px] mb-6">
              <RiSearchLine size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-t-secondary" />
              <input type="text" placeholder="Search assigned tests..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-s-stroke2 rounded-[10px] bg-b-surface1 text-[13px] font-sans text-t-primary placeholder-t-secondary focus:border-t-secondary outline-none transition-all" />
            </div>

            {loading ? (
              <TestCardsSkeleton />
            ) : error ? (
              <div className="card text-center py-20"><div className="text-4xl mb-4">⚠️</div><p className="font-semibold text-[13px] text-primary-03">{error}</p></div>
            ) : filteredAssigned.length === 0 ? (
              <div className="flex flex-col items-center py-24 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-b-surface2 flex items-center justify-center">
                  <RiCalendarEventLine size={28} className="text-t-secondary" />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-[15px] text-t-primary mb-1">No tests assigned yet</h3>
                  <p className="text-[13px] font-sans text-t-secondary">Your institute will assign tests to your batch here.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAssigned.map(test => (
                  <AssignedTestCard
                    key={test.id}
                    test={test}
                    onStart={() => { window.location.href = `/test/${test.id}`; }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* PYQ / Chapter-wise / Mock Tests Tab */}
        {activeType !== "assigned" && activeType !== "topic-wise" && activeType !== "resources" && (
          <>
            <div className="flex justify-between items-center mb-4 px-1 select-none">
              <span className="text-[11px] font-sans text-t-secondary uppercase tracking-widest">Showing <strong className="text-t-primary">{filtered.length}</strong> tests</span>
            </div>

            {loading ? (
              <TestCardsSkeleton />
            ) : error ? (
              <div className="card text-center py-20"><div className="text-4xl mb-4">⚠️</div><p className="font-semibold text-[13px] text-primary-03">{error}</p></div>
            ) : filtered.length === 0 ? (
              <div className="card text-center py-20"><div className="text-4xl mb-4">📋</div><h3 className="font-semibold text-[14px] text-t-primary mb-1">No tests found</h3></div>
            ) : (
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {filtered.map(paper => (
                  <TestCard key={paper.id} paper={paper} isAdmin={isAdmin}
                    onDelete={() => handleDelete(paper.id, paper.title)}
                    onStart={(mode) => { window.location.href = `/test/${paper.id}?mode=${mode}`; }} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="block text-sm font-semibold text-t-secondary">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3 text-sm font-medium text-t-primary"><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function ResourceCard({ resource }: { resource: Resource }) {
  const body = <><div className="text-[11px] font-bold uppercase tracking-wider text-primary-01">{resource.resource_type}</div><h3 className="mt-2 text-base font-bold text-t-primary">{resource.title}</h3>{(resource.description || resource.content) && <p className="mt-2 line-clamp-3 text-sm text-t-secondary">{resource.description || resource.content}</p>}<p className="mt-4 text-xs font-semibold text-t-secondary">{[resource.subject, resource.chapter, resource.topic].filter(Boolean).join(" · ") || "General material"}</p></>;
  return resource.resource_url ? <a href={resource.resource_url} target="_blank" rel="noreferrer" className="card block p-5 transition-colors hover:bg-b-surface2">{body}</a> : <article className="card p-5">{body}</article>;
}

function formatDate(iso: string | null) {
  if (!iso) return "No date set";
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AssignedTestCard({ test, onStart }: { test: AssignedTest; onStart: () => void }) {
  const scheduledDate = test.scheduled_at ? new Date(test.scheduled_at) : null;
  const now = new Date();
  const isUpcoming = scheduledDate ? scheduledDate > now : false;
  const isLive = scheduledDate ? scheduledDate <= now : true;

  return (
    <div className="group relative flex flex-col justify-between bg-b-surface2 p-5 rounded-[20px] border border-s-stroke2 hover:border-t-secondary/30 transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-violet-500/[0.03] to-blue-500/[0.03] rounded-[20px]" />

      <div className="relative z-10">
        {/* Status badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
            isUpcoming
              ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          }`}>
            {isUpcoming ? <RiLockLine size={10} /> : <RiPlayCircleLine size={10} />}
            {isUpcoming ? "Upcoming" : "Take Now"}
          </span>
          <span className="inline-flex text-[10px] font-sans font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-b-surface2 text-t-secondary">
            Mock Test
          </span>
        </div>

        <h3 className="font-sans font-bold text-[16px] leading-[1.35] text-t-primary mb-4 tracking-[-0.01em] line-clamp-2">
          {test.title}
        </h3>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-sans font-medium text-t-secondary">
          <span className="flex items-center gap-1.5">
            <RiQuestionLine size={13} className="opacity-70" />
            {test.total_questions} Questions
          </span>
          <span className="flex items-center gap-1.5">
            <RiTimeLine size={13} className="opacity-70" />
            {test.duration_min} Min
          </span>
          {test.total_marks && (
            <span className="flex items-center gap-1.5">
              <RiBarChartBoxLine size={13} className="opacity-70" />
              {test.total_marks} Marks
            </span>
          )}
        </div>

        {/* Scheduled date */}
        <div className="flex items-center gap-1.5 mt-3 text-[12px] font-sans font-medium text-t-secondary">
          <RiCalendarEventLine size={13} className="opacity-70 shrink-0" />
          <span>{formatDate(test.scheduled_at)}</span>
        </div>
      </div>

      <div className="relative z-10 mt-5 pt-4 border-t border-s-stroke2 flex justify-end">
        <button
          onClick={onStart}
          disabled={isUpcoming}
          className={`flex items-center gap-1.5 h-9 px-4 rounded-[10px] text-[13px] font-sans font-semibold transition-all active:scale-95 ${
            isUpcoming
              ? "bg-b-surface2 text-t-secondary cursor-not-allowed"
              : "bg-shade-02 text-white hover:opacity-90 cursor-pointer"
          }`}
          title={isUpcoming ? `Available on ${formatDate(test.scheduled_at)}` : "Start test"}
        >
          {isUpcoming ? (
            <><RiLockLine size={14} /> Locked</>
          ) : (
            <><RiPlayCircleLine size={14} /> Start Test</>
          )}
        </button>
      </div>
    </div>
  );
}

function FilterGroup({ label, options, active, onChange, displayMap }: { label: string; options: string[]; active: string; onChange: (v: string) => void; displayMap?: Record<string, string> }) {
  return (
    <div className="flex flex-row items-center gap-2 flex-wrap">
      <span className="text-xs font-sans font-semibold uppercase tracking-wider text-t-secondary mr-1">{label}:</span>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)}
          className={`px-3.5 h-8 rounded-[10px] border text-[11px] font-sans font-semibold transition-all active:scale-95 cursor-pointer uppercase tracking-wider ${active === opt ? "border-t-primary bg-shade-02 text-t-light" : "border-s-stroke2 bg-transparent text-t-secondary hover:border-t-secondary hover:text-t-primary"}`}>
          {displayMap ? (displayMap[opt] ?? opt) : opt}
        </button>
      ))}
    </div>
  );
}

function TestCard({ paper, isAdmin, onDelete, onStart }: { paper: Paper; isAdmin?: boolean; onDelete?: () => void; onStart: (mode: "practice" | "attempt") => void }) {
  const subtitle = paper.test_type === "pyq"
    ? `${paper.year || ""}${paper.shift ? ` · ${paper.shift}` : ""}`.trim() || paper.exams?.full_name || ""
    : paper.subject ? `${paper.subject}${paper.chapter ? ` · ${paper.chapter}` : ""}` : paper.exams?.full_name || "";

  return (
    <div className="group relative flex w-full flex-col justify-between overflow-hidden rounded-[24px] border border-s-stroke2/40 bg-b-surface2 p-5 transition-all duration-300 select-none sm:p-[22px]">
      <div className="relative z-10">
        <h3 className="font-sans font-bold text-[17px] leading-[1.3] text-t-primary mb-1.5 tracking-[-0.01em]">{paper.title}</h3>
        {subtitle && subtitle !== "null" && <p className="text-[13px] font-sans font-medium text-t-secondary">{subtitle}</p>}
        <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 mt-5 mb-1 text-[12.5px] font-sans font-medium text-t-secondary">
          <span className="flex items-center gap-1.5"><RiQuestionLine size={14} className="opacity-70" />{paper.total_questions} Qs</span>
          {paper.duration_min > 0 && <span className="flex items-center gap-1.5"><RiTimeLine size={14} className="opacity-70" />{paper.duration_min} Min</span>}
          <span className="flex items-center gap-1.5"><RiBarChartBoxLine size={14} className="opacity-70" />{paper.total_marks} Marks</span>
        </div>
      </div>
      <div className="relative z-10 mt-5 flex w-full items-center">
        <div className="flex w-full flex-col gap-2">
          {isAdmin && onDelete && (
            <button onClick={onDelete} className="flex h-10 w-full items-center justify-center rounded-[10px] border border-red-200 text-primary-03 transition-all active:scale-95 hover:bg-red-50 sm:w-10" title="Delete">
              <RiDeleteBinLine size={15} />
            </button>
          )}
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <button onClick={() => onStart("practice")} className="flex h-11 w-full items-center justify-center rounded-[8px] border border-s-stroke2 bg-b-surface2 px-3 text-[13px] font-semibold text-t-primary transition-colors active:scale-[0.98] hover:bg-white dark:hover:bg-[#202020] sm:flex-1">Practice Questions</button>
            <button onClick={() => onStart("attempt")} className="flex h-11 w-full items-center justify-center rounded-[8px] border border-[#161616] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] px-3 text-[13px] font-semibold text-white transition-transform active:scale-[0.98] sm:flex-1">Attempt Test</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestCardsSkeleton() {
  return (
    <div aria-label="Loading tests" aria-busy="true" className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex min-h-[236px] flex-col justify-between rounded-[24px] border border-s-stroke2/40 bg-b-surface2 p-5 sm:p-[22px]">
          <div className="animate-pulse">
            <div className="h-5 w-2/3 rounded-md bg-b-surface1" />
            <div className="mt-3 h-3 w-1/3 rounded-md bg-b-surface1" />
            <div className="mt-7 flex gap-4"><div className="h-3 w-14 rounded bg-b-surface1" /><div className="h-3 w-14 rounded bg-b-surface1" /><div className="h-3 w-16 rounded bg-b-surface1" /></div>
          </div>
          <div className="mt-5 flex gap-2">
            <div className="h-11 flex-1 rounded-[8px] bg-b-surface1" />
            <div className="h-11 flex-1 rounded-[8px] bg-b-surface1" />
          </div>
        </div>
      ))}
    </div>
  );
}
