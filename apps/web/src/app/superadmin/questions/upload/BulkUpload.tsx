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
      className={`px-3.5 h-8 rounded-full border text-[11px] font-semibold transition-all cursor-pointer uppercase tracking-wider ${
        active
          ? "border-[#101010] bg-[#101010] text-[#FDFDFD] dark:border-t-primary dark:bg-t-primary dark:text-b-surface1"
          : "border-[#E2E2E2] dark:border-s-stroke2 bg-transparent text-[#727272] hover:border-[#727272] hover:text-[#101010]"
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
    <div className="flex flex-col gap-6">

      {/* Shared metadata */}
      <div className="p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#7B7B7B] mb-4">
          Shared Metadata — applies to all files
        </p>
        <div className="flex flex-wrap gap-6">
          {/* Exam */}
          <div>
            <label className="block text-xs font-semibold text-[#7B7B7B] mb-2 uppercase tracking-wider">Exam *</label>
            <div className="flex flex-wrap gap-2">
              {EXAMS.map(e => (
                <Pill key={e.code} active={meta.exam === e.code} onClick={() => setMetaField("exam", e.code)}>
                  {e.label}
                </Pill>
              ))}
            </div>
          </div>
          {/* Test Type */}
          <div>
            <label className="block text-xs font-semibold text-[#7B7B7B] mb-2 uppercase tracking-wider">Test Type *</label>
            <div className="flex flex-wrap gap-2">
              {TEST_TYPES.map(t => (
                <Pill key={t.code} active={meta.test_type === t.code} onClick={() => setMetaField("test_type", t.code)}>
                  {t.label}
                </Pill>
              ))}
            </div>
          </div>
          {/* Difficulty */}
          <div>
            <label className="block text-xs font-semibold text-[#7B7B7B] mb-2 uppercase tracking-wider">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTY.map(d => (
                <Pill key={d} active={meta.difficulty === d} onClick={() => setMetaField("difficulty", d)}>
                  {d}
                </Pill>
              ))}
            </div>
          </div>
          {/* Duration & Marks */}
          <div className="flex gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#7B7B7B] mb-2 uppercase tracking-wider">Duration (min)</label>
              <input type="number" value={meta.duration} onChange={e => setMetaField("duration", e.target.value)}
                className="w-24 h-9 px-3 border border-[#E2E2E2] dark:border-s-stroke2 rounded-xl bg-transparent text-sm text-[#101010] dark:text-t-primary focus:border-[#727272] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7B7B7B] mb-2 uppercase tracking-wider">Marks</label>
              <input type="number" value={meta.marks} onChange={e => setMetaField("marks", e.target.value)}
                className="w-24 h-9 px-3 border border-[#E2E2E2] dark:border-s-stroke2 rounded-xl bg-transparent text-sm text-[#101010] dark:text-t-primary focus:border-[#727272] outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed border-[#E2E2E2] dark:border-s-stroke2 rounded-[24px] cursor-pointer hover:border-[#727272] hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/20 transition-all"
      >
        <input ref={fileInputRef} type="file" accept=".json" multiple className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)} />
        <div className="w-14 h-14 rounded-2xl bg-[#EFEFEF] dark:bg-b-surface1 flex items-center justify-center">
          <RiUploadCloud2Line size={28} className="text-[#7B7B7B]" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-[#101010] dark:text-t-primary text-sm">Drop all JSON files here</p>
          <p className="text-xs text-[#7B7B7B] mt-1">
            Multiple files supported · Subject & Chapter auto-detected from filename
          </p>
        </div>
      </div>

      {/* File Queue */}
      {files.length > 0 && (
        <div className="p-6 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <RiFileList3Line size={18} className="text-[#101010] dark:text-t-primary" />
              <p className="font-semibold text-[15px] text-[#101010] dark:text-t-primary">
                {files.length} files queued
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              {doneCount > 0 && <span className="text-green-600">✓ {doneCount} done</span>}
              {errorCount > 0 && <span className="text-red-500">✗ {errorCount} failed</span>}
              {pendingCount > 0 && <span className="text-[#7B7B7B]">{pendingCount} pending</span>}
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
            {files.map(f => (
              <div key={f.name} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                f.status === "done"     ? "border-green-200 bg-green-50 dark:bg-green-900/10" :
                f.status === "error" || f.parseError ? "border-red-200 bg-red-50 dark:bg-red-900/10" :
                f.status === "uploading" ? "border-amber-200 bg-amber-50 dark:bg-amber-900/10" :
                "border-[#E2E2E2] dark:border-s-stroke2 bg-transparent"
              }`}>
                {/* Status icon */}
                <div className="shrink-0">
                  {f.status === "done"      && <RiCheckLine size={18} className="text-green-600" />}
                  {(f.status === "error" || f.parseError) && <RiAlertLine size={18} className="text-red-500" />}
                  {f.status === "uploading" && <RiLoader4Line size={18} className="animate-spin text-amber-500" />}
                  {f.status === "pending" && !f.parseError && <RiFileList3Line size={18} className="text-[#7B7B7B]" />}
                </div>

                {/* File info + editable subject/chapter */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#101010] dark:text-t-primary truncate">{f.name}</p>
                  {f.parseError ? (
                    <p className="text-xs text-red-500 mt-0.5">{f.parseError}</p>
                  ) : f.status === "done" ? (
                    <p className="text-xs text-green-600 mt-0.5">{f.message}</p>
                  ) : (
                    <div className="flex gap-2 mt-1.5">
                      <input
                        value={f.subject}
                        onChange={e => updateFile(f.name, { subject: e.target.value })}
                        placeholder="Subject"
                        disabled={f.status !== "pending"}
                        className="w-28 h-7 px-2 border border-[#E2E2E2] dark:border-s-stroke2 rounded-lg bg-transparent text-xs text-[#101010] dark:text-t-primary focus:border-[#727272] outline-none disabled:opacity-50"
                      />
                      <input
                        value={f.chapter}
                        onChange={e => updateFile(f.name, { chapter: e.target.value })}
                        placeholder="Chapter"
                        disabled={f.status !== "pending"}
                        className="flex-1 h-7 px-2 border border-[#E2E2E2] dark:border-s-stroke2 rounded-lg bg-transparent text-xs text-[#101010] dark:text-t-primary focus:border-[#727272] outline-none disabled:opacity-50"
                      />
                      {f.questions && (
                        <span className="text-xs text-[#7B7B7B] self-center shrink-0">{f.questions.length}q</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Remove */}
                {f.status === "pending" && (
                  <button onClick={() => removeFile(f.name)} className="shrink-0 text-[#7B7B7B] hover:text-red-500 transition-colors cursor-pointer">
                    <RiCloseLine size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        {files.length > 0 && (
          <button
            onClick={() => setFiles([])}
            className="text-xs text-[#7B7B7B] hover:text-red-500 transition-colors cursor-pointer"
          >
            Clear all
          </button>
        )}
        <div className="flex gap-3 ml-auto">
          <button
            onClick={uploadAll}
            disabled={uploading || pendingCount === 0 || !meta.exam}
            className={`flex items-center gap-2 h-11 px-8 rounded-xl text-sm font-semibold transition-all ${
              !uploading && pendingCount > 0 && meta.exam
                ? "bg-[#101010] dark:bg-t-primary text-[#FDFDFD] dark:text-b-surface1 hover:bg-[#202020] cursor-pointer active:scale-[0.98]"
                : "bg-[#E2E2E2] dark:bg-s-stroke2/40 text-[#7B7B7B] cursor-not-allowed"
            }`}
          >
            {uploading ? (
              <><RiLoader4Line size={16} className="animate-spin" /> Uploading…</>
            ) : (
              <><RiUploadCloud2Line size={16} /> Upload All ({pendingCount})</>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
