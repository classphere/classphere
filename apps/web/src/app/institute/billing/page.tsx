"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { RiCheckFill, RiDownload2Line, RiCloseLine } from "@remixicon/react";

const mockInvoices = [
  { id: "INV-2023-001", date: "01 Jun 2026", amount: "$299.00", status: "Paid" },
  { id: "INV-2023-002", date: "01 May 2026", amount: "$299.00", status: "Paid" },
  { id: "INV-2023-003", date: "01 Apr 2026", amount: "$299.00", status: "Paid" },
];

export default function BillingPage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <>
      <Navbar title="Billing & Subscription" />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* Current Plan */}
        <div className="rayum-card" style={{ padding: 32, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, var(--primary-50), var(--secondary-50))", color: "white" }}>
          <div>
            <div className="rayum-badge" style={{ background: "rgba(255,255,255,0.2)", color: "white", marginBottom: 12 }}>Pro Plan</div>
            <h2 className="text-heading-l" style={{ margin: 0, marginBottom: 8 }}>Institute Pro</h2>
            <div className="text-body-large" style={{ opacity: 0.9 }}>Unlimited students, advanced analytics, custom branding.</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="text-heading-xl" style={{ margin: 0 }}>$299<span style={{ fontSize: 16, opacity: 0.8 }}>/mo</span></div>
            <div className="text-body-small" style={{ opacity: 0.8, marginTop: 4 }}>Renews on Jul 1, 2026</div>
            <button className="btn" style={{ background: "white", color: "var(--primary-50)", marginTop: 16 }} onClick={() => setShowUpgradeModal(true)}>Upgrade Plan</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          <div className="rayum-card" style={{ padding: 24 }}>
            <h3 className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 16 }}>Usage This Month</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span className="text-body-small" style={{ color: "var(--fg-default)", fontWeight: 600 }}>Active Students</span>
                  <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>1,204 / Unlimited</span>
                </div>
                <div style={{ height: 8, background: "var(--bg-body)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: "60%", height: "100%", background: "var(--primary-50)" }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span className="text-body-small" style={{ color: "var(--fg-default)", fontWeight: 600 }}>Storage Used</span>
                  <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>45GB / 100GB</span>
                </div>
                <div style={{ height: 8, background: "var(--bg-body)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: "45%", height: "100%", background: "var(--warning-50)" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <h3 className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 16 }}>Payment Method</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, border: "1px solid var(--border-default)", borderRadius: 8 }}>
              <div style={{ width: 48, height: 32, background: "var(--bg-body)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "var(--fg-muted)", fontSize: 12 }}>
                VISA
              </div>
              <div style={{ flex: 1 }}>
                <div className="text-body-large" style={{ color: "var(--fg-default)", fontWeight: 600 }}>•••• •••• •••• 4242</div>
                <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Expires 12/28</div>
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 12 }}>Edit</button>
            </div>
          </div>
        </div>

        {/* Invoice History */}
        <div className="rayum-card" style={{ padding: 24 }}>
          <h3 className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 16 }}>Invoice History</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ padding: "12px 0", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13 }}>Invoice ID</th>
                <th style={{ padding: "12px 0", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13 }}>Date</th>
                <th style={{ padding: "12px 0", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13 }}>Amount</th>
                <th style={{ padding: "12px 0", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13 }}>Status</th>
                <th style={{ padding: "12px 0", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textAlign: "right" }}>Download</th>
              </tr>
            </thead>
            <tbody>
              {mockInvoices.map(invoice => (
                <tr key={invoice.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 0", color: "var(--fg-default)", fontWeight: 500, fontSize: 14 }}>{invoice.id}</td>
                  <td style={{ padding: "16px 0", color: "var(--fg-default)", fontSize: 14 }}>{invoice.date}</td>
                  <td style={{ padding: "16px 0", color: "var(--fg-default)", fontSize: 14 }}>{invoice.amount}</td>
                  <td style={{ padding: "16px 0" }}>
                    <span className="rayum-badge green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <RiCheckFill size={12} /> {invoice.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 0", textAlign: "right" }}>
                    <button className="btn btn-ghost" style={{ padding: 4 }}>
                      <RiDownload2Line size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="rayum-card" style={{ width: 600, maxWidth: "90%", padding: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 className="text-heading-m" style={{ color: "var(--fg-default)", margin: 0 }}>Upgrade Subscription</h2>
                <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setShowUpgradeModal(false)}>
                  <RiCloseLine size={24} />
                </button>
              </div>
              <p className="text-body" style={{ color: "var(--fg-muted)", marginBottom: 24 }}>You are currently on the <strong>Pro Plan</strong>. Select a tier below to request an upgrade from the Super Admin.</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ padding: 24, border: "2px solid var(--success-50)", borderRadius: 12, background: "rgba(34, 197, 94, 0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 className="text-heading-s" style={{ color: "var(--fg-default)" }}>Enterprise Plan</h3>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, marginTop: 8, color: "var(--fg-muted)", fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                      <li>✓ Unlimited Students</li>
                      <li>✓ Custom App Branding (White-label)</li>
                      <li>✓ 24/7 Dedicated Support</li>
                    </ul>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="text-heading-l" style={{ color: "var(--fg-default)" }}>Custom</div>
                    <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowUpgradeModal(false)}>Contact Sales</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  );
}
