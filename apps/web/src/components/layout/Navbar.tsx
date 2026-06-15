"use client";

import { mockUser } from "@/lib/mock-data";
import {
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiArrowDownSLine,
  RiVerifiedBadgeFill
} from "@remixicon/react";

export default function Navbar({ title, subtitle, breadcrumbs }: { title?: string, subtitle?: string, breadcrumbs?: string }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "32px 32px 24px 32px",
        background: "transparent",
        width: "100%"
      }}
    >
      <div>
        {breadcrumbs ? (
          <div className="breadcrumb" style={{ marginBottom: 12 }}>
            <span className="breadcrumb-current">{breadcrumbs.split(" > ")[0]}</span>
            <span className="breadcrumb-sep">›</span>
            <span>{breadcrumbs.split(" > ").slice(1).join(" › ")}</span>
          </div>
        ) : null}

        <h1 className="t-heading" style={{ color: "var(--fg-default)", marginBottom: 4 }}>
          {title || `Good morning, ${mockUser.name.split(" ")[0]}`}
        </h1>

        <p className="t-body" style={{ color: "var(--fg-muted)" }}>
          {subtitle || "Here's your daily briefing. You are 12% ahead of target this week."}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>

        {/* Icons */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-default)", display: "flex", alignItems: "center" }}>
            <RiSearchLine size={22} />
          </button>

          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-default)", position: "relative", display: "flex", alignItems: "center" }}>
            <RiNotification3Line size={22} />
            <div className="notif-dot" style={{ background: "var(--p-50)" }} />
          </button>

          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-default)", position: "relative", display: "flex", alignItems: "center" }}>
            <RiMailLine size={22} />
            <div className="notif-dot" style={{ background: "var(--p-50)" }} />
          </button>
        </div>

        {/* Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginLeft: 8 }}>
          <div className="avatar avatar-lg">
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mockUser.name)}&background=3765F6&color=fff&size=88`} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div className="text-body-large text-bold">{mockUser.name}</div>
              <span style={{ color: "var(--s-50)", display: "flex", alignItems: "center" }}>
                <RiVerifiedBadgeFill size={16} />
              </span>
            </div>
            <div className="t-body-sm">@{mockUser.name.split(" ")[0].toLowerCase()}</div>
          </div>
          <span style={{ color: "var(--fg-muted)", display: "flex", alignItems: "center", marginLeft: 4 }}>
            <RiArrowDownSLine size={20} />
          </span>
        </div>

      </div>
    </header>
  );
}
