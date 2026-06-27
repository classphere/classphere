"use client";

import { useState, useRef, useCallback } from "react";
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
      const token = localStorage.getItem("auth_token") ?? "";

      const body = {
        exam:       form.exam,
        test_type:  form.test_type,
        title:      form.title,
        subject:    form.subject || null,
        chapter:    form.chapter || null,
        year:       form.year    ? parseInt(form.year)     : null,
        shift:      form.shift   || null,
        duration:   parseInt(form.duration),
        marks:      parseInt(form.marks),
        difficulty: form.difficulty,
        questions:  parsedQuestions,
      };

      const res = await fetch(`${API_BASE}/superadmin/upload-questions`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setResultMsg(`✅ ${data.message}`);
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

      <main className="mx-auto w-full max-w-[900px] px-4 pb-16 pt-6 md:px-6">

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-sans text-[#7B7B7B] hover:text-[#101010] dark:hover:text-t-primary transition-colors mb-6 cursor-pointer"
        >
          <RiArrowLeftLine size={16} /> Back
        </button>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-6 p-1 bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-2xl w-fit select-none">
          {(["single", "bulk"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-sans font-semibold transition-all cursor-pointer capitalize ${
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
        <div className="flex flex-col gap-6">

          {/* ── Section 1: Exam Metadata ─────────────────────────────────── */}
          <div className="p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[#101010] dark:text-t-primary"><RiDatabase2Line size={20} /></span>
              <h2 className="font-sans font-semibold text-[18px] text-[#101010] dark:text-t-primary m-0">
                Paper Metadata
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Exam */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B7B7B] mb-2">Exam *</label>
                <div className="grid grid-cols-2 gap-2">
                  {EXAMS.map(e => (
                    <button
                      key={e.code}
                      onClick={() => setField("exam", e.code)}
                      className={`h-10 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        form.exam === e.code
                          ? "border-[#101010] bg-[#101010] text-[#FDFDFD] dark:border-t-primary dark:bg-t-primary dark:text-b-surface1"
                          : "border-[#E2E2E2] dark:border-s-stroke2 bg-transparent text-[#727272] hover:border-[#727272] hover:text-[#101010]"
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B7B7B] mb-2">Test Type *</label>
                <div className="flex flex-col gap-2">
                  {TEST_TYPES.map(t => (
                    <button
                      key={t.code}
                      onClick={() => setField("test_type", t.code)}
                      className={`h-10 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        form.test_type === t.code
                          ? "border-[#101010] bg-[#101010] text-[#FDFDFD] dark:border-t-primary dark:bg-t-primary dark:text-b-surface1"
                          : "border-[#E2E2E2] dark:border-s-stroke2 bg-transparent text-[#727272] hover:border-[#727272] hover:text-[#101010]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B7B7B] mb-2">Paper Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setField("title", e.target.value)}
                  placeholder='e.g., "JEE Main 2024 — 27 Jan Shift 1"'
                  className="w-full h-11 px-4 border border-[#E2E2E2] dark:border-s-stroke2 rounded-xl bg-transparent text-sm font-sans text-[#101010] dark:text-t-primary placeholder-[#7B7B7B] focus:border-[#727272] outline-none transition-all"
                />
              </div>

              {/* Subject — shown for all types if exam is set */}
              {subjects.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B7B7B] mb-2">
                    Subject {isChapterWise ? "*" : "(optional)"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map(s => (
                      <button
                        key={s}
                        onClick={() => setField("subject", s)}
                        className={`px-3.5 h-8 rounded-full border text-[11px] font-semibold transition-all cursor-pointer uppercase tracking-wider ${
                          form.subject === s
                            ? "border-[#101010] bg-[#101010] text-[#FDFDFD] dark:border-t-primary dark:bg-t-primary dark:text-b-surface1"
                            : "border-[#E2E2E2] dark:border-s-stroke2 bg-transparent text-[#727272] hover:border-[#727272]"
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
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B7B7B] mb-2">Chapter</label>
                  <input
                    type="text"
                    value={form.chapter}
                    onChange={e => setField("chapter", e.target.value)}
                    placeholder="e.g., Work, Energy and Power"
                    className="w-full h-11 px-4 border border-[#E2E2E2] dark:border-s-stroke2 rounded-xl bg-transparent text-sm font-sans text-[#101010] dark:text-t-primary placeholder-[#7B7B7B] focus:border-[#727272] outline-none transition-all"
                  />
                </div>
              )}

              {/* Year & Shift — only for PYQs */}
              {isPYQ && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B7B7B] mb-2">Year</label>
                    <input
                      type="number"
                      value={form.year}
                      onChange={e => setField("year", e.target.value)}
                      placeholder="e.g., 2024"
                      className="w-full h-11 px-4 border border-[#E2E2E2] dark:border-s-stroke2 rounded-xl bg-transparent text-sm font-sans text-[#101010] dark:text-t-primary placeholder-[#7B7B7B] focus:border-[#727272] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B7B7B] mb-2">Shift</label>
                    <input
                      type="text"
                      value={form.shift}
                      onChange={e => setField("shift", e.target.value)}
                      placeholder="e.g., 27 Jan – Shift 1"
                      className="w-full h-11 px-4 border border-[#E2E2E2] dark:border-s-stroke2 rounded-xl bg-transparent text-sm font-sans text-[#101010] dark:text-t-primary placeholder-[#7B7B7B] focus:border-[#727272] outline-none transition-all"
                    />
                  </div>
                </>
              )}

              {/* Duration */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B7B7B] mb-2">Duration (minutes) *</label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={e => setField("duration", e.target.value)}
                  className="w-full h-11 px-4 border border-[#E2E2E2] dark:border-s-stroke2 rounded-xl bg-transparent text-sm font-sans text-[#101010] dark:text-t-primary focus:border-[#727272] outline-none transition-all"
                />
              </div>

              {/* Total Marks */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B7B7B] mb-2">Total Marks *</label>
                <input
                  type="number"
                  value={form.marks}
                  onChange={e => setField("marks", e.target.value)}
                  className="w-full h-11 px-4 border border-[#E2E2E2] dark:border-s-stroke2 rounded-xl bg-transparent text-sm font-sans text-[#101010] dark:text-t-primary focus:border-[#727272] outline-none transition-all"
                />
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7B7B7B] mb-2">Difficulty *</label>
                <div className="flex flex-row gap-2">
                  {DIFFICULTY.map(d => (
                    <button
                      key={d}
                      onClick={() => setField("difficulty", d)}
                      className={`flex-1 h-10 rounded-xl border text-sm font-semibold capitalize transition-all cursor-pointer ${
                        form.difficulty === d
                          ? "border-[#101010] bg-[#101010] text-[#FDFDFD] dark:border-t-primary dark:bg-t-primary dark:text-b-surface1"
                          : "border-[#E2E2E2] dark:border-s-stroke2 bg-transparent text-[#727272] hover:border-[#727272]"
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
          <div className="p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[#101010] dark:text-t-primary"><RiFileList3Line size={20} /></span>
              <h2 className="font-sans font-semibold text-[18px] text-[#101010] dark:text-t-primary m-0">
                Question JSON File
              </h2>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed rounded-[24px] cursor-pointer transition-all ${
                parseError
                  ? "border-red-300 bg-red-50 dark:bg-red-900/10"
                  : parsedQuestions
                  ? "border-green-300 bg-green-50 dark:bg-green-900/10"
                  : "border-[#E2E2E2] dark:border-s-stroke2 bg-[#F9F9F9] dark:bg-b-surface1/40 hover:border-[#727272] hover:bg-[#F5F5F5]"
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
                  <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <RiCheckLine size={28} className="text-green-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-[#101010] dark:text-t-primary text-sm">{fileName}</p>
                    <p className="text-xs text-green-600 mt-1 font-semibold">
                      {parsedQuestions.length} questions parsed successfully
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setParsedQuestions(null); setFileName(null); }}
                    className="flex items-center gap-1 text-xs text-[#7B7B7B] hover:text-red-500 transition-colors"
                  >
                    <RiCloseLine size={14} /> Remove file
                  </button>
                </>
              ) : parseError ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <RiAlertLine size={28} className="text-red-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-red-500 text-sm">{parseError}</p>
                    <p className="text-xs text-[#7B7B7B] mt-1">Click to try another file</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-[#EFEFEF] dark:bg-b-surface1 flex items-center justify-center">
                    <RiUploadCloud2Line size={28} className="text-[#7B7B7B]" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-[#101010] dark:text-t-primary text-sm">
                      Drop your JSON file here
                    </p>
                    <p className="text-xs text-[#7B7B7B] mt-1">
                      or click to browse · Must be an array of question objects
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* JSON Schema hint */}
            <div className="mt-4 p-4 rounded-2xl bg-[#F9F9F9] dark:bg-b-surface1/40 border border-s-stroke2/20">
              <p className="text-xs font-semibold text-[#7B7B7B] uppercase tracking-wider mb-2">Required JSON Schema</p>
              <pre className="text-xs text-[#7B7B7B] font-mono leading-relaxed overflow-x-auto">{`[
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
            <div className={`p-4 rounded-2xl border text-sm font-semibold ${
              status === "success"
                ? "bg-green-50 dark:bg-green-900/10 border-green-200 text-green-700"
                : "bg-red-50 dark:bg-red-900/10 border-red-200 text-red-600"
            }`}>
              {resultMsg}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.back()}
              className="h-11 px-6 border border-[#E2E2E2] dark:border-s-stroke2 rounded-xl text-sm font-semibold text-[#727272] hover:border-[#727272] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!canUpload || status === "loading"}
              className={`flex items-center gap-2 h-11 px-8 rounded-xl text-sm font-semibold transition-all ${
                canUpload && status !== "loading"
                  ? "bg-[#101010] dark:bg-t-primary text-[#FDFDFD] dark:text-b-surface1 hover:bg-[#202020] cursor-pointer active:scale-[0.98]"
                  : "bg-[#E2E2E2] dark:bg-s-stroke2/40 text-[#7B7B7B] cursor-not-allowed"
              }`}
            >
              {status === "loading" ? (
                <><RiLoader4Line size={16} className="animate-spin" /> Uploading…</>
              ) : (
                <><RiUploadCloud2Line size={16} /> Upload to Database</>
              )}
            </button>
          </div>

        </div>
        )} {/* end single upload ternary */}

      </main>
    </>
  );
}
