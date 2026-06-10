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
  const colorClass = pct >= 70 ? "p" : pct >= 50 ? "warning" : "danger";
  const isBooster = depth > 0;

  return (
    <div style={{ position: "relative" }}>
      <div className="rayum-card" style={{
          position: "relative",
          zIndex: 1,
          padding: "20px 24px",
          background: item.mastered ? "var(--p-10)" : "var(--bg-surface)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {isBooster && <span className="badge badge-orange"><RiFlashlightFill size={12} /> Booster {depth}</span>}
              {item.mastered && <span className="badge badge-green"><RiCheckboxCircleFill size={12} /> Mastered</span>}
              <span className="t-body-sm">{item.date}</span>
            </div>
            <div className="t-sub-s" style={{ color: "var(--fg-default)", marginBottom: 4 }}>{item.title}</div>
            <div className="t-body-sm">{item.questions} questions</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="t-heading-s" style={{ color: `var(--${colorClass}-50)` }}>{pct}%</div>
            <div className="t-body-sm">Score</div>
          </div>
        </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Link href={`/results/${item.id}`} className="btn btn-outline" style={{ fontSize: 13, padding: "6px 14px" }}>
              View Analysis
            </Link>
          </div>
      </div>

      {item.boosters && item.boosters.length > 0 && (
        <div style={{ 
          paddingLeft: 32, 
          marginTop: 16, 
          display: "flex", 
          flexDirection: "column", 
          gap: 16,
          borderLeft: "2px solid var(--border-default)",
          marginLeft: 32
        }}>
          {item.boosters.map((booster) => (
            <div key={booster.id} style={{ position: "relative" }}>
              <div style={{ position: "absolute", width: 32, height: 2, background: "var(--border-default)", left: -32, top: 40 }} />
              <TestChainItem item={booster} depth={depth + 1} />
            </div>
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
          <div className="t-body-sm text-bold" style={{ color: "var(--fg-default)" }}>Legend:</div>
          {[
            { label: "Original Test", color: "var(--n-40)" },
            { label: "Booster Test", color: "var(--p-50)" },
            { label: "Mastered", color: "var(--p-60)", icon: <RiCheckboxCircleFill size={16} color="var(--p-60)" /> },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {l.icon ? l.icon : <div style={{ width: 4, height: 16, background: l.color, borderRadius: 2 }} />}
              <span className="t-body-sm">{l.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-600)" }}>
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
