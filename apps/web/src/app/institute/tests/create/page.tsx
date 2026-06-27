"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  RiArrowLeftLine,
  RiCalendarEventLine,
  RiTeamLine,
  RiFileList3Line,
  RiUserAddLine,
  RiCheckDoubleLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine
} from "@remixicon/react";

const AVAILABLE_BATCHES = [
  { id: "batch-001", name: "JEE 2026 Morning" },
  { id: "batch-002", name: "JEE 2026 Evening" },
  { id: "batch-003", name: "NEET 2026 Droppers" },
  { id: "batch-004", name: "JEE 2025 Crash Course" },
];

export default function ScheduleTestPage() {
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
    <main style={{ padding: "32px 32px 64px 32px", maxWidth: 800, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/institute" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--fg-muted)", fontSize: 14, marginBottom: 16, textDecoration: "none" }}>
          <RiArrowLeftLine size={16} /> Back to Dashboard
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg-default)", marginBottom: 4 }}>
          Upload & Create Test
        </h1>
        <p className="text-body">Create a test via DTP PDF Upload.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Basic Details */}
        <section className="rayum-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <RiFileList3Line size={20} color="var(--primary-50)" /> Basic Details
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--fg-muted)", marginBottom: 8 }}>Test Name</label>
              <div className="input-field">
                <input type="text" placeholder="e.g., Fortnightly Review 5 - JEE Pattern" style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 14 }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }} ref={dropdownRef}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-muted)" }}>Target Batches</label>
                  {selectedBatches.length > 0 && (
                    <button 
                      onClick={() => setSelectedBatches([])}
                      style={{ fontSize: 11, color: "var(--primary-50)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                {/* Custom Multi-Select Trigger */}
                <div 
                  className="input-field" 
                  style={{ display: "flex", alignItems: "center", minHeight: "44px", height: "auto", cursor: "pointer", padding: "8px 12px", position: "relative" }}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <RiTeamLine size={18} color="var(--fg-muted)" style={{ flexShrink: 0, marginRight: 8 }} />
                  
                  <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedBatches.length === 0 ? (
                      <span style={{ color: "var(--fg-muted)", fontSize: 14, alignSelf: "center" }}>Select one or more batches...</span>
                    ) : (
                      selectedBatches.map(id => {
                        const batch = AVAILABLE_BATCHES.find(b => b.id === id);
                        return (
                          <div key={id} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--primary-10)", color: "var(--primary-50)", padding: "2px 8px", borderRadius: 16, fontSize: 12, fontWeight: 600 }}>
                            {batch?.name}
                            <RiCloseLine size={14} style={{ cursor: "pointer" }} onClick={(e) => removeBatch(e, id)} />
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <RiArrowDownSLine size={18} color="var(--fg-muted)" style={{ flexShrink: 0, marginLeft: 8 }} />
                  
                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10, maxHeight: 200, overflowY: "auto", padding: 4 }}>
                      <div 
                        style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "var(--primary-50)", cursor: "pointer", borderBottom: "1px solid var(--border-subtle)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBatches(AVAILABLE_BATCHES.map(b => b.id));
                        }}
                      >
                        Select All Batches
                      </div>
                      {AVAILABLE_BATCHES.map(batch => {
                        const isSelected = selectedBatches.includes(batch.id);
                        return (
                          <div 
                            key={batch.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBatch(batch.id);
                            }}
                            style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", cursor: "pointer", borderRadius: 6, background: isSelected ? "var(--bg-surface-hover)" : "transparent", transition: "background 0.1s" }}
                          >
                            <div style={{ width: 16, height: 16, border: `1.5px solid ${isSelected ? "var(--primary-50)" : "var(--border-strong)"}`, borderRadius: 4, background: isSelected ? "var(--primary-50)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {isSelected && <RiCheckLine size={14} color="#fff" />}
                            </div>
                            <span style={{ fontSize: 14, color: isSelected ? "var(--fg-default)" : "var(--fg-muted)", fontWeight: isSelected ? 600 : 400 }}>
                              {batch.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--fg-muted)", marginBottom: 8 }}>Date</label>
                <div className="input-field" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <RiCalendarEventLine size={18} color="var(--fg-muted)" />
                  <input type="date" style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 14, color: "var(--fg-default)" }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Upload Assets */}
        <section className="rayum-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <RiFileList3Line size={20} color="var(--primary-50)" /> Upload Test Assets
          </h2>
          <p style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 24 }}>
            Upload the master DTP file. Our AI will automatically crop questions and process the answer key.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* PDF Upload */}
            <div style={{ padding: 24, border: "2px dashed var(--border-default)", borderRadius: 8, textAlign: "center", background: "var(--bg-surface-hover)", cursor: "pointer", transition: "all 0.2s" }} className="hover-lift">
              <div style={{ marginBottom: 12 }}>
                <RiFileList3Line size={32} color="var(--primary-50)" style={{ margin: "0 auto" }} />
              </div>
              <div style={{ fontWeight: 600, color: "var(--fg-default)", marginBottom: 4 }}>Upload Master PDF</div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Supports up to 200 pages. Ensure clear formatting.</div>
            </div>

            {/* CSV Upload */}
            <div style={{ padding: 24, border: "2px dashed var(--border-default)", borderRadius: 8, textAlign: "center", background: "var(--bg-surface-hover)", cursor: "pointer", transition: "all 0.2s" }} className="hover-lift">
              <div style={{ marginBottom: 12 }}>
                <RiCheckDoubleLine size={32} color="var(--success-50)" style={{ margin: "0 auto" }} />
              </div>
              <div style={{ fontWeight: 600, color: "var(--fg-default)", marginBottom: 4 }}>Upload Answer Key (CSV)</div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Format: Question Number, Correct Option (A/B/C/D)</div>
            </div>
          </div>
        </section>

        {/* Submit */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
          <Link href="/institute" className="btn btn-outline">Cancel</Link>
          <Link href="/institute" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RiCheckDoubleLine size={18} /> Process Test via Smart Cropping
          </Link>
        </div>

      </div>
    </main>
  );
}
