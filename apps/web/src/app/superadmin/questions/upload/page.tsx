"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import BulkUpload from "./BulkUpload";
import {
  RiUploadCloud2Line,
  RiFileList3Line,
  RiCheckLine,
  RiCloseLine,
  RiAlertLine,
  RiArrowLeftLine,
  RiLoader4Line,
  RiDatabase2Line,
} from "@remixicon/react";

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const EXAMS = [
  { code: "jee-main",     label: "JEE Main" },
  { code: "jee-advanced", label: "JEE Advanced" },
  { code: "neet-ug",      label: "NEET-UG" },
  { code: "ssc-cgl",      label: "SSC CGL" },
];

const TEST_TYPES = [
  { code: "chapter-wise", label: "Chapter-wise Test" },
  { code: "mock-test",    label: "Mock Test" },
  { code: "pyq",          label: "Previous Year Questions (PYQ)" },
];

const DIFFICULTY = ["easy", "medium", "hard"];

// Subject options per exam
const EXAM_SUBJECTS: Record<string, string[]> = {
  "jee-main":     ["Physics", "Chemistry", "Mathematics"],
  "jee-advanced": ["Physics", "Chemistry", "Mathematics"],
  "neet-ug":      ["Physics", "Chemistry", "Biology"],
  "ssc-cgl":      ["Quantitative Aptitude", "General Intelligence & Reasoning", "English Language", "General Awareness"],
};

// ─── Types ────────────────────────────────────────────────────────────────────
type UploadStatus = "idle" | "loading" | "success" | "error";

interface FormState {
  exam:       string;
  test_type:  string;
  title:      string;
  subject:    string;
  chapter:    string;
  year:       string;
  shift:      string;
  duration:   string;
  marks:      string;
  difficulty: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UploadQuestionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  const [form, setForm] = useState<FormState>({
    exam:       "",
    test_type:  "",
    title:      "",
    subject:    "",
    chapter:    "",
    year:       "",
    shift:      "",
    duration:   "180",
    marks:      "300",
    difficulty: "medium",
  });

