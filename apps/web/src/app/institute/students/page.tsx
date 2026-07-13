"use client";

import { useState, useRef, useCallback } from "react";
import {
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiUploadCloud2Line,
  RiFileExcel2Line,
  RiTeamLine,
  RiAlertLine,
  RiCheckLine,
  RiLoaderLine,
  RiInboxLine,
  RiCloseLine,
  RiUser3Line,
  RiUserAddLine,
} from "@remixicon/react";
import { useStudents } from "@/lib/hooks/useStudents";
import { useBatches } from "@/lib/hooks/useBatches";
import { Modal } from "@/components/shared/Modal";
import type { ImportResult } from "@/lib/hooks/useStudents";

// Mask phone: 98765*****
function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  if (phone.length <= 5) return phone;
  return phone.slice(0, 5) + "*".repeat(phone.length - 5);
}

// Format DOB: 15082005 → 15/08/2005
function formatDob(dob: string | null): string {
  if (!dob || dob.length !== 8) return dob ?? "—";
  return `${dob.slice(0, 2)}/${dob.slice(2, 4)}/${dob.slice(4)}`;
}

export default function StudentsPage() {
  const { students, total, loading, error, refetch, importStudents } = useStudents();
  const [searchQuery, setSearchQuery] = useState("");

  // Import modal state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; result?: ImportResult } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Student modal state
  const { batches } = useBatches();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", dob: "", batch_id: "" });
  const [addError, setAddError] = useState<string | null>(null);
  const { createStudent } = useStudents();

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.phone ?? "").includes(searchQuery) ||
    s.batches.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openImportModal = () => {
    setSelectedFile(null);
    setImportResult(null);
    setIsImportOpen(true);
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
    setImportResult(null);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setImportResult(null);
    const result = await importStudents(selectedFile);
    setImportResult(result);
    setImporting(false);
    if (result.success) {
      setTimeout(() => setIsImportOpen(false), 2500);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    const result = await createStudent(addForm);
    setAdding(false);
    if (result.success) {
      setIsAddOpen(false);
      setAddForm({ name: "", phone: "", dob: "", batch_id: "" });
    } else {
      setAddError(result.message);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">

      {/* ── Top Navigation Row ── */}
      <div className="flex flex-row justify-between items-center w-full h-12 gap-6">
        <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary">
          Students
        </h1>

        <div className="flex flex-row items-center gap-3">
          {/* Search */}
          <div className="flex flex-row items-center bg-b-surface2 border border-s-stroke2 rounded-[10px] px-3 py-2 w-72 h-12 gap-2 shadow-xs">
            <RiSearchLine size={20} className="text-t-secondary" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-t-primary placeholder-t-secondary w-full"
            />
          </div>

          {/* Add Student Button */}
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex flex-row justify-center items-center gap-2 px-6 h-12 bg-b-surface2 border border-s-stroke2 hover:bg-b-surface3 text-t-primary text-sm font-sans font-semibold rounded-[10px] transition-all cursor-pointer"
          >
            <RiUserAddLine size={17} />
            Add Student
          </button>

          {/* Import CSV Button */}
          <button
            onClick={openImportModal}
            className="flex flex-row justify-center items-center gap-2 px-6 h-12 bg-gradient-to-b from-[#2C2C2C] to-[#282828] dark:from-t-primary dark:to-t-primary/90 text-t-light dark:text-b-surface1 text-sm font-sans font-semibold rounded-[10px] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] active:scale-95 transition-all cursor-pointer"
          >
            <RiUploadCloud2Line size={17} />
            Import CSV
          </button>

          <button className="relative flex size-12 items-center justify-center rounded-full bg-b-surface2 border border-s-stroke2 text-t-secondary hover:text-t-primary transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
            <RiNotification3Line size={20} />
            <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-primary-03" />
          </button>
          <button className="flex size-12 items-center justify-center rounded-full bg-b-surface2 border border-s-stroke2 text-t-secondary hover:text-t-primary transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
            <RiMailLine size={20} />
          </button>
          <div className="flex items-center justify-center size-12 rounded-full border border-s-stroke2/40 bg-b-surface2 shrink-0 cursor-pointer shadow-xs">
            <div className="size-9 rounded-full bg-shade-02 dark:bg-t-primary flex items-center justify-center text-xs font-bold text-t-light dark:text-b-surface1">AA</div>
          </div>
        </div>
      </div>

      {/* Section Header + Stats */}
      <div className="flex flex-row items-center justify-between mt-2">
        <div>
          <h2 className="font-sans font-semibold text-[20px] leading-[145%] text-t-primary">Student Directory</h2>
          <p className="text-xs text-t-secondary mt-0.5">All students enrolled in your institute, imported via CSV.</p>
        </div>
        {!loading && !error && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-b-surface2 border border-s-stroke2/50 text-sm text-t-secondary shadow-xs">
            <RiTeamLine size={16} className="text-t-tertiary" />
            <span><strong className="text-t-primary">{total}</strong> total students</span>
          </div>
        )}
      </div>

      {/* ── Student Table ── */}
      <div className="w-full overflow-hidden rounded-[16px] border border-s-stroke2/40 bg-white dark:bg-white/[0.02] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05)]">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-0">
            {/* Table header skeleton */}
            <div className="flex items-center px-5 py-3 border-b border-s-stroke2/40 bg-b-surface1/50">
              {["Name", "Phone", "DOB", "Batch(es)", "Enrolled"].map(h => (
                <div key={h} className="flex-1 text-[10px] font-bold uppercase tracking-wider text-t-tertiary">{h}</div>
              ))}
            </div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center px-5 py-4 border-b border-s-stroke2/20 gap-4 animate-pulse">
                <div className="size-8 rounded-full bg-b-surface2 shrink-0" />
                <div className="flex-1 h-3.5 rounded-full bg-b-surface2" />
                <div className="flex-1 h-3 rounded-full bg-b-surface2 w-20" />
                <div className="flex-1 h-3 rounded-full bg-b-surface2 w-16" />
                <div className="flex-1 h-3 rounded-full bg-b-surface2 w-24" />
                <div className="flex-1 h-3 rounded-full bg-b-surface2 w-20" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-3 px-5 py-5 text-primary-03 text-sm">
            <RiAlertLine size={18} />
            <span>{error}</span>
            <button onClick={refetch} className="ml-auto underline text-xs">Retry</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredStudents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-t-tertiary">
            <RiInboxLine size={48} className="opacity-40" />
            <p className="text-sm font-medium">
              {searchQuery
                ? "No students match your search."
                : "No students yet. Import a CSV to get started!"}
            </p>
            {!searchQuery && (
              <button
                onClick={openImportModal}
                className="mt-2 flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-b-surface2 border border-s-stroke2/50 text-sm font-semibold text-t-secondary hover:text-t-primary transition-all"
              >
                <RiUploadCloud2Line size={16} /> Import CSV
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {!loading && !error && filteredStudents.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-s-stroke2/40 bg-b-surface1/50">
                {["Name", "Phone", "Date of Birth", "Batch(es)", "Enrolled"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-t-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s, idx) => {
                const initials = s.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                const enrolledDate = s.created_at
                  ? new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                  : "—";

                return (
                  <tr
                    key={s.id}
                    className={`border-b border-s-stroke2/20 hover:bg-b-surface1/30 transition-colors ${idx === filteredStudents.length - 1 ? "border-b-0" : ""}`}
                  >
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary-01/10 border border-primary-01/20 flex items-center justify-center text-[11px] font-bold text-primary-01 shrink-0">
                          {initials || <RiUser3Line size={14} />}
                        </div>
                        <span className="text-sm font-semibold text-t-primary">{s.name}</span>
                      </div>
                    </td>

                    {/* Phone (masked) */}
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-t-secondary font-mono">{maskPhone(s.phone)}</span>
                    </td>

                    {/* DOB */}
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-t-secondary">{formatDob(s.date_of_birth)}</span>
                    </td>

                    {/* Batches */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {s.batches.length === 0
                          ? <span className="text-xs text-t-tertiary">—</span>
                          : s.batches.map(b => (
                            <span key={b} className="px-2 py-0.5 rounded-[6px] bg-primary-01/5 border border-primary-01/15 text-[11px] font-semibold text-primary-01">{b}</span>
                          ))
                        }
                      </div>
                    </td>

                    {/* Enrolled date */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-t-tertiary">{enrolledDate}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Import CSV Modal ── */}
      <Modal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Students via CSV"
        subtitle="Upload a CSV or Excel file with student data"
      >
        <div className="flex flex-col gap-5">

          {/* Format guide */}
          <div className="rounded-[10px] bg-b-surface1 border border-s-stroke2/50 p-4">
            <p className="text-xs font-semibold text-t-secondary mb-2 uppercase tracking-wider">Required Columns</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { col: "Name", desc: "Full student name" },
                { col: "Phone", desc: "10-digit mobile number" },
                { col: "DOB", desc: "Format: DDMMYYYY" },
                { col: "Batch", desc: "Must match an existing batch name" },
              ].map(({ col, desc }) => (
                <div key={col} className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-[6px] bg-primary-01/8 border border-primary-01/15 text-[11px] font-bold text-primary-01">{col}</span>
                  <span className="text-xs text-t-tertiary">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 h-36 rounded-[12px] border-2 border-dashed cursor-pointer transition-all ${
              dragOver
                ? "border-primary-01/60 bg-primary-01/5"
                : selectedFile
                ? "border-primary-02/40 bg-primary-02/5"
                : "border-s-stroke2/50 bg-b-surface1 hover:border-primary-01/40 hover:bg-primary-01/3"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />

            {selectedFile ? (
              <>
                <div className="flex items-center gap-2.5">
                  <RiFileExcel2Line size={32} className="text-primary-02" />
                  <div>
                    <p className="text-sm font-semibold text-t-primary">{selectedFile.name}</p>
                    <p className="text-xs text-t-tertiary">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="ml-2 flex items-center justify-center size-6 rounded-full bg-primary-03/10 text-primary-03 hover:bg-primary-03/20 transition-colors"
                  >
                    <RiCloseLine size={14} />
                  </button>
                </div>
                <p className="text-xs text-t-tertiary">Click to change file</p>
              </>
            ) : (
              <>
                <RiUploadCloud2Line size={36} className="text-t-tertiary opacity-60" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-t-primary">Drop your file here, or click to browse</p>
                  <p className="text-xs text-t-tertiary mt-0.5">Supports .csv, .xlsx, .xls — max 5MB</p>
                </div>
              </>
            )}
          </div>

          {/* Import Result */}
          {importResult && (
            <div className={`rounded-[10px] border px-4 py-3 ${
              importResult.success
                ? "bg-primary-02/5 border-primary-02/20"
                : "bg-primary-03/5 border-primary-03/20"
            }`}>
              <div className={`flex items-center gap-2 text-sm font-semibold mb-2 ${importResult.success ? "text-primary-02" : "text-primary-03"}`}>
                {importResult.success ? <RiCheckLine size={16} /> : <RiAlertLine size={16} />}
                {importResult.message}
              </div>
              {importResult.result && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center">
                    <p className="text-xl font-bold text-primary-02">{importResult.result.imported}</p>
                    <p className="text-xs text-t-tertiary">Imported</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-amber-500">{importResult.result.updated}</p>
                    <p className="text-xs text-t-tertiary">Batch Updated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-t-secondary">{importResult.result.skipped}</p>
                    <p className="text-xs text-t-tertiary">Skipped</p>
                  </div>
                </div>
              )}
              {importResult.result?.errors && importResult.result.errors.length > 0 && (
                <div className="mt-3 max-h-28 overflow-y-auto space-y-1">
                  {importResult.result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-primary-03 font-mono leading-5">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-1 flex items-center justify-end gap-3 pt-4 border-t border-s-stroke2/50">
            <button onClick={() => setIsImportOpen(false)} className="btn btn-ghost px-5" disabled={importing}>
              Cancel
            </button>
            <button
              className="btn btn-primary px-6 shadow-md flex items-center gap-2"
              onClick={handleImport}
              disabled={!selectedFile || importing}
            >
              {importing && <RiLoaderLine size={16} className="animate-spin" />}
              {importing ? "Importing..." : "Import Students"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add Single Student Modal ── */}
      <Modal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Student"
        subtitle="Create a student and assign them to a batch"
      >
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
          {addError && (
            <div className="flex items-center gap-2 text-sm text-primary-03 bg-primary-03/10 p-3 rounded-[10px]">
              <RiAlertLine size={16} />
              {addError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-t-primary">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={addForm.name}
              onChange={e => setAddForm({ ...addForm, name: e.target.value })}
              className="w-full bg-b-surface2 border border-s-stroke2 rounded-[10px] px-4 py-2.5 text-sm outline-none focus:border-primary-01 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-t-primary">Phone Number</label>
            <input
              type="text"
              required
              pattern="[0-9]{10}"
              placeholder="10-digit mobile number"
              value={addForm.phone}
              onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
              className="w-full bg-b-surface2 border border-s-stroke2 rounded-[10px] px-4 py-2.5 text-sm outline-none focus:border-primary-01 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-t-primary">Date of Birth</label>
            <input
              type="text"
              required
              placeholder="DDMMYYYY"
              pattern="[0-9]{8}"
              value={addForm.dob}
              onChange={e => setAddForm({ ...addForm, dob: e.target.value })}
              className="w-full bg-b-surface2 border border-s-stroke2 rounded-[10px] px-4 py-2.5 text-sm outline-none focus:border-primary-01 transition-colors"
            />
            <p className="text-xs text-t-tertiary">Format: DDMMYYYY (e.g. 15082005 for 15 Aug 2005)</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-t-primary">Batch</label>
            <select
              required
              value={addForm.batch_id}
              onChange={e => setAddForm({ ...addForm, batch_id: e.target.value })}
              className="w-full bg-b-surface2 border border-s-stroke2 rounded-[10px] px-4 py-2.5 text-sm outline-none focus:border-primary-01 transition-colors appearance-none"
            >
              <option value="" disabled>Select a batch</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-s-stroke2/50">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="btn btn-ghost px-5"
              disabled={adding}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-6 shadow-md flex items-center gap-2"
              disabled={adding}
            >
              {adding && <RiLoaderLine size={16} className="animate-spin" />}
              {adding ? "Adding..." : "Add Student"}
            </button>
          </div>
        </form>
      </Modal>

    </main>
  );
}
