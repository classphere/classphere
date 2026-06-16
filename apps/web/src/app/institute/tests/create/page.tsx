"use client";

import Link from "next/link";
import { 
  RiArrowLeftLine,
  RiCalendarEventLine,
  RiTeamLine,
  RiFileList3Line,
  RiUserAddLine,
  RiCheckDoubleLine
} from "@remixicon/react";

export default function ScheduleTestPage() {
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
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--fg-muted)", marginBottom: 8 }}>Target Batch</label>
                <div className="input-field" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <RiTeamLine size={18} color="var(--fg-muted)" />
                  <select style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 14, color: "var(--fg-default)" }}>
                    <option>JEE 2026 Morning</option>
                    <option>JEE 2026 Evening</option>
                    <option>NEET 2026 Droppers</option>
                  </select>
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
