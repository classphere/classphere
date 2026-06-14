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
          Schedule Collaborative Test
        </h1>
        <p className="text-body">Create a test shell and assign sections to your subject teachers.</p>
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

        {/* Teacher Assignments */}
        <section className="rayum-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <RiUserAddLine size={20} color="var(--primary-50)" /> Assign Sections to Teachers
          </h2>
          <p style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 24 }}>
            Selected teachers will receive a task on their dashboard to populate their respective sections.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Physics */}
            <div style={{ padding: 16, border: "1px solid var(--border-default)", borderRadius: 8, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 100, fontWeight: 600 }}>Physics</div>
              <div style={{ flex: 1 }}>
                <select className="input-field" style={{ width: "100%", padding: "8px 12px", fontSize: 14 }} defaultValue="t1">
                  <option value="" disabled>Assign to...</option>
                  <option value="t1">Dr. Vikram Seth</option>
                  <option value="t2">Prof. HC Verma</option>
                </select>
              </div>
              <div style={{ width: 120 }}>
                <input type="number" placeholder="Q. Count" defaultValue={25} className="input-field" style={{ width: "100%", padding: "8px 12px", fontSize: 14 }} />
              </div>
            </div>

            {/* Chemistry */}
            <div style={{ padding: 16, border: "1px solid var(--border-default)", borderRadius: 8, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 100, fontWeight: 600 }}>Chemistry</div>
              <div style={{ flex: 1 }}>
                <select className="input-field" style={{ width: "100%", padding: "8px 12px", fontSize: 14 }} defaultValue="">
                  <option value="" disabled>Assign to...</option>
                  <option value="t3">Dr. Rakesh Sharma</option>
                  <option value="t4">Ms. Anjali Desai</option>
                </select>
              </div>
              <div style={{ width: 120 }}>
                <input type="number" placeholder="Q. Count" defaultValue={25} className="input-field" style={{ width: "100%", padding: "8px 12px", fontSize: 14 }} />
              </div>
            </div>

            {/* Maths */}
            <div style={{ padding: 16, border: "1px solid var(--border-default)", borderRadius: 8, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 100, fontWeight: 600 }}>Mathematics</div>
              <div style={{ flex: 1 }}>
                <select className="input-field" style={{ width: "100%", padding: "8px 12px", fontSize: 14 }} defaultValue="">
                  <option value="" disabled>Assign to...</option>
                  <option value="t5">Mr. Anand Kumar</option>
                </select>
              </div>
              <div style={{ width: 120 }}>
                <input type="number" placeholder="Q. Count" defaultValue={25} className="input-field" style={{ width: "100%", padding: "8px 12px", fontSize: 14 }} />
              </div>
            </div>

          </div>
        </section>

        {/* Submit */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
          <Link href="/institute" className="btn btn-outline">Cancel</Link>
          <Link href="/institute" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RiCheckDoubleLine size={18} /> Schedule & Notify Teachers
          </Link>
        </div>

      </div>
    </main>
  );
}
