"use client";

import Navbar from "@/components/layout/Navbar";
import { RiQuestionLine, RiMailSendLine, RiBookOpenLine } from "@remixicon/react";

export default function HelpPage() {
  return (
    <>
      <Navbar title="Help & Support" />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* Support Blocks */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          <div className="rayum-card" style={{ padding: 24, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--primary-10)", color: "var(--primary-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <RiBookOpenLine size={24} />
            </div>
            <h3 className="text-heading-s" style={{ color: "var(--fg-default)" }}>Documentation</h3>
            <p className="text-body-small" style={{ color: "var(--fg-muted)" }}>Read guides on how to use the ExamPrep platform.</p>
            <button className="btn btn-outline" style={{ marginTop: 8 }}>Browse Docs</button>
          </div>
          
          <div className="rayum-card" style={{ padding: 24, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--success-10)", color: "var(--success-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <RiMailSendLine size={24} />
            </div>
            <h3 className="text-heading-s" style={{ color: "var(--fg-default)" }}>Contact Support</h3>
            <p className="text-body-small" style={{ color: "var(--fg-muted)" }}>Can't find what you need? Send us a message.</p>
            <button className="btn btn-outline" style={{ marginTop: 8 }}>Email Us</button>
          </div>
        </div>

        {/* FAQs */}
        <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 16 }}>Frequently Asked Questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { q: "How do booster tests work?", a: "Booster tests are automatically generated after you complete a standard test. They focus entirely on the concepts you struggled with, providing targeted practice." },
            { q: "Can I review my past test answers?", a: "Yes, navigate to the Test History page and click on 'View Analysis' to see detailed explanations for every question." },
            { q: "How is the leaderboard calculated?", a: "The leaderboard ranks students based on their average score across all mock tests within a specific batch." },
          ].map((faq, i) => (
            <div key={i} className="rayum-card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <RiQuestionLine size={20} color="var(--primary-50)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h4 className="text-body-large" style={{ fontWeight: 600, color: "var(--fg-default)", marginBottom: 8 }}>{faq.q}</h4>
                  <p className="text-body-regular" style={{ color: "var(--fg-muted)", margin: 0 }}>{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </>
  );
}
