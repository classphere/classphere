"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { mockStudentDPPs } from "@/lib/mock-data";
import {
  RiFileListLine,
  RiTimeLine,
  RiCheckLine,
  RiAlertLine,
  RiArrowRightLine,
} from "@remixicon/react";

const statusConfig = {
  pending:   { label: "Pending",   bg: "#FFFBEB", color: "#D97706", border: "#F59E0B" },
  completed: { label: "Completed", bg: "#F0FDF4", color: "#16A34A", border: "#22C55E" },
  late:      { label: "Late",      bg: "#FEF2F2", color: "#DC2626", border: "#EF4444" },
  upcoming:  { label: "Upcoming",  bg: "var(--n-10)", color: "var(--fg-muted)", border: "var(--border-default)" },
};

export default function AssignmentsPage() {
  const pending   = mockStudentDPPs.filter(d => d.status === "pending");
  const late      = mockStudentDPPs.filter(d => d.status === "late");
  const completed = mockStudentDPPs.filter(d => d.status === "completed");

  return (
    <>
      <Navbar title="My DPPs" subtitle="Daily practice problems assigned by your teacher." breadcrumbs="My DPPs" />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "0 32px 48px" }}>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Pending",   value: pending.length,   color: "#D97706", bg: "#FFFBEB" },
            { label: "Late",      value: late.length,      color: "#DC2626", bg: "#FEF2F2" },
            { label: "Completed", value: completed.length, color: "#16A34A", bg: "#F0FDF4" },
          ].map(s => (
            <div key={s.label} className="rayum-card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RiFileListLine size={22} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div className="t-body-sm">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Late — show first, most urgent */}
        {late.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <RiAlertLine size={18} color="#DC2626" />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#DC2626" }}>Overdue ({late.length})</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {late.map(dpp => <DPPCard key={dpp.id} dpp={dpp} />)}
            </div>
          </div>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <RiTimeLine size={18} color="#D97706" />
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Pending ({pending.length})</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pending.map(dpp => <DPPCard key={dpp.id} dpp={dpp} />)}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <RiCheckLine size={18} color="#16A34A" />
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Completed ({completed.length})</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {completed.map(dpp => <DPPCard key={dpp.id} dpp={dpp} />)}
            </div>
          </div>
        )}

        {mockStudentDPPs.length === 0 && (
          <div style={{ textAlign: "center", padding: 80, color: "var(--fg-muted)" }}>
            <RiFileListLine size={48} style={{ margin: "0 auto 16px" }} />
            <p style={{ fontWeight: 600 }}>No DPPs assigned yet.</p>
          </div>
        )}
      </main>
    </>
  );
}

function DPPCard({ dpp }: { dpp: typeof mockStudentDPPs[0] }) {
  const cfg = statusConfig[dpp.status];
  const isActionable = dpp.status === "pending" || dpp.status === "late";

  return (
    <div className="rayum-card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 20, border: `1.5px solid ${cfg.border}`, background: dpp.status === "completed" ? "#F0FDF4" : dpp.status === "late" ? "#FEF2F2" : "var(--bg-surface)" }}>

      {/* Icon */}
      <div style={{ width: 48, height: 48, borderRadius: "var(--r-md)", background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>
        {dpp.status === "completed" ? "✅" : dpp.status === "late" ? "⚠️" : "📝"}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{dpp.title}</div>
        <div style={{ fontSize: 13, color: "var(--fg-muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span>{dpp.subject} · {dpp.chapter}</span>
          <span>{dpp.totalQuestions} questions</span>
          <span style={{ color: cfg.color, fontWeight: 600 }}>Due: {dpp.dueDate}</span>
        </div>
      </div>

      {/* Score or Start button */}
      {dpp.status === "completed" ? (
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#16A34A" }}>{dpp.score}/{dpp.maxScore}</div>
          <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{dpp.timeTakenMin} min</div>
        </div>
      ) : (
        <Link
          href={`/assignments/${dpp.id}`}
          className="btn btn-primary"
          style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 8, background: dpp.status === "late" ? "#DC2626" : undefined }}
        >
          {dpp.status === "late" ? "Submit Late" : "Start DPP"} <RiArrowRightLine size={16} />
        </Link>
      )}
    </div>
  );
}
