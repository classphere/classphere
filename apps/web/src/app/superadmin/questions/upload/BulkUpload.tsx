"use client";

import { useState, useRef, useCallback } from "react";
import {
  RiUploadCloud2Line, RiCheckLine, RiCloseLine,
  RiAlertLine, RiLoader4Line, RiFileList3Line, RiInformationLine,
} from "@remixicon/react";
import { API_V1_URL } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";

const API_BASE = API_V1_URL;

// ─── Subject options per exam ─────────────────────────────────────────────────
const EXAM_SUBJECTS: Record<string, string[]> = {
  "jee-main":     ["Physics", "Chemistry", "Mathematics"],
  "jee-advanced": ["Physics", "Chemistry", "Mathematics"],
  "neet-ug":      ["Physics", "Chemistry", "Biology", "Botany", "Zoology"],
  "ssc-cgl":      ["General Intelligence & Reasoning", "General Awareness", "Quantitative Aptitude", "English Language"],
};

// Auto-detect subject from filename e.g. "Physics_Work_Energy.json" → "Physics"
function detectSubject(name: string): string {
  const parts = name.split("_");
  const known = ["Physics", "Chemistry", "Biology", "Botany", "Zoology", "Mathematics",
    "Quantitative", "General", "English"];
  return known.find(s => parts[0].startsWith(s)) ?? parts[0];
}

