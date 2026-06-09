"use client";

import { mockUser } from "@/lib/mock-data";
import {
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiCheckFill,
  RiArrowDownSLine
} from "@remixicon/react";

export default function Navbar({ title }: { title?: string }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "32px 32px 16px 32px",
        background: "transparent",
      }}
    >
      <div>
        <h1 className="text-h2" style={{ marginBottom: 4 }}>
          {title || `Good morning, ${mockUser.name.split(" ")[0]}`}
        </h1>
        {!title && (
          <p className="text-body-base" style={{ color: "var(--fg-muted)" }}>
            Here's your daily briefing. You are on a {mockUser.streakDays} day streak.
          </p>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        
        {/* Icons */}
        <div style={{ display: "flex", gap: 16 }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-default)", display: "flex", alignItems: "center" }}>
            <RiSearchLine size={20} />
          </button>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-default)", position: "relative", display: "flex", alignItems: "center" }}>
            <RiNotification3Line size={20} />
            <span style={{ 
              position: "absolute", top: -2, right: -2, width: 8, height: 8, 
              background: "var(--primary-50)", borderRadius: "50%",
              border: "2px solid var(--bg-default)"
            }} />
          </button>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-default)", display: "flex", alignItems: "center" }}>
            <RiMailLine size={20} />
          </button>
        </div>

        {/* Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--secondary-50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            {mockUser.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div className="text-bold" style={{ fontSize: 14 }}>{mockUser.name}</div>
              <span style={{ color: "var(--secondary-50)", display: "flex", alignItems: "center" }}>
                <RiCheckFill size={14} />
              </span>
            </div>
            <div className="text-body" style={{ fontSize: 12 }}>@{mockUser.name.split(" ")[0].toLowerCase()}</div>
          </div>
          <span style={{ color: "var(--fg-muted)", display: "flex", alignItems: "center", marginLeft: 4 }}>
            <RiArrowDownSLine size={16} />
          </span>
        </div>

      </div>
    </header>
  );
}
