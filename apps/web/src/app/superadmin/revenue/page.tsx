"use client";

import Navbar from "@/components/layout/Navbar";
import { RiMoneyDollarCircleLine, RiArrowRightUpLine, RiBarChartBoxLine, RiFileList3Line } from "@remixicon/react";

const mockTransactions = [
  { id: "TXN-001", institute: "Aakash Institute (Delhi)", amount: "$299.00", plan: "Pro", date: "01 Jun 2026", status: "Success" },
  { id: "TXN-002", institute: "Allen Career Institute", amount: "$599.00", plan: "Enterprise", date: "01 Jun 2026", status: "Success" },
  { id: "TXN-003", institute: "Vibrant Academy", amount: "$99.00", plan: "Starter", date: "28 May 2026", status: "Success" },
  { id: "TXN-004", institute: "Future Point Classes", amount: "$99.00", plan: "Starter", date: "25 May 2026", status: "Failed" },
];

export default function RevenuePage() {
  return (
    <>
      <Navbar title="Revenue & Subscriptions" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 }}>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "rgba(34, 197, 94, 0.1)", borderRadius: 8, color: "var(--accent-green)" }}>
                <RiMoneyDollarCircleLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Monthly Recurring Revenue</h3>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 800 }}>$124,500</div>
              <span className="rayum-badge green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <RiArrowRightUpLine size={12} /> +12%
              </span>
            </div>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "var(--primary-10)", borderRadius: 8, color: "var(--primary-50)" }}>
                <RiBarChartBoxLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>ARPU</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>$296.42</div>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>Avg. Rev Per User (Institute)</p>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "rgba(239, 68, 68, 0.1)", borderRadius: 8, color: "var(--error-50)" }}>
                <RiFileList3Line size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Churn Rate</h3>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 800 }}>1.2%</div>
              <span className="rayum-badge red" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                +0.2%
              </span>
            </div>
          </div>
          
          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
                <RiMoneyDollarCircleLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Net Revenue (YTD)</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>$1.4M</div>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>Jan 1 - Present</p>
          </div>
        </div>

        {/* Subscription Tiers */}
        <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 16 }}>Active Subscription Tiers</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 32 }}>
          {/* Starter Plan */}
          <div className="rayum-card" style={{ padding: 24, borderTop: "4px solid var(--border-default)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="text-heading-s">Starter Plan</h3>
              <span className="rayum-badge gray">14 Institutes</span>
            </div>
            <div className="text-heading-l" style={{ marginBottom: 16 }}>$99<span className="text-body-small" style={{ color: "var(--fg-muted)" }}>/mo</span></div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, color: "var(--fg-muted)" }}>
              <li>Up to 500 Students</li>
              <li>Basic Reporting</li>
              <li>Standard Question Bank</li>
            </ul>
            <button className="btn btn-outline" style={{ width: "100%", marginTop: 24 }}>Edit Tier</button>
          </div>
          
          {/* Pro Plan */}
          <div className="rayum-card" style={{ padding: 24, borderTop: "4px solid var(--primary-50)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="text-heading-s">Pro Plan</h3>
              <span className="rayum-badge blue">22 Institutes</span>
            </div>
            <div className="text-heading-l" style={{ marginBottom: 16 }}>$299<span className="text-body-small" style={{ color: "var(--fg-muted)" }}>/mo</span></div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, color: "var(--fg-muted)" }}>
              <li>Up to 5,000 Students</li>
              <li>Advanced Analytics</li>
              <li>AI Analysis Features</li>
            </ul>
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 24 }}>Edit Tier</button>
          </div>

          {/* Enterprise Plan */}
          <div className="rayum-card" style={{ padding: 24, borderTop: "4px solid var(--success-50)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="text-heading-s">Enterprise Plan</h3>
              <span className="rayum-badge purple">6 Institutes</span>
            </div>
            <div className="text-heading-l" style={{ marginBottom: 16 }}>Custom</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, color: "var(--fg-muted)" }}>
              <li>Unlimited Students</li>
              <li>Dedicated Account Manager</li>
              <li>Custom Integrations</li>
            </ul>
            <button className="btn btn-outline" style={{ width: "100%", marginTop: 24 }}>Edit Tier</button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rayum-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-default)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="text-heading-s" style={{ margin: 0 }}>Recent Transactions</h2>
            <button className="btn btn-ghost" style={{ fontSize: 13 }}>Download CSV</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Transaction ID</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Institute</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Plan</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Amount</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Date</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockTransactions.map(txn => (
                <tr key={txn.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 24px", color: "var(--fg-muted)", fontSize: 14 }}>{txn.id}</td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontWeight: 500, fontSize: 14 }}>{txn.institute}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <span className={`rayum-badge ${txn.plan === "Enterprise" ? "purple" : txn.plan === "Pro" ? "blue" : "gray"}`}>
                      {txn.plan}
                    </span>
                  </td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontWeight: 600, fontSize: 14 }}>{txn.amount}</td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-muted)", fontSize: 14 }}>{txn.date}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <span className={`rayum-badge ${txn.status === "Success" ? "green" : "red"}`}>
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </>
  );
}