// Auto-detect chapter from filename e.g. "Physics_Work_Energy_and_Power.json"
function detectChapter(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")   // remove extension
    .replace(/^[^_]+_/, "")    // strip "Physics_"
    .replace(/_/g, " ");
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkFile {
  file: File;
  name: string;
  title: string;          // user-entered test name (pre-filled from filename)
  subject: string;        // per-file (used for non-chapter-wise)
  chapter: string;        // per-file (used for non-chapter-wise)
  questions: any[] | null;
  parseError: string | null;
  status: "pending" | "uploading" | "done" | "error";
  message: string;
}

interface SharedMeta {
  exam: string;
  test_type: string;
  duration: string;
  marks: string;
  difficulty: string;
  subject: string;        // shared subject for chapter-wise batch
  chapter: string;        // shared chapter for chapter-wise batch
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMS = [
  { code: "jee-main",     label: "JEE Main" },
  { code: "jee-advanced", label: "JEE Advanced" },
  { code: "neet-ug",      label: "NEET-UG" },
  { code: "ssc-cgl",      label: "SSC CGL" },
];
const TEST_TYPES = [
  { code: "chapter-wise", label: "Chapter-wise" },
  { code: "mock-test",    label: "Mock Test" },
  { code: "pyq",          label: "PYQ" },
  { code: "ncert",        label: "Ncert Questions" },
];


// ─── Pill button ─────────────────────────────────────────────────────────────

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 h-10 rounded-[10px] border text-[13px] font-semibold transition-all cursor-pointer uppercase tracking-wider ${
        active
          ? "border-t-primary bg-shade-02 text-t-light dark:border-t-primary dark:bg-t-primary dark:text-b-surface1 shadow-sm"
          : "border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1 text-t-secondary hover:border-t-primary dark:hover:border-s-border hover:text-t-primary dark:hover:text-t-primary"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const { session } = useAuth();

  const [meta, setMeta] = useState<SharedMeta>({
    exam: "", test_type: "chapter-wise", duration: "60", marks: "200",
    difficulty: "medium", subject: "", chapter: "",
  });

  const setMetaField = (k: keyof SharedMeta, v: string) => {
    setMeta(prev => {
      const next = { ...prev, [k]: v };
      if (k === "exam") {
        next.subject = "";
        if (v === "ssc-cgl" && next.test_type === "ncert") {
          next.test_type = "chapter-wise";
        }
      }
      return next;
    });
  };

  // ── File parsing ─────────────────────────────────────────────────────────────

  const parseFile = (file: File): Promise<BulkFile> =>
    new Promise(resolve => {
      const subject = detectSubject(file.name);
      const chapter = detectChapter(file.name);
      const entry: BulkFile = {
        file,
        name: file.name,
        title: `${subject} — ${chapter}`,   // pre-filled, fully editable
        subject,
        chapter,
        questions: null,
        parseError: null,
        status: "pending",
        message: "",
      };
      if (!file.name.endsWith(".json")) {
        resolve({ ...entry, parseError: "Not a JSON file" });
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (!Array.isArray(data)) {
            resolve({ ...entry, parseError: "JSON must be an array" });
          } else {
            resolve({ ...entry, questions: data });
          }
        } catch {
          resolve({ ...entry, parseError: "Invalid JSON" });
        }
      };
      reader.readAsText(file);
    });

  const handleFiles = useCallback(async (newFiles: FileList) => {
    const parsed = await Promise.all(Array.from(newFiles).map(parseFile));
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...parsed.filter(f => !existingNames.has(f.name))];
    });
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const removeFile = (name: string) =>
    setFiles(prev => prev.filter(f => f.name !== name));

  const updateFile = (name: string, patch: Partial<BulkFile>) =>
    setFiles(prev => prev.map(f => f.name === name ? { ...f, ...patch } : f));

  // ── Upload ────────────────────────────────────────────────────────────────────

  const uploadAll = async () => {
    const ready = files.filter(f => f.questions && !f.parseError && f.status === "pending");
    if (!ready.length || !meta.exam || !meta.test_type) return;

    if (!session?.access_token) {
      for (const file of ready) {
        updateFile(file.name, { status: "error", message: "Your session has expired. Please sign in again." });
      }
      return;
    }
    setUploading(true);

    for (const f of ready) {
      updateFile(f.name, { status: "uploading" });
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        };

        const isChapterWise = meta.test_type === "chapter-wise" || meta.test_type === "ncert";

        const res = await fetch(`${API_BASE}/superadmin/upload-questions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            exam:       meta.exam,
            test_type:  meta.test_type,
            title:      f.title,                              // user-entered name
            subject:    isChapterWise ? meta.subject : f.subject, // shared vs per-file
            chapter:    isChapterWise ? meta.chapter : f.chapter,
            duration:   parseInt(meta.duration),
            marks:      parseInt(meta.marks),
            difficulty: meta.difficulty,
            questions:  f.questions,
          }),
        });
        const data = await res.json();
        updateFile(f.name, {
          status: data.success ? "done" : "error",
          message: data.message ?? "",
        });
      } catch (err: any) {
        updateFile(f.name, { status: "error", message: err.message });
      }
    }
    setUploading(false);
  };

  // ── Derived state ─────────────────────────────────────────────────────────────

  const isChapterWise    = meta.test_type === "chapter-wise" || meta.test_type === "ncert";
  const subjectOptions   = EXAM_SUBJECTS[meta.exam] ?? [];

  const pendingFiles     = files.filter(f => f.status === "pending" && f.questions);
  const pendingCount     = pendingFiles.length;
  const doneCount        = files.filter(f => f.status === "done").length;
  const errorCount       = files.filter(f => f.status === "error" || f.parseError).length;

  const titlesFilledCount = pendingFiles.filter(f => f.title.trim() !== "").length;
  const allTitlesFilled   = pendingCount > 0 && titlesFilledCount === pendingCount;
  const chapterWiseMet    = !isChapterWise || (meta.subject !== "");
  const canUpload         = !uploading && pendingCount > 0 && meta.exam !== "" && allTitlesFilled && chapterWiseMet;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* ── Shared Metadata ─────────────────────────────────────────────────── */}
      <div className="group relative flex flex-col p-6 md:p-8 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] w-full">

        <p className="relative z-10 text-[13px] font-semibold uppercase tracking-[0.02em] text-t-secondary mb-6">
          Shared Metadata — applies to all files
        </p>

        <div className="relative z-10 flex flex-wrap gap-8">
          {/* Exam */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Exam *</label>
            <div className="flex flex-wrap gap-3">
              {EXAMS.map(e => (
                <Pill key={e.code} active={meta.exam === e.code} onClick={() => setMetaField("exam", e.code)}>
                  {e.label}
                </Pill>
              ))}
            </div>
          </div>

          {/* Test Type */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Test Type *</label>
            <div className="flex flex-wrap gap-3">
              {TEST_TYPES.filter(t => !(meta.exam === "ssc-cgl" && t.code === "ncert")).map(t => (
                <Pill key={t.code} active={meta.test_type === t.code} onClick={() => setMetaField("test_type", t.code)}>
                  {t.label}
                </Pill>
              ))}
            </div>
          </div>



          {/* Duration & Marks */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Duration (min)</label>
              <input type="number" value={meta.duration} onChange={e => setMetaField("duration", e.target.value)}
                className="w-28 h-12 px-4 border border-s-stroke2/40 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 text-[15px] font-sans text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-all shadow-inner" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Marks</label>
              <input type="number" value={meta.marks} onChange={e => setMetaField("marks", e.target.value)}
                className="w-28 h-12 px-4 border border-s-stroke2/40 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 text-[15px] font-sans text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-t-primary outline-none transition-all shadow-inner" />
            </div>
          </div>
        </div>

        {/* Chapter-wise: Subject pill selector + Chapter input + Info note */}
        {isChapterWise && (
          <div className="relative z-10 mt-6 pt-6 border-t border-s-stroke2/30 flex flex-col gap-5">

            {/* Info callout */}
            <div className="flex items-start gap-3 p-4 rounded-[10px] bg-[rgba(42,133,255,0.06)] border border-[rgba(42,133,255,0.2)]">
              <RiInformationLine size={18} className="text-[#2A85FF] shrink-0 mt-0.5" />
              <p className="text-[13px] font-sans font-medium text-[#2A85FF] leading-relaxed">
                <strong>Chapter-wise batch upload:</strong> All JSON files you drop will share the same Subject and Chapter below.
                Dump multiple test papers from the <strong>same chapter</strong> at once — each file gets its own test name in the queue below.
              </p>
            </div>

            <div className="flex flex-wrap gap-8">
              {/* Subject pill selector */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
                  Subject *{" "}
                  {!meta.exam && (
                    <span className="normal-case font-medium text-t-secondary/60">(select an exam first)</span>
                  )}
                </label>
                {subjectOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {subjectOptions.map(s => (
                      <Pill key={s} active={meta.subject === s} onClick={() => setMetaField("subject", s)}>
                        {s}
                      </Pill>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] font-sans text-t-secondary italic">
                    Select an exam above to see subject options
                  </p>
                )}
              </div>

              {/* Chapter name input */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Chapter Name (optional)</label>
                <input
                  type="text"
                  value={meta.chapter}
                  onChange={e => setMetaField("chapter", e.target.value)}
                  placeholder="e.g., Work, Energy and Power"
                  className="w-72 h-12 px-4 border border-s-stroke2/40 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 text-[15px] font-sans text-t-primary dark:text-t-primary placeholder:text-t-secondary focus:border-t-primary dark:focus:border-t-primary outline-none transition-all shadow-inner"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Drop Zone ────────────────────────────────────────────────────────── */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-3 p-12 border-2 border-dashed border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1 rounded-[10px] cursor-pointer hover:border-t-primary dark:hover:border-s-border hover:bg-s-stroke2 dark:hover:bg-s-stroke2/20 transition-all shadow-sm"
      >
        <input ref={fileInputRef} type="file" accept=".json" multiple className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)} />
        <div className="w-16 h-16 rounded-[10px] bg-s-stroke2 dark:bg-b-surface2 border border-s-stroke2/40 flex items-center justify-center shadow-sm">
          <RiUploadCloud2Line size={32} className="text-t-secondary" />
        </div>
        <div className="text-center">
          <p className="font-sans font-semibold text-t-primary dark:text-t-primary text-[15px]">Drop all JSON files here</p>
          <p className="font-sans text-[13px] text-t-secondary mt-1 font-medium">
            Multiple files supported · Name each test in the queue below
          </p>
        </div>
      </div>

      {/* ── File Queue ───────────────────────────────────────────────────────── */}
      {files.length > 0 && (
        <div className="group relative flex flex-col p-6 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] w-full">

          {/* Queue header */}
          <div className="relative z-10 flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
              <RiFileList3Line size={20} className="text-t-primary dark:text-t-primary" />
              <p className="font-sans font-semibold text-[16px] text-t-primary dark:text-t-primary">
                {files.length} file{files.length !== 1 ? "s" : ""} queued
              </p>
            </div>
            <div className="flex items-center gap-4 text-[13px] font-semibold">
              {doneCount > 0 && <span className="text-primary-02">✓ {doneCount} done</span>}
              {errorCount > 0 && <span className="text-primary-03">✗ {errorCount} failed</span>}
              {pendingCount > 0 && (
                <span className={titlesFilledCount === pendingCount ? "text-primary-02" : "text-[#FF9F0A]"}>
                  {titlesFilledCount}/{pendingCount} names filled
                </span>
              )}
            </div>
          </div>

          {/* File rows */}
          <div className="relative z-10 flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 pb-2">
            {files.map(f => (
              <div
                key={f.name}
                className={`flex items-start gap-4 p-4 rounded-[10px] border transition-all shadow-sm ${
                  f.status === "done"                      ? "border-s-stroke2/40 bg-[rgba(0,166,86,0.05)]" :
                  f.status === "error" || f.parseError     ? "border-s-stroke2/40 bg-[rgba(239,68,68,0.05)]" :
                  f.status === "uploading"                 ? "border-s-stroke2/40 bg-[rgba(255,159,10,0.05)]" :
                  "border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 hover:bg-b-surface1 dark:hover:bg-b-surface1/60"
                }`}
              >
                {/* Status icon */}
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-[10px] bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/20 mt-1">
                  {f.status === "done"                  && <RiCheckLine size={16} className="text-primary-02" />}
                  {(f.status === "error" || f.parseError) && <RiAlertLine size={16} className="text-primary-03" />}
                  {f.status === "uploading"              && <RiLoader4Line size={16} className="animate-spin text-[#FF9F0A]" />}
                  {f.status === "pending" && !f.parseError && <RiFileList3Line size={16} className="text-t-secondary" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  {/* Filename + question count */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-sans text-[13px] font-medium text-t-secondary truncate">{f.name}</p>
                    {f.questions && (
                      <span className="font-sans text-[12px] font-semibold text-t-secondary shrink-0">
                        · {f.questions.length} Qs
                      </span>
                    )}
                  </div>

                  {f.parseError ? (
                    <p className="font-sans text-[12px] font-medium text-primary-03">{f.parseError}</p>
                  ) : f.status === "done" ? (
                    <p className="font-sans text-[12px] font-medium text-primary-02">{f.message}</p>
                  ) : f.status === "error" ? (
                    <p className="font-sans text-[12px] font-medium text-primary-03 break-words">
                      {f.message || "Upload failed — check API logs for details"}
                    </p>
                  ) : (
                    <>
                      {/* ── Test Name input (prominent) ── */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-t-secondary uppercase tracking-[0.02em]">
                          Test Name *
                        </label>
                        <input
                          value={f.title}
                          onChange={e => updateFile(f.name, { title: e.target.value })}
                          placeholder="Enter test name…"
                          disabled={f.status !== "pending"}
                          className={`w-full h-10 px-3 rounded-[10px] border text-[14px] font-sans font-medium text-t-primary dark:text-t-primary placeholder:text-t-secondary focus:border-t-primary dark:focus:border-t-primary outline-none disabled:opacity-50 transition-colors shadow-inner bg-b-surface1 dark:bg-b-surface1 ${
                            f.title.trim() === ""
                              ? "border-[rgba(255,159,10,0.6)]"
                              : "border-s-stroke2/40"
                          }`}
                        />
                      </div>

                      {/* ── Subject / Chapter overrides for non-chapter-wise ── */}
                      {!isChapterWise && (
                        <div className="flex gap-2 mt-1">
                          <input
                            value={f.subject}
                            onChange={e => updateFile(f.name, { subject: e.target.value })}
                            placeholder="Subject"
                            disabled={f.status !== "pending"}
                            className="w-32 h-8 px-3 border border-s-stroke2/40 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 text-[13px] font-sans text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-s-border outline-none disabled:opacity-50 transition-colors"
                          />
                          <input
                            value={f.chapter}
                            onChange={e => updateFile(f.name, { chapter: e.target.value })}
                            placeholder="Chapter"
                            disabled={f.status !== "pending"}
                            className="flex-1 max-w-[200px] h-8 px-3 border border-s-stroke2/40 rounded-[10px] bg-b-surface1 dark:bg-b-surface1 text-[13px] font-sans text-t-primary dark:text-t-primary focus:border-t-primary dark:focus:border-s-border outline-none disabled:opacity-50 transition-colors"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Remove button */}
                {f.status === "pending" && (
                  <button
                    onClick={() => removeFile(f.name)}
                    className="shrink-0 p-2 text-t-secondary hover:text-primary-03 hover:bg-[rgba(239,68,68,0.1)] rounded-[10px] transition-colors cursor-pointer mt-0.5"
                  >
                    <RiCloseLine size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Warning when not all titles are filled */}
          {pendingCount > 0 && !allTitlesFilled && (
            <div className="relative z-10 mt-4 flex items-center gap-2 p-3 rounded-[10px] bg-[rgba(255,159,10,0.07)] border border-[rgba(255,159,10,0.25)]">
              <RiAlertLine size={16} className="text-[#FF9F0A] shrink-0" />
              <p className="text-[13px] font-sans font-medium text-[#FF9F0A]">
                Fill in test names for all files to enable upload —{" "}
                <strong>{pendingCount - titlesFilledCount}</strong> remaining
              </p>
            </div>
          )}

          {/* Warning when chapter-wise requirements not met */}
          {isChapterWise && pendingCount > 0 && allTitlesFilled && !chapterWiseMet && (
            <div className="relative z-10 mt-4 flex items-center gap-2 p-3 rounded-[10px] bg-[rgba(255,159,10,0.07)] border border-[rgba(255,159,10,0.25)]">
              <RiAlertLine size={16} className="text-[#FF9F0A] shrink-0" />
              <p className="text-[13px] font-sans font-medium text-[#FF9F0A]">
                Select a Subject above to enable upload
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center w-full pt-2">
        {files.length > 0 ? (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFiles([])}
              className="font-sans text-[14px] font-semibold text-t-secondary hover:text-primary-03 transition-colors cursor-pointer"
            >
              Clear all files
            </button>
            {errorCount > 0 && (
              <button
                onClick={() => setFiles(prev => prev.map(f =>
                  f.status === "error" ? { ...f, status: "pending", message: "" } : f
                ))}
                className="font-sans text-[14px] font-semibold text-[#FF9F0A] hover:text-[#e08800] transition-colors cursor-pointer"
              >
                ↺ Retry failed ({errorCount})
              </button>
            )}
          </div>
        ) : <div />}

        <div className="flex gap-4 ml-auto">
          <button
            onClick={uploadAll}
            disabled={!canUpload}
            className={`flex items-center gap-2 h-12 px-8 rounded-[10px] text-[14px] font-semibold transition-all shadow-sm ${
              canUpload
                ? "bg-shade-02 dark:bg-t-primary text-t-light dark:text-b-surface1 hover:bg-shade-04 cursor-pointer active:scale-[0.98]"
                : "bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 text-t-secondary opacity-60 cursor-not-allowed"
            }`}
          >
            {uploading ? (
              <><RiLoader4Line size={18} className="animate-spin" /> Uploading…</>
            ) : (
              <><RiUploadCloud2Line size={18} /> Upload All ({pendingCount})</>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
