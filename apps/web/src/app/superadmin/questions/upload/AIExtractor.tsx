"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  RiUploadCloud2Line, RiCheckLine, RiCloseLine,
  RiAlertLine, RiLoader4Line, RiFileList3Line, RiDatabase2Line,
  RiEdit2Line, RiSave3Line, RiInformationLine, RiEyeLine
} from "@remixicon/react";
import { API_V1_URL } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

const API_BASE = API_V1_URL;

// ─── Config ───────────────────────────────────────────────────────────────────
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

const EXAM_SUBJECTS: Record<string, string[]> = {
  "jee-main":     ["Physics", "Chemistry", "Mathematics"],
  "jee-advanced": ["Physics", "Chemistry", "Mathematics"],
  "neet-ug":      ["Physics", "Chemistry", "Biology"],
  "ssc-cgl":      ["Quantitative Aptitude", "General Intelligence & Reasoning", "English Language", "General Awareness"],
};

interface FormState {
  exam: string;
  test_type: string;
  title: string;
  subject: string;
  chapter: string;
  year: string;
  shift: string;
  duration: string;
  marks: string;
  difficulty: string;
}

export default function AIExtractor() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useAuth();

  const [form, setForm] = useState<FormState>({
    exam: "",
    test_type: "chapter-wise",
    title: "",
    subject: "",
    chapter: "",
    year: "",
    shift: "",
    duration: "180",
    marks: "300",
    difficulty: "medium",
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pagesRange, setPagesRange] = useState<string>(""); // e.g. "1-2"
  
  const [status, setStatus] = useState<"idle" | "extracting" | "success" | "error" | "uploading">("idle");
  const [resultMsg, setResultMsg] = useState<string>("");
  const [extractedQuestions, setExtractedQuestions] = useState<any[] | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const setField = (key: keyof FormState, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === "exam") next.subject = "";
      return next;
    });
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      setResultMsg("Only PDF files are supported.");
      setStatus("error");
      return;
    }
    setPdfFile(file);
    setStatus("idle");
    setResultMsg("");
    setExtractedQuestions(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ─── Trigger AI Extraction ──────────────────────────────────────────────────
  const startExtraction = async () => {
    if (!pdfFile || !form.exam || !form.test_type) return;

    if (!session?.access_token) {
      setStatus("error");
      setResultMsg("Your session has expired. Please sign in again.");
      return;
    }

    setStatus("extracting");
    setResultMsg("");
    setExtractedQuestions(null);
    setEditingIndex(null);

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${session.access_token}`,
      };

      const formData = new FormData();
      formData.append("pdf", pdfFile);
      if (pagesRange.trim()) {
        formData.append("pages", pagesRange.trim());
      }

      const res = await fetch(`${API_BASE}/superadmin/extract-pdf`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setExtractedQuestions(data.data.questions);
        setResultMsg(data.message || "Extraction complete. Verify questions below.");
        
        // Auto-fill paper title from PDF name if blank
        if (!form.title) {
          const defaultTitle = pdfFile.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
          setField("title", defaultTitle);
        }
      } else {
        setStatus("error");
        setResultMsg(data.message || "Extraction failed.");
      }
    } catch (err: any) {
      setStatus("error");
      setResultMsg(err.message || "Network error during extraction.");
    }
  };

  // ─── Save Changes to a Single Question ──────────────────────────────────────
  const handleUpdateQuestion = (index: number, updatedFields: any) => {
    if (!extractedQuestions) return;
    const next = [...extractedQuestions];
    next[index] = { ...next[index], ...updatedFields };
    setExtractedQuestions(next);
    setEditingIndex(null);
  };

  // ─── Upload Parsed Question Bank to DB ──────────────────────────────────────
  const handleFinalUpload = async () => {
    if (!extractedQuestions || !form.exam || !form.test_type || !form.title) return;

    if (!session?.access_token) {
      setStatus("error");
      setResultMsg("Your session has expired. Please sign in again.");
      return;
    }

    setStatus("uploading");
    setResultMsg("");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      };

      const body = {
        exam: form.exam,
        test_type: form.test_type,
        title: form.title,
        subject: form.subject || null,
        chapter: form.chapter || null,
        year: form.year ? parseInt(form.year) : null,
        shift: form.shift || null,
        duration: parseInt(form.duration),
        marks: parseInt(form.marks),
        difficulty: form.difficulty,
        questions: extractedQuestions,
      };

      const res = await fetch(`${API_BASE}/superadmin/upload-questions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setResultMsg(`Success! ${data.message}`);
        setExtractedQuestions(null);
        setPdfFile(null);
        setForm({
          exam: "",
          test_type: "chapter-wise",
          title: "",
          subject: "",
          chapter: "",
          year: "",
          shift: "",
          duration: "180",
          marks: "300",
          difficulty: "medium",
        });

        setTimeout(() => {
          router.push("/superadmin/questions");
        }, 3000);
      } else {
        setStatus("error"); // keeps the questions preview visible
        setResultMsg(data.message || "Final upload failed.");
      }
    } catch (err: any) {
      setStatus("error");
      setResultMsg(err.message || "Network error uploading questions.");
    }
  };

  const isChapterWise = form.test_type === "chapter-wise";
  const isPYQ = form.test_type === "pyq";
  const canExtract = pdfFile && form.exam && form.test_type && status !== "extracting";
  const canUpload = extractedQuestions && extractedQuestions.length > 0 && form.title && status !== "uploading";
  const subjects = form.exam ? EXAM_SUBJECTS[form.exam] ?? [] : [];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Section 1: Extraction Settings ────────────────────────────────────── */}
      <div className="group relative flex flex-col p-6 md:p-8 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] w-full">
        <div className="relative z-10 flex items-center gap-3 mb-6">
          <span className="text-t-primary dark:text-t-primary"><RiDatabase2Line size={24} /></span>
          <h2 className="font-sans font-semibold text-[20px] text-t-primary dark:text-t-primary m-0 tracking-[0.0015em]">
            Extraction Settings
          </h2>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          {/* Exam Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Exam *</label>
            <div className="grid grid-cols-2 gap-3">
              {EXAMS.map(e => (
                <button
                  key={e.code}
                  onClick={() => setField("exam", e.code)}
                  className={`h-11 rounded-[10px] border text-[14px] font-semibold transition-all cursor-pointer ${form.exam === e.code
                      ? "border-t-primary bg-shade-02 text-t-light dark:border-t-primary dark:bg-t-primary dark:text-b-surface1 shadow-sm"
                      : "border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1 text-t-secondary hover:border-t-primary dark:hover:border-s-border hover:text-t-primary dark:hover:text-t-primary"
                    }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Test Type Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Test Type *</label>
            <div className="flex flex-col gap-3">
              {TEST_TYPES.map(t => (
                <button
                  key={t.code}
                  onClick={() => setField("test_type", t.code)}
                  className={`h-11 rounded-[10px] border text-[14px] font-semibold transition-all cursor-pointer ${form.test_type === t.code
                      ? "border-t-primary bg-shade-02 text-t-light dark:border-t-primary dark:bg-t-primary dark:text-b-surface1 shadow-sm"
                      : "border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1 text-t-secondary hover:border-t-primary dark:hover:border-s-border hover:text-t-primary dark:hover:text-t-primary"
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Options */}
          {subjects.length > 0 && (
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
                Subject {isChapterWise ? "*" : "(optional)"}
              </label>
              <div className="flex flex-wrap gap-3">
                {subjects.map(s => (
                  <button
                    key={s}
                    onClick={() => setField("subject", s)}
                    className={`px-5 h-10 rounded-[10px] border text-[13px] font-semibold transition-all cursor-pointer uppercase tracking-wider ${form.subject === s
                        ? "border-t-primary bg-shade-02 text-t-light dark:border-t-primary dark:bg-t-primary dark:text-b-surface1 shadow-sm"
                        : "border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1 text-t-secondary hover:border-t-primary dark:hover:border-s-border hover:text-t-primary dark:hover:text-t-primary"
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chapter */}
          {isChapterWise && (
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Chapter Name *</label>
              <input
                type="text"
                value={form.chapter}
                onChange={e => setField("chapter", e.target.value)}
                placeholder="e.g., Electrostatics"
                className="w-full h-12 px-4 border border-s-stroke2/40 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 text-[15px] font-sans text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-all shadow-inner"
              />
            </div>
          )}

          {/* Year & Shift */}
          {isPYQ && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Year</label>
                <input
                  type="number"
                  value={form.year}
                  onChange={e => setField("year", e.target.value)}
                  placeholder="e.g., 2024"
                  className="w-full h-12 px-4 border border-s-stroke2/40 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 text-[15px] font-sans text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-all shadow-inner"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Shift</label>
                <input
                  type="text"
                  value={form.shift}
                  onChange={e => setField("shift", e.target.value)}
                  placeholder="e.g., 27 Jan – Shift 1"
                  className="w-full h-12 px-4 border border-s-stroke2/40 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 text-[15px] font-sans text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-all shadow-inner"
                />
              </div>
            </>
          )}

          {/* Duration & Total Marks */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Duration (minutes) *</label>
            <input
              type="number"
              value={form.duration}
              onChange={e => setField("duration", e.target.value)}
              className="w-full h-12 px-4 border border-s-stroke2/40 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 text-[15px] font-sans text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-all shadow-inner"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Total Marks *</label>
            <input
              type="number"
              value={form.marks}
              onChange={e => setField("marks", e.target.value)}
              className="w-full h-12 px-4 border border-s-stroke2/40 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 text-[15px] font-sans text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-all shadow-inner"
            />
          </div>

          {/* Difficulty */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Difficulty *</label>
            <div className="flex flex-row gap-3">
              {DIFFICULTY.map(d => (
                <button
                  key={d}
                  onClick={() => setField("difficulty", d)}
                  className={`flex-1 h-11 rounded-[10px] border text-[14px] font-semibold capitalize transition-all cursor-pointer ${form.difficulty === d
                      ? "border-t-primary bg-shade-02 text-t-light dark:border-t-primary dark:bg-t-primary dark:text-b-surface1 shadow-sm"
                      : "border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1 text-t-secondary hover:border-t-primary dark:hover:border-s-border hover:text-t-primary dark:hover:text-t-primary"
                    }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: PDF File Drag & Drop ────────────────────────────────────── */}
      <div className="group relative flex flex-col p-6 md:p-8 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] w-full">
        <div className="relative z-10 flex items-center gap-3 mb-6">
          <span className="text-t-primary dark:text-t-primary"><RiFileList3Line size={24} /></span>
          <h2 className="font-sans font-semibold text-[20px] text-t-primary dark:text-t-primary m-0 tracking-[0.0015em]">
            Select Exam PDF File
          </h2>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className={`relative z-10 flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed rounded-[10px] cursor-pointer transition-all ${
            pdfFile
              ? "border-s-stroke2/40 bg-[rgba(0,166,86,0.05)]"
              : "border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1 hover:border-t-primary dark:hover:border-t-primary hover:bg-s-stroke2 dark:hover:bg-s-stroke2/20"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={onFilePick}
          />

          {pdfFile ? (
            <>
              <div className="w-16 h-16 rounded-[10px] bg-[rgba(0,166,86,0.1)] flex items-center justify-center mb-2">
                <RiCheckLine size={32} className="text-primary-02" />
              </div>
              <div className="text-center">
                <p className="font-sans font-semibold text-t-primary dark:text-t-primary text-[15px]">{pdfFile.name}</p>
                <p className="font-sans text-[13px] text-primary-02 mt-1 font-semibold">
                  PDF selected successfully ({(pdfFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setPdfFile(null); setExtractedQuestions(null); }}
                className="flex items-center gap-1.5 mt-4 px-4 py-2 rounded-[10px] bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/40 text-[13px] font-semibold text-primary-03 hover:bg-[rgba(239,68,68,0.1)] transition-colors shadow-sm"
              >
                <RiCloseLine size={16} /> Remove PDF
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-[10px] bg-s-stroke2 dark:bg-b-surface2 border border-s-stroke2/40 flex items-center justify-center mb-2 shadow-sm">
                <RiUploadCloud2Line size={32} className="text-t-secondary" />
              </div>
              <div className="text-center">
                <p className="font-sans font-semibold text-t-primary dark:text-t-primary text-[15px]">
                  Drop your exam PDF here
                </p>
                <p className="font-sans text-[13px] text-t-secondary mt-1 font-medium">
                  or click to browse · Supports digital or scanned documents
                </p>
              </div>
            </>
          )}
        </div>

        {/* Page Range Input */}
        {pdfFile && (
          <div className="relative z-10 mt-6 flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
              Page Selection (Optional)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={pagesRange}
                onChange={e => setPagesRange(e.target.value)}
                placeholder="e.g., 1-2, 5, 8-10 (leave blank to extract all pages)"
                className="flex-1 h-12 px-4 border border-s-stroke2/40 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 text-[15px] font-sans text-t-primary dark:text-t-primary focus:border-t-primary outline-none transition-all shadow-inner"
              />
              <button
                onClick={startExtraction}
                disabled={!canExtract}
                className={`h-12 px-8 rounded-[10px] text-[14px] font-semibold transition-all shadow-sm ${
                  canExtract
                    ? "bg-shade-02 dark:bg-t-primary text-t-light dark:text-b-surface1 hover:bg-shade-04 cursor-pointer"
                    : "bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 text-t-secondary opacity-60 cursor-not-allowed"
                }`}
              >
                {status === "extracting" ? (
                  <span className="flex items-center gap-2">
                    <RiLoader4Line size={16} className="animate-spin" /> Extracting…
                  </span>
                ) : (
                  "Intelligent Extraction"
                )}
              </button>
            </div>
            <p className="text-[12px] text-t-secondary font-medium mt-1">
              💡 Extracting a specific range of pages (e.g. 1-2) is faster and uses less tokens during verification.
            </p>
          </div>
        )}
      </div>

      {/* ── Status Messages ───────────────────────────────────────────────────── */}
      {resultMsg && (
        <div className={`p-4 rounded-[10px] border text-[14px] font-semibold flex items-center gap-2 shadow-sm ${
          status === "success"
            ? "bg-[rgba(34,197,94,0.05)] border-s-stroke2/40 text-[#22C55E]"
            : status === "extracting"
              ? "bg-[rgba(255,159,10,0.05)] border-s-stroke2/40 text-[#FF9F0A]"
              : "bg-[rgba(239,68,68,0.05)] border-s-stroke2/40 text-primary-03"
        }`}>
          {status === "success" ? (
            <RiCheckLine size={18} />
          ) : status === "extracting" ? (
            <RiLoader4Line size={18} className="animate-spin" />
          ) : (
            <RiAlertLine size={18} />
          )}
          <span>{resultMsg}</span>
        </div>
      )}

      {/* ── Section 3: Extracted Questions Preview ────────────────────────────── */}
      {extractedQuestions && extractedQuestions.length > 0 && (
        <div className="group relative flex flex-col p-6 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] w-full">
          <div className="relative z-10 flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
              <RiEyeLine size={20} className="text-t-primary" />
              <h3 className="font-sans font-semibold text-[18px] text-t-primary m-0">
                Parsed Questions Preview ({extractedQuestions.length})
              </h3>
            </div>
            <p className="text-[13px] text-t-secondary font-medium">
              💡 Double check math formula rendering, question texts, correct options and values below.
            </p>
          </div>

          {/* Paper Title input for submission */}
          <div className="relative z-10 flex flex-col gap-2 mb-6 px-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
              Final Paper Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setField("title", e.target.value)}
              placeholder="e.g., JEE Main 2024 Practice Set 1"
              className="w-full h-12 px-4 border border-s-stroke2/40 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 text-[15px] font-sans text-t-primary focus:border-t-primary outline-none transition-all shadow-inner font-semibold"
            />
          </div>

          <div className="relative z-10 flex flex-col gap-6 w-full">
            {extractedQuestions.map((q, idx) => {
              const isEditing = editingIndex === idx;

              return (
                <div
                  key={idx}
                  className="flex flex-col border border-s-stroke2/40 rounded-[12px] bg-b-surface1 p-6 transition-all hover:shadow-md"
                >
                  {/* Header */}
                  <div className="flex justify-between items-center pb-4 border-b border-s-stroke2/20 mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-3 py-1 bg-shade-02 text-t-light dark:bg-b-surface2 dark:text-t-primary text-[12px] font-sans font-bold rounded-full">
                        Q{q.question_number}
                      </span>
                      <span className="text-[13px] text-t-secondary font-semibold uppercase tracking-wider">
                        Type: {q.question_type}
                      </span>
                      <span className="text-[13px] text-t-secondary font-semibold">
                        · {q.subject}
                      </span>
                      {q.chapter && (
                        <span className="text-[13px] text-t-tertiary">
                          · {q.chapter}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setEditingIndex(isEditing ? null : idx)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 border border-s-stroke2/40 rounded-[8px] text-[13px] font-semibold text-t-secondary hover:text-t-primary hover:bg-s-stroke2/50 transition-all cursor-pointer shadow-sm"
                    >
                      {isEditing ? (
                        <><RiCloseLine size={16} /> Cancel</>
                      ) : (
                        <><RiEdit2Line size={16} /> Edit Question</>
                      )}
                    </button>
                  </div>

                  {/* Body: Editing Form vs Normal Render */}
                  {isEditing ? (
                    <EditQuestionForm
                      question={q}
                      onSave={(fields) => handleUpdateQuestion(idx, fields)}
                    />
                  ) : (
                    <div className="flex flex-col gap-4 text-t-primary">
                      {/* Text */}
                      <div className="text-[15px] font-sans font-medium leading-relaxed pr-2">
                        <MarkdownRenderer>{q.question_text || ""}</MarkdownRenderer>
                      </div>

                      {/* Options */}
                      {Array.isArray(q.options) && q.options.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          {q.options.map((opt: any) => (
                            <div
                              key={opt.id}
                              className="flex items-start gap-3 p-3.5 rounded-[10px] border border-s-stroke2/40 bg-b-surface2/30"
                            >
                              <span className="shrink-0 font-sans font-bold text-[14px] text-t-secondary mt-0.5">
                                ({opt.id})
                              </span>
                              <div className="text-[14px] font-sans font-medium text-t-primary leading-normal">
                                <MarkdownRenderer>{opt.text || ""}</MarkdownRenderer>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Answers & Solution Details */}
                      <div className="mt-4 p-4 rounded-[10px] bg-b-surface2/50 border border-s-stroke2/10 flex flex-col gap-2">
                        <p className="text-[13px] font-sans font-bold text-t-secondary">
                          Correct Answer:{" "}
                          <span className="text-primary-02 uppercase font-black tracking-wide ml-1">
                            {Array.isArray(q.correct_answer)
                              ? q.correct_answer.join(", ")
                              : q.correct_answer || "N/A"}
                          </span>
                        </p>
                        {q.explanation && (
                          <div className="text-[13px] font-sans font-medium text-t-secondary leading-relaxed mt-2 pt-2 border-t border-s-stroke2/10">
                            <strong>Explanation:</strong>
                            <div className="mt-1">
                              <MarkdownRenderer>{q.explanation}</MarkdownRenderer>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="relative z-10 flex justify-end gap-4 w-full mt-8 border-t border-s-stroke2/20 pt-6 px-2">
            <button
              onClick={handleFinalUpload}
              disabled={!canUpload}
              className={`flex items-center gap-2 h-12 px-8 rounded-[10px] text-[14px] font-semibold transition-all shadow-sm ${
                canUpload
                  ? "bg-shade-02 dark:bg-t-primary text-t-light dark:text-b-surface1 hover:bg-shade-04 cursor-pointer"
                  : "bg-b-surface1 border border-s-stroke2/40 text-t-secondary opacity-60 cursor-not-allowed"
              }`}
            >
              {status === "uploading" ? (
                <><RiLoader4Line size={18} className="animate-spin" /> Uploading...</>
              ) : (
                <><RiDatabase2Line size={18} /> Upload {extractedQuestions.length} Questions to DB</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Question Editing Inner Form Component ──────────────────────────────────
interface EditFormProps {
  question: any;
  onSave: (updatedFields: any) => void;
}

function EditQuestionForm({ question, onSave }: EditFormProps) {
  const [text, setText] = useState(question.question_text || "");
  const [correctAnswer, setCorrectAnswer] = useState(
    Array.isArray(question.correct_answer)
      ? question.correct_answer.join(", ")
      : question.correct_answer || ""
  );
  const [explanation, setExplanation] = useState(question.explanation || "");
  const [options, setOptions] = useState<any[]>(question.options || []);

  const handleOptionTextChange = (id: string, newText: string) => {
    setOptions(prev =>
      prev.map(opt => (opt.id === id ? { ...opt, text: newText } : opt))
    );
  };

  const handleSave = () => {
    onSave({
      question_text: text,
      correct_answer: correctAnswer.split(",").map((a: string) => a.trim().toUpperCase()).filter(Boolean),
      explanation,
      options,
    });
  };

  return (
    <div className="flex flex-col gap-5 text-t-primary">
      {/* Text Area for Question Text */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-bold text-t-secondary uppercase tracking-[0.02em]">Question Text (LaTeX supported)</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          className="w-full p-4 border border-s-stroke2/40 rounded-[10px] bg-b-surface2/30 text-[14px] font-mono focus:border-t-primary outline-none transition-all shadow-inner"
        />
      </div>

      {/* Inputs for MCQ Options */}
      {options.length > 0 && (
        <div className="flex flex-col gap-3">
          <label className="text-[12px] font-bold text-t-secondary uppercase tracking-[0.02em]">Edit Options</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map(opt => (
              <div key={opt.id} className="flex gap-3 items-center">
                <span className="font-bold text-[14px] text-t-secondary">({opt.id})</span>
                <input
                  type="text"
                  value={opt.text || ""}
                  onChange={e => handleOptionTextChange(opt.id, e.target.value)}
                  className="flex-1 h-10 px-3 border border-s-stroke2/40 rounded-[8px] bg-b-surface2/30 text-[14px] focus:border-t-primary outline-none transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answer Key */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-bold text-t-secondary uppercase tracking-[0.02em]">Correct Answer (comma-separated for multi-select, e.g. A, B)</label>
        <input
          type="text"
          value={correctAnswer}
          onChange={e => setCorrectAnswer(e.target.value)}
          className="w-full h-10 px-3 border border-s-stroke2/40 rounded-[8px] bg-b-surface2/30 text-[14px] focus:border-t-primary outline-none transition-all font-bold text-primary-02 tracking-wider"
        />
      </div>

      {/* Solution Explanation */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-bold text-t-secondary uppercase tracking-[0.02em]">Explanation / Solution (LaTeX supported)</label>
        <textarea
          value={explanation}
          onChange={e => setExplanation(e.target.value)}
          rows={3}
          className="w-full p-4 border border-s-stroke2/40 rounded-[10px] bg-b-surface2/30 text-[14px] font-mono focus:border-t-primary outline-none transition-all shadow-inner"
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="flex items-center justify-center gap-2 h-11 px-6 rounded-[8px] text-[13px] font-semibold text-t-light bg-shade-02 hover:bg-shade-04 active:scale-[0.98] transition-all cursor-pointer w-fit self-end shadow-sm"
      >
        <RiSave3Line size={16} /> Save Question Changes
      </button>
    </div>
  );
}