  const [parsedQuestions, setParsedQuestions] = useState<any[] | null>(null);
  const [parseError, setParseError]           = useState<string | null>(null);
  const [fileName, setFileName]               = useState<string | null>(null);
  const [status, setStatus]                   = useState<UploadStatus>("idle");
  const [resultMsg, setResultMsg]             = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const setField = (key: keyof FormState, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Reset subject when exam changes
      if (key === "exam") next.subject = "";
      return next;
    });
  };

  // ─── File drop/pick handler ─────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".json")) {
      setParseError("Only .json files are supported.");
      setParsedQuestions(null);
      return;
    }
    setFileName(file.name);
    setParseError(null);
    setParsedQuestions(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data)) {
          setParseError("JSON must be an array of questions at the root level.");
          return;
        }
        setParsedQuestions(data);
      } catch {
        setParseError("Invalid JSON — could not parse the file.");
      }
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!parsedQuestions || !form.exam || !form.test_type || !form.title) return;

    setStatus("loading");
    setResultMsg("");

    try {
      const token  = localStorage.getItem("auth_token") ?? "";
      const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || "dev-superadmin-key-2024";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      // Use API key bypass when no real JWT is available (before Supabase auth is wired up)
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const body = {
        exam:       form.exam,
        test_type:  form.test_type,
        title:      form.title,
        subject:    form.subject || null,
        chapter:    form.chapter || null,
        year:       form.year    ? parseInt(form.year)    : null,
        shift:      form.shift   || null,
        duration:   parseInt(form.duration),
        marks:      parseInt(form.marks),
        difficulty: form.difficulty,
        questions:  parsedQuestions,
      };

      const res = await fetch(`${API_BASE}/superadmin/upload-questions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setResultMsg(data.message);
        
        // Reset the form
        setForm({
          exam:       "",
          test_type:  "",
          title:      "",
          subject:    "",
          chapter:    "",
          year:       "",
          shift:      "",
          duration:   "180",
          marks:      "300",
          difficulty: "medium",
        });
        setParsedQuestions(null);
        setFileName(null);
        setParseError(null);

        // Redirect to /tests after 3 seconds
        if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = setTimeout(() => {
          router.push("/tests");
        }, 5000);
      } else {
        setStatus("error");
        setResultMsg(data.message || "Upload failed.");
      }
    } catch (err: any) {
      setStatus("error");
      setResultMsg(err.message || "Network error.");
    }
  };


  const isChapterWise = form.test_type === "chapter-wise";
  const isPYQ         = form.test_type === "pyq";
  const canUpload     = parsedQuestions && form.exam && form.test_type && form.title && !parseError;
  const subjects      = form.exam ? EXAM_SUBJECTS[form.exam] ?? [] : [];

  return (
    <>
      <Navbar
        title="Upload Question Bank"
        subtitle="Single file or bulk drop — tag with exam, type, and subject. Live in Tests Hub instantly."
        breadcrumbs="SuperAdmin > Questions > Upload"
      />

      <main className="mx-auto w-full max-w-[1000px] flex flex-col items-start pb-12 pt-6 gap-6 px-6 bg-transparent">

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[14px] font-sans font-semibold text-[#7B7B7B] hover:text-[#101010] dark:hover:text-t-primary transition-colors cursor-pointer"
        >
          <RiArrowLeftLine size={18} /> Back
        </button>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1.5 bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-lg w-fit select-none">
          {(["single", "bulk"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-lg text-[14px] font-sans font-semibold transition-all cursor-pointer capitalize ${
                activeTab === tab
                  ? "bg-[#FDFDFD] dark:bg-b-surface2 text-[#101010] dark:text-t-primary shadow-[0px_4px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/30"
                  : "bg-transparent text-[#7B7B7B] hover:text-[#101010] dark:hover:text-t-primary"
              }`}
            >
              {tab === "single" ? "Single Upload" : "Bulk Upload"}
            </button>
          ))}
        </div>

        {/* Bulk mode */}
        {activeTab === "bulk" ? (
          <BulkUpload />
        ) : (
        <div className="flex flex-col gap-6 w-full">

          {/* ── Section 1: Exam Metadata ─────────────────────────────────── */}
          <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full">
            <div className="box-hover" />
            
            <div className="relative z-10 flex items-center gap-3 mb-6">
              <span className="text-[#101010] dark:text-t-primary"><RiDatabase2Line size={24} /></span>
              <h2 className="font-sans font-semibold text-[20px] text-[#101010] dark:text-t-primary m-0 tracking-[0.0015em]">
                Paper Metadata
              </h2>
            </div>

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">

              {/* Exam */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Exam *</label>
                <div className="grid grid-cols-2 gap-3">
                  {EXAMS.map(e => (
                    <button
                      key={e.code}
                      onClick={() => setField("exam", e.code)}
                      className={`h-11 rounded-lg border text-[14px] font-semibold transition-all cursor-pointer ${
                        form.exam === e.code
                          ? "border-[#101010] bg-[#101010] text-[#FDFDFD] dark:border-t-primary dark:bg-t-primary dark:text-b-surface1 shadow-sm"
                          : "border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1 text-[#7B7B7B] hover:border-[#101010] dark:hover:border-[#FDFDFD] hover:text-[#101010] dark:hover:text-t-primary"
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Type */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Test Type *</label>
                <div className="flex flex-col gap-3">
                  {TEST_TYPES.map(t => (
                    <button
                      key={t.code}
                      onClick={() => setField("test_type", t.code)}
                      className={`h-11 rounded-lg border text-[14px] font-semibold transition-all cursor-pointer ${
                        form.test_type === t.code
                          ? "border-[#101010] bg-[#101010] text-[#FDFDFD] dark:border-t-primary dark:bg-t-primary dark:text-b-surface1 shadow-sm"
                          : "border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1 text-[#7B7B7B] hover:border-[#101010] dark:hover:border-[#FDFDFD] hover:text-[#101010] dark:hover:text-t-primary"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Title */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Paper Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setField("title", e.target.value)}
                  placeholder='e.g., "JEE Main 2024 — 27 Jan Shift 1"'
                  className="w-full h-12 px-4 border border-s-stroke2/40 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 text-[15px] font-sans text-[#101010] dark:text-t-primary placeholder:text-[#7B7B7B] focus:border-[#101010] dark:focus:border-t-primary outline-none transition-all shadow-inner"
                />
              </div>

              {/* Subject — shown for all types if exam is set */}
              {subjects.length > 0 && (
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">
                    Subject {isChapterWise ? "*" : "(optional)"}
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {subjects.map(s => (
                      <button
                        key={s}
                        onClick={() => setField("subject", s)}
                        className={`px-5 h-10 rounded-lg border text-[13px] font-semibold transition-all cursor-pointer uppercase tracking-wider ${
                          form.subject === s
                            ? "border-[#101010] bg-[#101010] text-[#FDFDFD] dark:border-t-primary dark:bg-t-primary dark:text-b-surface1 shadow-sm"
                            : "border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1 text-[#7B7B7B] hover:border-[#101010] dark:hover:border-[#FDFDFD] hover:text-[#101010] dark:hover:text-t-primary"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapter — only for chapter-wise */}
              {isChapterWise && (
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Chapter</label>
                  <input
                    type="text"
                    value={form.chapter}
                    onChange={e => setField("chapter", e.target.value)}
                    placeholder="e.g., Work, Energy and Power"
                    className="w-full h-12 px-4 border border-s-stroke2/40 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 text-[15px] font-sans text-[#101010] dark:text-t-primary placeholder:text-[#7B7B7B] focus:border-[#101010] dark:focus:border-t-primary outline-none transition-all shadow-inner"
                  />
                </div>
              )}

              {/* Year & Shift — only for PYQs */}
              {isPYQ && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Year</label>
                    <input
                      type="number"
                      value={form.year}
                      onChange={e => setField("year", e.target.value)}
                      placeholder="e.g., 2024"
                      className="w-full h-12 px-4 border border-s-stroke2/40 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 text-[15px] font-sans text-[#101010] dark:text-t-primary placeholder:text-[#7B7B7B] focus:border-[#101010] dark:focus:border-t-primary outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Shift</label>
                    <input
                      type="text"
                      value={form.shift}
                      onChange={e => setField("shift", e.target.value)}
                      placeholder="e.g., 27 Jan – Shift 1"
                      className="w-full h-12 px-4 border border-s-stroke2/40 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 text-[15px] font-sans text-[#101010] dark:text-t-primary placeholder:text-[#7B7B7B] focus:border-[#101010] dark:focus:border-t-primary outline-none transition-all shadow-inner"
                    />
                  </div>
                </>
              )}

              {/* Duration */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Duration (minutes) *</label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={e => setField("duration", e.target.value)}
                  className="w-full h-12 px-4 border border-s-stroke2/40 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 text-[15px] font-sans text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-t-primary outline-none transition-all shadow-inner"
                />
              </div>

              {/* Total Marks */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Total Marks *</label>
                <input
                  type="number"
                  value={form.marks}
                  onChange={e => setField("marks", e.target.value)}
                  className="w-full h-12 px-4 border border-s-stroke2/40 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 text-[15px] font-sans text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-t-primary outline-none transition-all shadow-inner"
                />
              </div>

              {/* Difficulty */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Difficulty *</label>
                <div className="flex flex-row gap-3">
                  {DIFFICULTY.map(d => (
                    <button
                      key={d}
                      onClick={() => setField("difficulty", d)}
                      className={`flex-1 h-11 rounded-lg border text-[14px] font-semibold capitalize transition-all cursor-pointer ${
                        form.difficulty === d
                          ? "border-[#101010] bg-[#101010] text-[#FDFDFD] dark:border-t-primary dark:bg-t-primary dark:text-b-surface1 shadow-sm"
                          : "border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1 text-[#7B7B7B] hover:border-[#101010] dark:hover:border-[#FDFDFD] hover:text-[#101010] dark:hover:text-t-primary"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* ── Section 2: JSON Upload ───────────────────────────────────── */}
          <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full">
            <div className="box-hover" />
            
            <div className="relative z-10 flex items-center gap-3 mb-6">
              <span className="text-[#101010] dark:text-t-primary"><RiFileList3Line size={24} /></span>
              <h2 className="font-sans font-semibold text-[20px] text-[#101010] dark:text-t-primary m-0 tracking-[0.0015em]">
                Question JSON File
              </h2>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`relative z-10 flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                parseError
                  ? "border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.05)]"
                  : parsedQuestions
                  ? "border-[rgba(0,166,86,0.4)] bg-[rgba(0,166,86,0.05)]"
                  : "border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1 hover:border-[#101010] dark:hover:border-t-primary hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/20"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={onFilePick}
              />

              {parsedQuestions ? (
                <>
                  <div className="w-16 h-16 rounded-lg bg-[rgba(0,166,86,0.1)] flex items-center justify-center mb-2">
                    <RiCheckLine size={32} className="text-[#00A656]" />
                  </div>
                  <div className="text-center">
                    <p className="font-sans font-semibold text-[#101010] dark:text-t-primary text-[15px]">{fileName}</p>
                    <p className="font-sans text-[13px] text-[#00A656] mt-1 font-semibold">
                      {parsedQuestions.length} questions parsed successfully
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setParsedQuestions(null); setFileName(null); }}
                    className="flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 border border-[rgba(239,68,68,0.2)] text-[13px] font-semibold text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors shadow-sm"
                  >
                    <RiCloseLine size={16} /> Remove file
                  </button>
                </>
              ) : parseError ? (
                <>
                  <div className="w-16 h-16 rounded-lg bg-[rgba(239,68,68,0.1)] flex items-center justify-center mb-2">
                    <RiAlertLine size={32} className="text-[#EF4444]" />
                  </div>
                  <div className="text-center">
                    <p className="font-sans font-semibold text-[#EF4444] text-[15px]">{parseError}</p>
                    <p className="font-sans text-[13px] text-[#7B7B7B] mt-1 font-medium">Click to try another file</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-lg bg-[#EAEAEA] dark:bg-b-surface2 border border-s-stroke2/40 flex items-center justify-center mb-2 shadow-sm">
                    <RiUploadCloud2Line size={32} className="text-[#7B7B7B]" />
                  </div>
                  <div className="text-center">
                    <p className="font-sans font-semibold text-[#101010] dark:text-t-primary text-[15px]">
                      Drop your JSON file here
                    </p>
                    <p className="font-sans text-[13px] text-[#7B7B7B] mt-1 font-medium">
                      or click to browse · Must be an array of question objects
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* JSON Schema hint */}
            <div className="relative z-10 mt-6 p-5 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1/60 border border-s-stroke2/20">
              <p className="text-[12px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em] mb-3">Required JSON Schema</p>
              <pre className="text-[13px] text-[#7B7B7B] font-mono leading-relaxed overflow-x-auto">{`[
  {
    "id": "uuid-string",          // required — unique ID
    "question_text": "...",       // required
    "options": [                  // required — min 2 items
      { "id": "A", "text": "..." },
      { "id": "B", "text": "..." }
    ],
    "correct_answer": ["A"],      // required
    "explanation": "...",         // optional
    "difficulty": "medium",       // optional
    "subject": "Physics",         // optional (overrides form)
    "chapter": "Kinematics",      // optional (overrides form)
    "distractor_map": { ... },    // optional
    "marking_scheme": { ... }     // optional
  }
]`}</pre>
            </div>
          </div>

          {/* ── Section 3: Result / Upload Button ───────────────────────── */}
          {resultMsg && (
            <div className={`p-4 rounded-lg border text-[14px] font-semibold flex items-center gap-2 shadow-sm ${
              status === "success"
                ? "bg-[rgba(34,197,94,0.05)] border-[rgba(34,197,94,0.3)] text-[#22C55E]"
                : "bg-[rgba(239,68,68,0.05)] border-[rgba(239,68,68,0.3)] text-[#EF4444]"
            }`}>
              {status === "success" ? <RiCheckLine size={18} /> : <RiAlertLine size={18} />}
              {resultMsg}
            </div>
          )}

          <div className="flex justify-end gap-4 w-full mt-2">
            <button
              onClick={() => router.back()}
              className="h-12 px-6 rounded-lg text-[14px] font-semibold text-[#7B7B7B] bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 hover:text-[#101010] dark:hover:text-t-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!canUpload || status === "loading"}
              className={`flex items-center gap-2 h-12 px-8 rounded-lg text-[14px] font-semibold transition-all shadow-sm ${
                canUpload && status !== "loading"
                  ? "bg-[#101010] dark:bg-t-primary text-[#FDFDFD] dark:text-b-surface1 hover:bg-[#202020] cursor-pointer active:scale-[0.98]"
                  : "bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 text-[#7B7B7B] opacity-60 cursor-not-allowed"
              }`}
            >
              {status === "loading" ? (
                <><RiLoader4Line size={18} className="animate-spin" /> Uploading…</>
              ) : (
                <><RiUploadCloud2Line size={18} /> Upload to Database</>
              )}
            </button>
          </div>

        </div>
        )} {/* end single upload ternary */}

      </main>
    </>
  );
}
