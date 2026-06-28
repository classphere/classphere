"use client";

import { useState, useRef, useCallback } from "react";
import {
  RiUploadCloud2Line, RiCheckLine, RiCloseLine,
  RiAlertLine, RiLoader4Line, RiFileList3Line,
} from "@remixicon/react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

// Auto-detect subject from filename e.g. "Physics_Work_Energy.json" → "Physics"
function detectSubject(name: string): string {
  const parts = name.split("_");
  const known = ["Physics", "Chemistry", "Biology", "Mathematics",
    "Quantitative", "General", "English"];
  return known.find(s => parts[0].startsWith(s)) ?? parts[0];
}

// Auto-detect chapter from filename e.g. "Physics_Work_Energy_and_Power.json"
function detectChapter(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")           // remove extension
    .replace(/^[^_]+_/, "")           // strip "Physics_"
    .replace(/_/g, " ");
}

interface BulkFile {
  file: File;
  name: string;
  subject: string;
  chapter: string;
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
}

const EXAMS = [
  { code: "jee-main", label: "JEE Main" },
  { code: "jee-advanced", label: "JEE Advanced" },
  { code: "neet-ug", label: "NEET-UG" },
  { code: "ssc-cgl", label: "SSC CGL" },
];
const TEST_TYPES = [
  { code: "chapter-wise", label: "Chapter-wise" },
  { code: "mock-test", label: "Mock Test" },
  { code: "pyq", label: "PYQ" },
];
const DIFFICULTY = ["easy", "medium", "hard"];

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 h-10 rounded-full border text-[13px] font-semibold transition-all cursor-pointer uppercase tracking-wider ${
        active
          ? "border-[#101010] bg-[#101010] text-[#FDFDFD] dark:border-t-primary dark:bg-t-primary dark:text-b-surface1 shadow-sm"
          : "border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1 text-[#7B7B7B] hover:border-[#101010] dark:hover:border-[#FDFDFD] hover:text-[#101010] dark:hover:text-t-primary"
      }`}
    >
      {children}
    </button>
  );
}

export default function BulkUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState<SharedMeta>({
    exam: "", test_type: "chapter-wise", duration: "60", marks: "200", difficulty: "medium",
  });

  const setMetaField = (k: keyof SharedMeta, v: string) =>
    setMeta(prev => ({ ...prev, [k]: v }));

  const parseFile = (file: File): Promise<BulkFile> =>
    new Promise(resolve => {
      const entry: BulkFile = {
        file,
        name: file.name,
        subject: detectSubject(file.name),
        chapter: detectChapter(file.name),
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

  const uploadAll = async () => {
    const ready = files.filter(f => f.questions && !f.parseError && f.status === "pending");
    if (!ready.length || !meta.exam || !meta.test_type) return;
    setUploading(true);
    const token = localStorage.getItem("auth_token") ?? "";

    for (const f of ready) {
      updateFile(f.name, { status: "uploading" });
      try {
        const res = await fetch(`${API_BASE}/superadmin/upload-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            exam: meta.exam,
            test_type: meta.test_type,
            title: `${f.subject} — ${f.chapter}`,
            subject: f.subject,
            chapter: f.chapter,
            duration: parseInt(meta.duration),
            marks: parseInt(meta.marks),
            difficulty: meta.difficulty,
            questions: f.questions,
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

  const pendingCount = files.filter(f => f.status === "pending" && f.questions).length;
  const doneCount = files.filter(f => f.status === "done").length;
  const errorCount = files.filter(f => f.status === "error" || f.parseError).length;

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* Shared metadata */}
      <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full">
        <div className="box-hover" />
        
        <p className="relative z-10 text-[13px] font-semibold uppercase tracking-[0.02em] text-[#7B7B7B] mb-6">
          Shared Metadata — applies to all files
        </p>
        
        <div className="relative z-10 flex flex-wrap gap-8">
          {/* Exam */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Exam *</label>
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
            <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Test Type *</label>
            <div className="flex flex-wrap gap-3">
              {TEST_TYPES.map(t => (
                <Pill key={t.code} active={meta.test_type === t.code} onClick={() => setMetaField("test_type", t.code)}>
                  {t.label}
                </Pill>
              ))}
            </div>
          </div>
          
          {/* Difficulty */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Difficulty</label>
            <div className="flex flex-wrap gap-3">
              {DIFFICULTY.map(d => (
                <Pill key={d} active={meta.difficulty === d} onClick={() => setMetaField("difficulty", d)}>
                  {d}
                </Pill>
              ))}
            </div>
          </div>
          
          {/* Duration & Marks */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Duration (min)</label>
              <input type="number" value={meta.duration} onChange={e => setMetaField("duration", e.target.value)}
                className="w-28 h-12 px-4 border border-s-stroke2/40 rounded-xl bg-[#F9F9F9] dark:bg-b-surface1 text-[15px] font-sans text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-t-primary outline-none transition-all shadow-inner" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Marks</label>
              <input type="number" value={meta.marks} onChange={e => setMetaField("marks", e.target.value)}
                className="w-28 h-12 px-4 border border-s-stroke2/40 rounded-xl bg-[#F9F9F9] dark:bg-b-surface1 text-[15px] font-sans text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-t-primary outline-none transition-all shadow-inner" />
            </div>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-3 p-12 border-2 border-dashed border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1 rounded-[32px] cursor-pointer hover:border-[#101010] dark:hover:border-[#FDFDFD] hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/20 transition-all shadow-sm"
      >
        <input ref={fileInputRef} type="file" accept=".json" multiple className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)} />
        <div className="w-16 h-16 rounded-2xl bg-[#EAEAEA] dark:bg-b-surface2 border border-s-stroke2/40 flex items-center justify-center shadow-sm">
          <RiUploadCloud2Line size={32} className="text-[#7B7B7B]" />
        </div>
        <div className="text-center">
          <p className="font-sans font-semibold text-[#101010] dark:text-t-primary text-[15px]">Drop all JSON files here</p>
          <p className="font-sans text-[13px] text-[#7B7B7B] mt-1 font-medium">
            Multiple files supported · Subject & Chapter auto-detected from filename
          </p>
        </div>
      </div>

      {/* File Queue */}
      {files.length > 0 && (
        <div className="group relative card flex flex-col overflow-hidden p-6 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] w-full">
          <div className="box-hover" />
          
          <div className="relative z-10 flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
              <RiFileList3Line size={20} className="text-[#101010] dark:text-t-primary" />
              <p className="font-sans font-semibold text-[16px] text-[#101010] dark:text-t-primary">
                {files.length} files queued
              </p>
            </div>
            <div className="flex items-center gap-4 text-[13px] font-semibold">
              {doneCount > 0 && <span className="text-[#00A656]">✓ {doneCount} done</span>}
              {errorCount > 0 && <span className="text-[#EF4444]">✗ {errorCount} failed</span>}
              {pendingCount > 0 && <span className="text-[#7B7B7B]">{pendingCount} pending</span>}
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 pb-2">
            {files.map(f => (
              <div key={f.name} className={`flex items-center gap-4 p-4 rounded-[20px] border transition-all shadow-sm ${
                f.status === "done"     ? "border-[rgba(0,166,86,0.3)] bg-[rgba(0,166,86,0.05)]" :
                f.status === "error" || f.parseError ? "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)]" :
                f.status === "uploading" ? "border-[rgba(255,159,10,0.3)] bg-[rgba(255,159,10,0.05)]" :
                "border-s-stroke2/40 bg-[#FDFDFD] dark:bg-b-surface2 hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/60"
              }`}>
                {/* Status icon */}
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/20">
                  {f.status === "done"      && <RiCheckLine size={16} className="text-[#00A656]" />}
                  {(f.status === "error" || f.parseError) && <RiAlertLine size={16} className="text-[#EF4444]" />}
                  {f.status === "uploading" && <RiLoader4Line size={16} className="animate-spin text-[#FF9F0A]" />}
                  {f.status === "pending" && !f.parseError && <RiFileList3Line size={16} className="text-[#7B7B7B]" />}
                </div>

                {/* File info + editable subject/chapter */}
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-[14px] font-semibold text-[#101010] dark:text-t-primary truncate">{f.name}</p>
                  {f.parseError ? (
                    <p className="font-sans text-[12px] font-medium text-[#EF4444] mt-0.5">{f.parseError}</p>
                  ) : f.status === "done" ? (
                    <p className="font-sans text-[12px] font-medium text-[#00A656] mt-0.5">{f.message}</p>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <input
                        value={f.subject}
                        onChange={e => updateFile(f.name, { subject: e.target.value })}
                        placeholder="Subject"
                        disabled={f.status !== "pending"}
                        className="w-32 h-8 px-3 border border-s-stroke2/40 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 text-[13px] font-sans text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-[#FDFDFD] outline-none disabled:opacity-50 transition-colors"
                      />
                      <input
                        value={f.chapter}
                        onChange={e => updateFile(f.name, { chapter: e.target.value })}
                        placeholder="Chapter"
                        disabled={f.status !== "pending"}
                        className="flex-1 max-w-[200px] h-8 px-3 border border-s-stroke2/40 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 text-[13px] font-sans text-[#101010] dark:text-t-primary focus:border-[#101010] dark:focus:border-[#FDFDFD] outline-none disabled:opacity-50 transition-colors"
                      />
                      {f.questions && (
                        <span className="font-sans text-[12px] font-semibold text-[#7B7B7B] self-center shrink-0 ml-2">{f.questions.length} questions</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Remove */}
                {f.status === "pending" && (
                  <button onClick={() => removeFile(f.name)} className="shrink-0 p-2 text-[#7B7B7B] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] rounded-lg transition-colors cursor-pointer">
                    <RiCloseLine size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center w-full pt-2">
        {files.length > 0 ? (
          <button
            onClick={() => setFiles([])}
            className="font-sans text-[14px] font-semibold text-[#7B7B7B] hover:text-[#EF4444] transition-colors cursor-pointer"
          >
            Clear all files
          </button>
        ) : <div/>}
        <div className="flex gap-4 ml-auto">
          <button
            onClick={uploadAll}
            disabled={uploading || pendingCount === 0 || !meta.exam}
            className={`flex items-center gap-2 h-12 px-8 rounded-xl text-[14px] font-semibold transition-all shadow-sm ${
              !uploading && pendingCount > 0 && meta.exam
                ? "bg-[#101010] dark:bg-t-primary text-[#FDFDFD] dark:text-b-surface1 hover:bg-[#202020] cursor-pointer active:scale-[0.98]"
                : "bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 text-[#7B7B7B] opacity-60 cursor-not-allowed"
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
