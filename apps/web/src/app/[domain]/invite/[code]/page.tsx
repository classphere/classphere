"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  RiTeamLine,
  RiBuilding4Line,
  RiFlashlightFill,
  RiCheckLine
} from "@remixicon/react";

export default function InviteLandingPage() {
  const params = useParams();
  const inviteCode = params.code as string;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-default)" }}>
      {/* Top Nav (simplified for landing) */}
      <header style={{ padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--secondary-50)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <RiFlashlightFill size={18} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 22, color: "var(--fg-default)" }}>Classphere</span>
        </Link>
        <Link href="/login" className="btn btn-outline" style={{ padding: "8px 16px" }}>Login</Link>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="rayum-card" style={{ maxWidth: 480, width: "100%", padding: 40, textAlign: "center" }}>
          
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34, 197, 94, 0.1)", color: "var(--accent-green)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <RiTeamLine size={32} />
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: "var(--fg-default)" }}>
            You've been invited!
          </h1>
          <p className="text-body" style={{ marginBottom: 32 }}>
            You have been invited to join a batch on Classphere.
          </p>

          <div style={{ background: "var(--neutral-10)", borderRadius: 12, padding: 24, textAlign: "left", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, background: "white", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", boxShadow: "var(--shadow-100)" }}>
                <RiBuilding4Line size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--fg-default)" }}>Aakash Institute</div>
                <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Invited by Dr. Vikram Seth</div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: 16 }}>
              <div style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 4 }}>Batch</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "var(--fg-default)" }}>JEE 2026 Morning</div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 4 }}>Invite Code: {inviteCode}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="btn btn-primary" style={{ width: "100%", padding: "16px", fontSize: 16 }}>
              Accept Invite & Join Batch
            </button>
            <p style={{ fontSize: 13, color: "var(--fg-muted)" }}>
              If you don't have an account, we'll create one for you.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--fg-muted)" }}>
              <RiCheckLine size={18} color="var(--accent-green)" /> Access to scheduled institute tests
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--fg-muted)" }}>
              <RiCheckLine size={18} color="var(--accent-green)" /> Detailed batch-level AI analysis
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--fg-muted)" }}>
              <RiCheckLine size={18} color="var(--accent-green)" /> Track your rank against your peers
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
