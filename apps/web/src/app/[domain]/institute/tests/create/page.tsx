"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  RiArrowLeftLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarEventLine,
  RiTeamLine,
  RiFileList3Line,
  RiCheckDoubleLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiDeleteBin6Line,
  RiAlertLine,
  RiFileTextLine,
} from "@remixicon/react";
import { useBatches } from "@/lib/hooks/useBatches";
import { useAuth } from "@/lib/auth-context";
import { PremiumCard } from "@/components/premium-ui";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api.client";

export default function ScheduleTestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { batches, loading: batchesLoading } = useBatches();
  const AVAILABLE_BATCHES = batches.map(b => ({ id: b.id, name: b.name }));
  const returnPath = user?.role === "institute_admin" ? "/institute/tests" : "/test-department";

  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDateTimeOpen, setIsDateTimeOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const dateTimeRef = useRef<HTMLDivElement>(null);

  // Form & File upload states
  const [testName, setTestName] = useState("");
  const [testStart, setTestStart] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const answerKeyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
      if (dateTimeRef.current && !dateTimeRef.current.contains(event.target as Node)) setIsDateTimeOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleBatch = (id: string) => {
    if (selectedBatches.includes(id)) {
      setSelectedBatches(selectedBatches.filter(bId => bId !== id));
    } else {
      setSelectedBatches([...selectedBatches, id]);
    }
  };

  const removeBatch = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedBatches(selectedBatches.filter(bId => bId !== id));
  };

  const toLocalDateTime = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const selectedStart = testStart ? new Date(testStart) : null;
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
    return new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index - firstDay + 1);
  });
  const monthLabel = calendarMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const dateLabel = selectedStart
    ? selectedStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Choose date";
  const timeLabel = selectedStart
    ? selectedStart.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "Choose time";

  const chooseDate = (date: Date) => {
    const current = selectedStart ?? new Date();
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), current.getHours(), current.getMinutes());
    setTestStart(toLocalDateTime(next));
  };

  const updateTime = (part: "hours" | "minutes", value: string) => {
    const current = selectedStart ?? new Date();
    const next = new Date(current);
    if (part === "hours") next.setHours(Number(value));
    else next.setMinutes(Number(value));
    setTestStart(toLocalDateTime(next));
  };

  const handleSubmit = async () => {
    if (!pdfFile) {
      setErrorMsg("Please upload a Master PDF file.");
      return;
    }
    if (!testName.trim()) {
      setErrorMsg("Please enter a test name.");
      return;
    }
    if (!testStart) {
      setErrorMsg("Please select when students can start the test.");
      return;
    }
    if (selectedBatches.length === 0) {
      setErrorMsg("Please select at least one target batch.");
      return;
    }

    setStatus("uploading");
    setStatusMsg("Uploading files to server...");
    setErrorMsg("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error("Authentication session not found. Please log in again.");
      }

      const sessionToken = localStorage.getItem("classphere_session_token") || "";

      const formData = new FormData();
      formData.append("pdf", pdfFile);
      if (answerKeyFile) {
        formData.append("answer_key", answerKeyFile);
      }
      formData.append("title", testName.trim());
      formData.append("date", new Date(testStart).toISOString());
      formData.append("batch_ids", JSON.stringify(selectedBatches));

      const res = await fetch(`${API_URL}/api/v1/tests/upload-test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(sessionToken ? { "x-session-token": sessionToken } : {}),
        },
        body: formData,
      });

      if (!res.body) {
        throw new Error("Response body is not readable.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // retain incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.success === false || chunk.status === "error") {
              throw new Error(chunk.message || "Failed to process and upload test.");
            }
            
            // Map streamed status to local status / progress messages
            if (chunk.status) {
              if (chunk.status === "success") {
                setStatus("success");
                setStatusMsg("Test created successfully!");
                router.push(returnPath);
              } else {
                setStatus("processing");
                setStatusMsg(chunk.message || "Processing...");
              }
            }
          } catch (e: any) {
            // Throw error to break out of stream reading loop if it's an operational error
            if (e.message && !e.message.startsWith("Unexpected token")) {
              throw e;
            }
          }
        }
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Network error. Failed to create test.");
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 bg-transparent px-4 pb-12 pt-4 select-none sm:px-6 sm:pt-6">
      
      {/* ── Top Navigation Row (Figma Style) ── */}
      <div className="flex flex-col md:flex-row justify-start md:justify-between items-start md:items-center w-full h-auto md:h-12 gap-4 md:gap-6">
        <div className="flex items-center gap-4">
          <Link href={returnPath} className="btn btn-outline w-12 h-12 !px-0 rounded-[10px] flex items-center justify-center shrink-0 cursor-pointer">
            <RiArrowLeftLine size={20} />
          </Link>
          <h1 className="font-sans font-semibold text-[24px] md:text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary dark:text-t-primary">
            Upload & Create Test
          </h1>
        </div>

        {/* Navigation Items (Right Side) */}
        <div className="flex flex-row flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="flex flex-row items-center bg-b-surface2 border border-s-stroke2 rounded-[10px] px-3 py-2 flex-1 md:flex-none md:w-[315px] h-12 gap-2 shadow-xs">
            <RiSearchLine size={20} className="text-t-secondary dark:text-t-tertiary shrink-0" />
            <input
              type="text"
              placeholder="Search"
              className="bg-transparent border-none outline-none text-sm text-t-primary dark:text-t-primary placeholder-t-secondary w-full"
            />
          </div>

          <button className="btn btn-outline w-12 h-12 !px-0 rounded-[10px] flex items-center justify-center relative shrink-0 cursor-pointer">
            <RiNotification3Line size={20} />
            <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-primary-03" />
          </button>

          <button className="btn btn-outline w-12 h-12 !px-0 rounded-[10px] flex items-center justify-center shrink-0 cursor-pointer">
            <RiMailLine size={20} />
          </button>

          <div className="flex items-center justify-center size-12 rounded-full border border-s-stroke2 bg-b-surface2 shrink-0 cursor-pointer shadow-xs">
            <div className="size-9 rounded-full bg-b-depth text-t-primary flex items-center justify-center text-xs font-bold">
              AA
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end mt-2">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-t-secondary dark:text-t-tertiary max-w-[600px] leading-relaxed m-0">
            Create a test via DTP PDF Upload. Our AI will automatically crop questions and process the answer key.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-[900px] mt-4">
        
        {/* Basic Details */}
        <PremiumCard padding="large" className="relative z-20 !overflow-visible w-full flex flex-col gap-6">
          <h2 className="font-sans font-bold text-[20px] text-t-primary dark:text-t-primary flex items-center gap-2 m-0">
            <RiFileList3Line size={20} className="text-primary-02" /> Basic Details
          </h2>
          
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-t-primary dark:text-t-primary">Test Name</label>
              <input 
                type="text" 
                placeholder="e.g., Fortnightly Review 5 - JEE Pattern" 
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 rounded-[10px] h-12 px-4 text-sm text-t-primary dark:text-t-primary outline-none focus:border-primary-01 focus:ring-1 focus:ring-[#2A85FF] w-full placeholder:text-t-secondary"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 flex flex-col gap-2" ref={dropdownRef}>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-t-primary dark:text-t-primary">Target Batches</label>
                  {selectedBatches.length > 0 && (
                    <button 
                      onClick={() => setSelectedBatches([])}
                      className="text-[11px] text-primary-02 font-semibold hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                {/* Custom Multi-Select Trigger */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                  className="w-full bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 rounded-[10px] min-h-[48px] px-4 py-2 flex items-center relative cursor-pointer text-left transition-colors hover:border-s-stroke2 focus:border-primary-01 focus:ring-1 focus:ring-[#2A85FF]"
                  onClick={() => setIsDropdownOpen((open) => !open)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setIsDropdownOpen((open) => !open);
                    }
                  }}
                >
                  <RiTeamLine size={18} className="text-t-secondary shrink-0 mr-2" />
                  
                  <div className="flex-1 flex flex-wrap gap-2">
                    {selectedBatches.length === 0 ? (
                      <span className="text-sm text-t-secondary my-auto">Select one or more batches...</span>
                    ) : (
                      selectedBatches.map(id => {
                        const batch = AVAILABLE_BATCHES.find(b => b.id === id);
                        return (
                          <span key={id} className="flex items-center gap-1.5 bg-primary-01/10 text-primary-01 px-2.5 py-1 rounded-[8px] text-xs font-bold border border-primary-01/20">
                            {batch?.name}
                            <span role="button" tabIndex={0} aria-label={`Remove ${batch?.name ?? "batch"}`} className="cursor-pointer hover:text-primary-01/80" onClick={(e) => removeBatch(e, id)}><RiCloseLine size={14} /></span>
                          </span>
                        );
                      })
                    )}
                  </div>
                  
                  <RiArrowDownSLine size={18} className="text-t-secondary shrink-0 ml-2" />
                  
                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div role="listbox" className="absolute top-[calc(100%+8px)] left-0 w-full bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/40 rounded-[14px] shadow-[0_18px_40px_rgba(0,0,0,0.14)] z-[60] max-h-[240px] overflow-y-auto p-2">
                      <div
                        className="mb-1 rounded-[8px] px-3 py-2.5 text-xs font-semibold text-primary-02 cursor-pointer border-b border-s-stroke2/40 hover:bg-b-surface1 dark:hover:bg-b-surface1/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBatches(AVAILABLE_BATCHES.map(b => b.id));
                        }}
                      >
                        {batchesLoading ? "Loading batches…" : `Select All (${AVAILABLE_BATCHES.length})`}
                      </div>
                      {batchesLoading ? (
                        <div className="flex items-center justify-center py-4 gap-2 text-t-secondary">
                          <RiLoader4Line size={16} className="animate-spin" />
                          <span className="text-xs font-sans">Loading your batches...</span>
                        </div>
                      ) : AVAILABLE_BATCHES.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-t-secondary text-center">
                          No batches found. Create a batch first.
                        </div>
                      ) : (
                        <>
                          {AVAILABLE_BATCHES.map(batch => {
                            const isSelected = selectedBatches.includes(batch.id);
                            return (
                              <div
                                key={batch.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBatch(batch.id);
                                }}
                                className={`flex min-h-11 items-center gap-3 px-3 cursor-pointer rounded-[8px] transition-colors ${isSelected ? 'bg-primary-01/8 text-t-primary' : 'hover:bg-b-surface1 dark:hover:bg-b-surface1/30'}`}
                              >
                                <div className={`w-4 h-4 rounded-[4px] border-[1.5px] flex items-center justify-center transition-colors ${isSelected ? "border-primary-01 bg-primary-01" : "border-s-stroke2"}`}>
                                  {isSelected && <RiCheckLine size={12} color="#fff" />}
                                </div>
                                <span className={`text-sm ${isSelected ? "text-t-primary font-semibold" : "text-t-secondary"}`}>
                                  {batch.name}
                                </span>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-semibold text-t-primary dark:text-t-primary">Test opens at</label>
                <div className="relative" ref={dateTimeRef}>
                  <button
                    type="button"
                    onClick={() => setIsDateTimeOpen((open) => !open)}
                    aria-haspopup="dialog"
                    aria-expanded={isDateTimeOpen}
                    className="w-full bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 rounded-[10px] h-12 px-4 flex items-center gap-3 text-left transition-colors hover:border-s-stroke2 focus:border-primary-01 focus:ring-1 focus:ring-[#2A85FF]"
                  >
                    <RiCalendarEventLine size={18} className="text-primary-02 shrink-0" />
                    <span className={`min-w-0 flex-1 truncate text-sm font-medium ${selectedStart ? "text-t-primary" : "text-t-secondary"}`}>
                      {selectedStart ? `${dateLabel} · ${timeLabel}` : "Select date and time"}
                    </span>
                    <RiArrowDownSLine size={18} className="text-t-secondary shrink-0" />
                  </button>

                  {isDateTimeOpen && (
                    <div role="dialog" aria-label="Select test opening date and time" className="absolute top-[calc(100%+8px)] right-0 z-[60] w-full min-w-[320px] rounded-[16px] border border-s-stroke2/50 bg-b-surface2 p-3 shadow-[0_20px_48px_rgba(0,0,0,0.18)] dark:bg-b-surface2">
                      <div className="flex items-center justify-between px-1 pb-3">
                        <button type="button" aria-label="Previous month" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex size-8 items-center justify-center rounded-[8px] text-t-secondary hover:bg-b-surface1 hover:text-t-primary">
                          <RiArrowLeftSLine size={18} />
                        </button>
                        <span className="text-sm font-bold text-t-primary">{monthLabel}</span>
                        <button type="button" aria-label="Next month" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex size-8 items-center justify-center rounded-[8px] text-t-secondary hover:bg-b-surface1 hover:text-t-primary">
                          <RiArrowRightSLine size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-t-secondary">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="py-1">{day}</span>)}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((date) => {
                          const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                          const isSelected = selectedStart?.toDateString() === date.toDateString();
                          const isToday = new Date().toDateString() === date.toDateString();
                          return (
                            <button
                              key={date.toISOString()}
                              type="button"
                              onClick={() => chooseDate(date)}
                              className={`flex h-9 items-center justify-center rounded-[8px] text-xs font-semibold transition-colors ${isSelected ? "bg-primary-01 text-white" : isToday ? "bg-primary-01/10 text-primary-01" : isCurrentMonth ? "text-t-primary hover:bg-b-surface1" : "text-t-tertiary hover:bg-b-surface1/60"}`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 border-t border-s-stroke2/40 pt-3">
                        <p className="mb-2 text-xs font-semibold text-t-secondary">Opening time</p>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <select value={selectedStart ? String(selectedStart.getHours()) : ""} onChange={(event) => updateTime("hours", event.target.value)} className="h-10 rounded-[8px] border border-s-stroke2/50 bg-b-surface1 px-3 text-sm font-semibold text-t-primary outline-none focus:border-primary-01">
                            <option value="" disabled>Hour</option>
                            {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}</option>)}
                          </select>
                          <span className="text-sm font-bold text-t-secondary">:</span>
                          <select value={selectedStart ? String(selectedStart.getMinutes()) : ""} onChange={(event) => updateTime("minutes", event.target.value)} className="h-10 rounded-[8px] border border-s-stroke2/50 bg-b-surface1 px-3 text-sm font-semibold text-t-primary outline-none focus:border-primary-01">
                            <option value="" disabled>Minute</option>
                            {Array.from({ length: 60 }, (_, minute) => <option key={minute} value={minute}>{String(minute).padStart(2, "0")}</option>)}
                          </select>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <button type="button" onClick={() => { const now = new Date(); setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setTestStart(toLocalDateTime(now)); }} className="h-9 rounded-[8px] px-3 text-xs font-semibold text-primary-02 hover:bg-primary-01/10">Set to now</button>
                          <button type="button" onClick={() => setIsDateTimeOpen(false)} className="h-9 rounded-[8px] bg-shade-02 px-4 text-xs font-semibold text-white hover:opacity-90">Done</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </PremiumCard>

        {errorMsg && (
          <div className="flex items-start gap-3 p-4 rounded-[10px] border border-primary-03/15 bg-primary-03/5">
            <RiAlertLine size={18} className="text-primary-03 shrink-0 mt-0.5" />
            <span className="text-sm text-primary-03 font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Upload Assets */}
        <PremiumCard padding="large" className="w-full flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-sans font-bold text-[20px] text-t-primary dark:text-t-primary flex items-center gap-2 m-0">
              <RiFileList3Line size={20} className="text-primary-02" /> Upload Test Assets
            </h2>
            <p className="text-xs text-t-secondary dark:text-t-tertiary m-0 mt-1">
              Upload the master DTP file. Our AI will automatically crop questions and process the answer key.
            </p>
          </div>

          <input 
            type="file" 
            ref={pdfInputRef} 
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)} 
            accept=".pdf" 
            className="hidden" 
          />
          <input 
            type="file" 
            ref={answerKeyInputRef} 
            onChange={(e) => setAnswerKeyFile(e.target.files?.[0] || null)} 
            accept=".csv,.pdf" 
            className="hidden" 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {/* PDF Upload Card */}
            <div 
              onClick={() => pdfInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file && file.type === "application/pdf") setPdfFile(file);
              }}
              className={`group/upload flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[16px] bg-b-surface1/30 dark:bg-b-surface1/10 cursor-pointer transition-all hover:bg-b-surface1 dark:hover:bg-b-surface1/30 ${pdfFile ? 'border-primary-01/60 shadow-inner' : 'border-s-stroke2/40 hover:border-primary-01/40'}`}
            >
              {pdfFile ? (
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary-01/10 text-primary-01 flex items-center justify-center mb-4">
                    <RiFileTextLine size={24} />
                  </div>
                  <div className="font-sans font-semibold text-t-primary dark:text-t-primary mb-1 max-w-[240px] truncate">
                    {pdfFile.name}
                  </div>
                  <div className="text-[11px] text-t-secondary dark:text-t-tertiary mb-3">
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setPdfFile(null);
                      if (pdfInputRef.current) pdfInputRef.current.value = "";
                    }}
                    className="text-xs font-semibold text-primary-03 hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
                  >
                    <RiDeleteBin6Line size={14} /> Remove PDF
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary-02/10 text-primary-02 flex items-center justify-center mb-4 group-hover/upload:scale-110 transition-transform">
                    <RiFileList3Line size={24} />
                  </div>
                  <div className="font-sans font-semibold text-t-primary dark:text-t-primary mb-1">Upload Master PDF</div>
                  <div className="text-[11px] text-t-secondary dark:text-t-tertiary text-center">Supports up to 200 pages.<br/>Ensure clear formatting.</div>
                </>
              )}
            </div>

            {/* Answer Key (CSV/PDF) Upload Card */}
            <div 
              onClick={() => answerKeyInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file && (file.type === "text/csv" || file.type === "application/pdf" || file.name.endsWith(".csv") || file.name.endsWith(".pdf"))) {
                  setAnswerKeyFile(file);
                }
              }}
              className={`group/upload flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[16px] bg-b-surface1/30 dark:bg-b-surface1/10 cursor-pointer transition-all hover:bg-b-surface1 dark:hover:bg-b-surface1/30 ${answerKeyFile ? 'border-primary-05/60 shadow-inner' : 'border-s-stroke2/40 hover:border-primary-05/40'}`}
            >
              {answerKeyFile ? (
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary-05/10 text-primary-05 flex items-center justify-center mb-4">
                    {answerKeyFile.name.toLowerCase().endsWith(".pdf") ? (
                      <RiFileTextLine size={24} />
                    ) : (
                      <RiCheckDoubleLine size={24} />
                    )}
                  </div>
                  <div className="font-sans font-semibold text-t-primary dark:text-t-primary mb-1 max-w-[240px] truncate">
                    {answerKeyFile.name}
                  </div>
                  <div className="text-[11px] text-t-secondary dark:text-t-tertiary mb-3">
                    {answerKeyFile.name.toLowerCase().endsWith(".pdf") 
                      ? `${(answerKeyFile.size / 1024 / 1024).toFixed(2)} MB`
                      : `${(answerKeyFile.size / 1024).toFixed(1)} KB`
                    }
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnswerKeyFile(null);
                      if (answerKeyInputRef.current) answerKeyInputRef.current.value = "";
                    }}
                    className="text-xs font-semibold text-primary-03 hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
                  >
                    <RiDeleteBin6Line size={14} /> Remove File
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary-05/10 text-primary-05 flex items-center justify-center mb-4 group-hover/upload:scale-110 transition-transform">
                    <RiCheckDoubleLine size={24} />
                  </div>
                  <div className="font-sans font-semibold text-t-primary dark:text-t-primary mb-1">Upload Answer Key (CSV or PDF) <span className="text-xs text-t-tertiary font-normal">(Optional)</span></div>
                  <div className="text-[11px] text-t-secondary dark:text-t-tertiary text-center">Optional. Upload a CSV key or PDF solution.<br/>If blank, we will read answers from the Master PDF.</div>
                </>
              )}
            </div>
          </div>
        </PremiumCard>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-2 w-full">
          <Link 
            href={returnPath}
            className="btn btn-outline h-12 px-6 rounded-[10px] text-sm font-semibold flex items-center justify-center w-full sm:w-auto"
          >
            Cancel
          </Link>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={status === "uploading" || status === "processing"}
            className="btn btn-primary h-12 px-6 rounded-[10px] text-sm font-semibold flex items-center justify-center gap-2 shadow-[0px_4px_12px_rgba(42,133,255,0.25)] w-full sm:w-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "uploading" || status === "processing" ? (
              <>
                <RiLoader4Line size={18} className="animate-spin" />
                Processing PDF...
              </>
            ) : (
              <>
                <RiCheckDoubleLine size={18} />
                Process Test via Smart Cropping
              </>
            )}
          </button>
        </div>

      </div>

      {(status === "uploading" || status === "processing") && (
        <div className="fixed inset-0 bg-b-surface1/90 dark:bg-b-surface1/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center gap-6 px-6 select-none">
          <div className="relative flex items-center justify-center">
            {/* Spinning Loader Ring */}
            <div className="size-16 border-4 border-primary-01/10 border-t-primary-01 rounded-full animate-spin" />
            <div className="absolute font-sans font-bold text-xs text-primary-01 animate-pulse">AI</div>
          </div>
          
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="font-sans font-bold text-[22px] tracking-tight text-t-primary dark:text-t-primary">
              AI Smart Cropping Test Generation
            </h3>
            <div className="px-4 py-2 rounded-full bg-primary-01/10 border border-primary-01/15 flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-01 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-01"></span>
              </span>
              <span className="font-sans font-bold text-xs text-primary-01 tracking-wide uppercase">
                {status === "uploading" ? "Uploading" : "Processing"}
              </span>
            </div>
          </div>

          <div className="w-full max-w-[380px] p-4 rounded-xl bg-b-surface2/60 dark:bg-b-surface2/30 border border-s-stroke2/40 flex flex-col gap-2 items-center text-center shadow-lg animate-fade-in">
            <div className="text-sm font-semibold text-t-primary dark:text-t-primary">
              {statusMsg}
            </div>
            <div className="text-[11px] text-t-tertiary">
              This might take a minute as we process the PDF layout, extract question coordinates, and crop visual diagrams.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
