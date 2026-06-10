"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { mockHistory } from "@/lib/mock-data";
import {
  RiFlashlightFill,
  RiCheckboxCircleFill
} from "@remixicon/react";

type HistoryItem = {
  id: string;
  title: string;
  date: string;
  score: number;
  percentage: number;
  questions: number;
  mastered?: boolean;
  boosters: HistoryItem[];
};

function TestChainItem({ item, depth = 0 }: { item: HistoryItem; depth?: number }) {
  const pct = item.percentage;
  const colorClass = pct >= 70 ? "success" : pct >= 50 ? "warning" : "error";
  const isBooster = depth > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex" }}>
        {/* Indentation line markers */}
        {Array.from({ length: depth }).map((_, i) => (
          <div key={i} style={{ 
            width: 24, 
            borderLeft: i === depth - 1 ? "4px solid var(--primary-50)" : "1px dashed var(--border-subtle)", 
            marginLeft: i === 0 ? 12 : 0,
            marginRight: i === depth - 1 ? 16 : 0
          }} />
        ))}
        
        <div className="rayum-card" style={{
            flex: 1,
            padding: "16px 18px",
            borderLeft: depth === 0 ? "4px solid var(--border-default)" : "none",
            background: item.mastered ? "var(--success-10)" : "var(--bg-surface)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {isBooster && <span className="rayum-badge orange" style={{ fontSize: 10, display: "inline-flex", alignItems: "center", gap: 4 }}><RiFlashlightFill size={12} /> Booster {depth}</span>}
                {item.mastered && <span className="rayum-badge green" style={{ fontSize: 10, display: "inline-flex", alignItems: "center", gap: 4 }}><RiCheckboxCircleFill size={12} /> Mastered</span>}
                <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>{item.date}</span>
              </div>
              <div className="text-body-large" style={{ fontWeight: 600, color: "var(--fg-default)", marginBottom: 4 }}>{item.title}</div>
              <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>{item.questions} questions</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="text-heading-s" style={{ color: `var(--${colorClass}-50)` }}>{pct}%</div>
              <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Score</div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Link href={`/results/${item.id}`} className="btn btn-outline" style={{ fontSize: 12, padding: "4px 12px" }}>
              View Analysis
            </Link>
          </div>
        </div>
      </div>

      {/* Recursive boosters wrapper */}
      {item.boosters && item.boosters.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {item.boosters.map((booster) => (
            <TestChainItem key={booster.id} item={booster} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <>
      <Navbar title="Test History" />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* Legend */}
        <div className="rayum-card" style={{ padding: "16px 20px", marginBottom: "var(--space-600)", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)" }}>Legend:</div>
          {[
            { label: "Original Test", color: "var(--border-default)" },
            { label: "Booster Test", color: "var(--primary-50)" },
            { label: "Mastered", color: "var(--success-50)", icon: <RiCheckboxCircleFill size={14} color="var(--success-50)" /> },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {l.icon ? l.icon : <div style={{ width: 4, height: 16, background: l.color, borderRadius: 2 }} />}
              <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>{l.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-500)" }}>
          {mockHistory.map((item) => (
            <div key={item.id}>
              <TestChainItem item={item} />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
