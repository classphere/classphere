"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  RiArrowLeftLine,
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
} from "@remixicon/react";
import { useBatches } from "@/lib/hooks/useBatches";
import { useAuth } from "@/lib/auth-context";
import { PremiumCard } from "@/components/premium-ui";

export default function ScheduleTestPage() {
  const { batches, loading: batchesLoading } = useBatches();
  const AVAILABLE_BATCHES = batches.map(b => ({ id: b.id, name: b.name }));

  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
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

  return (
    <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">
      
      {/* ── Top Navigation Row (Figma Style) ── */}
      <div className="flex flex-col md:flex-row justify-start md:justify-between items-start md:items-center w-full h-auto md:h-12 gap-4 md:gap-6">
        <div className="flex items-center gap-4">
          <Link href="/institute" className="btn btn-outline w-12 h-12 !px-0 rounded-[10px] flex items-center justify-center shrink-0 cursor-pointer">
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
        <PremiumCard padding="large" className="w-full flex flex-col gap-6">
          <h2 className="font-sans font-bold text-[20px] text-t-primary dark:text-t-primary flex items-center gap-2 m-0">
            <RiFileList3Line size={20} className="text-primary-02" /> Basic Details
          </h2>
          
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-t-primary dark:text-t-primary">Test Name</label>
              <input 
                type="text" 
                placeholder="e.g., Fortnightly Review 5 - JEE Pattern" 
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
                  className="bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 rounded-[10px] min-h-[48px] px-4 py-2 flex items-center relative cursor-pointer focus-within:border-primary-01 focus-within:ring-1 focus-within:ring-[#2A85FF]"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <RiTeamLine size={18} className="text-t-secondary shrink-0 mr-2" />
                  
                  <div className="flex-1 flex flex-wrap gap-2">
                    {selectedBatches.length === 0 ? (
                      <span className="text-sm text-t-secondary my-auto">Select one or more batches...</span>
                    ) : (
                      selectedBatches.map(id => {
                        const batch = AVAILABLE_BATCHES.find(b => b.id === id);
                        return (
                          <div key={id} className="flex items-center gap-1.5 bg-primary-01/10 text-primary-01 px-2.5 py-1 rounded-[10px] text-xs font-bold border border-primary-01/20">
                            {batch?.name}
                            <RiCloseLine size={14} className="cursor-pointer hover:text-primary-01/80" onClick={(e) => removeBatch(e, id)} />
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <RiArrowDownSLine size={18} className="text-t-secondary shrink-0 ml-2" />
                  
                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/40 rounded-[10px] shadow-dropdown z-50 max-h-[200px] overflow-y-auto p-1">
                      <div
                        className="px-3 py-2 text-xs font-semibold text-primary-02 cursor-pointer border-b border-s-stroke2/40 hover:bg-b-surface1 dark:hover:bg-b-surface1/30"
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
                                className={`flex items-center gap-3 px-3 py-2 mt-1 cursor-pointer rounded-md transition-colors ${isSelected ? 'bg-b-surface1 dark:bg-b-surface1/30' : 'hover:bg-b-surface1 dark:hover:bg-b-surface1/30'}`}
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
                <label className="text-sm font-semibold text-t-primary dark:text-t-primary">Date</label>
                <div className="bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 rounded-[10px] h-12 px-4 flex items-center gap-3 focus-within:border-primary-01 focus-within:ring-1 focus-within:ring-[#2A85FF]">
                  <RiCalendarEventLine size={18} className="text-t-secondary" />
                  <input type="date" className="border-none bg-transparent outline-none w-full text-sm text-t-primary" />
                </div>
              </div>
            </div>
          </div>
        </PremiumCard>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {/* PDF Upload */}
            <div className="group/upload flex flex-col items-center justify-center p-8 border-2 border-dashed border-s-stroke2/40 rounded-[16px] bg-b-surface1/30 dark:bg-b-surface1/10 cursor-pointer transition-all hover:bg-b-surface1 dark:hover:bg-b-surface1/30 hover:border-primary-01/40">
              <div className="w-12 h-12 rounded-full bg-primary-02/10 text-primary-02 flex items-center justify-center mb-4 group-hover/upload:scale-110 transition-transform">
                <RiFileList3Line size={24} />
              </div>
              <div className="font-sans font-semibold text-t-primary dark:text-t-primary mb-1">Upload Master PDF</div>
              <div className="text-[11px] text-t-secondary dark:text-t-tertiary text-center">Supports up to 200 pages.<br/>Ensure clear formatting.</div>
            </div>

            {/* CSV Upload */}
            <div className="group/upload flex flex-col items-center justify-center p-8 border-2 border-dashed border-s-stroke2/40 rounded-[16px] bg-b-surface1/30 dark:bg-b-surface1/10 cursor-pointer transition-all hover:bg-b-surface1 dark:hover:bg-b-surface1/30 hover:border-primary-05/40">
              <div className="w-12 h-12 rounded-full bg-primary-05/10 text-primary-05 flex items-center justify-center mb-4 group-hover/upload:scale-110 transition-transform">
                <RiCheckDoubleLine size={24} />
              </div>
              <div className="font-sans font-semibold text-t-primary dark:text-t-primary mb-1">Upload Answer Key (CSV)</div>
              <div className="text-[11px] text-t-secondary dark:text-t-tertiary text-center">Format: Question Number,<br/>Correct Option (A/B/C/D)</div>
            </div>
          </div>
        </PremiumCard>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-2 w-full">
          <Link href="/institute" className="btn btn-outline h-12 px-6 rounded-[10px] text-sm font-semibold flex items-center justify-center w-full sm:w-auto">
            Cancel
          </Link>
          <Link href="/institute" className="btn btn-primary h-12 px-6 rounded-[10px] text-sm font-semibold flex items-center justify-center gap-2 shadow-[0px_4px_12px_rgba(42,133,255,0.25)] w-full sm:w-auto">
            <RiCheckDoubleLine size={18} /> Process Test via Smart Cropping
          </Link>
        </div>

      </div>
    </main>
  );
}
