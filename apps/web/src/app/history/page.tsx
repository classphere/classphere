"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { mockHistory } from "@/lib/mock-data";

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
  const color = pct >= 70 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";
  const isBooster = depth > 0;

  return (
    <div style={{ display: "flex", gap: 0 }}>
      {depth > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 16, width: 24, flexShrink: 0 }}>
          <div style={{ width: 2, height: 20, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: isBooster ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.15)", border: `2px solid ${isBooster ? "#f97316" : "rgba(255,255,255,0.2)"}`, flexShrink: 0 }} />
          {item.boosters.length > 0 && <div style={{ width: 2, flex: 1, background: "rgba(255,255,255,0.1)" }} />}
        </div>
      )}

      <div style={{ flex: 1, marginBottom: 12 }}>
        <div
          className="glass glass-hover"
          style={{
            borderRadius: 14, padding: "16px 18px",
            borderLeft: isBooster ? "3px solid rgba(249,115,22,0.3)" : "3px solid rgba(255,255,255,0.08)",
            background: item.mastered ? "rgba(34,197,94,0.04)" : undefined,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {isBooster && <span className="badge badge-orange" style={{ fontSize: "0.65rem" }}>⚡ Booster {depth}</span>}
                {item.mastered && <span className="badge badge-green" style={{ fontSize: "0.65rem" }}>✅ Mastered</span>}
                <span style={{ color: "#334155", fontSize: "0.72rem" }}>{item.date}</span>
              </div>
              <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "0.9rem", marginBottom: 4 }}>{item.title}</div>
              <div style={{ color: "#475569", fontSize: "0.78rem" }}>{item.questions} questions</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color }}>{pct}%</div>
              <div style={{ fontSize: "0.7rem", color: "#334155" }}>Score</div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Link href={`/results/${item.id}`} className="btn-ghost" style={{ fontSize: "0.75rem", padding: "4px 12px" }}>
              View Analysis
            </Link>
          </div>
        </div>

        {/* Recursive boosters */}
        {item.boosters.length > 0 && (
          <div style={{ marginTop: 0, marginLeft: depth === 0 ? 24 : 0 }}>
            {item.boosters.map((booster) => (
              <TestChainItem key={booster.id} item={booster} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
            Test History
          </h1>
          <p style={{ color: "#64748b" }}>
            Your test chains — from original test to booster to mastery
          </p>
        </div>

        {/* Legend */}
        <div
          className="glass"
          style={{ borderRadius: 14, padding: "16px 20px", marginBottom: 28, display: "flex", gap: 20, flexWrap: "wrap" }}
        >
          <div style={{ fontSize: "0.78rem", color: "#475569", fontWeight: 600, alignSelf: "center" }}>Legend:</div>
          {[
            { label: "Original Test", color: "rgba(255,255,255,0.2)" },
            { label: "Booster Test", color: "#f97316" },
            { label: "Mastered ✅", color: "#22c55e" },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 16, background: l.color, borderRadius: 2 }} />
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{l.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {mockHistory.map((item) => (
            <div key={item.id}>
              <TestChainItem item={item} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
