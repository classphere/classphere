"use client";

import Link from "next/link";
import { RiToolsFill, RiArrowLeftLine } from "@remixicon/react";

interface ComingSoonProps {
  title: string;
  description?: string;
  backUrl?: string;
  backLabel?: string;
}

export default function ComingSoon({ 
  title, 
  description = "We're currently building this feature. Check back soon!", 
  backUrl = "/", 
  backLabel = "Back to Dashboard" 
}: ComingSoonProps) {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "calc(100vh - 80px)",
      padding: "24px",
      textAlign: "center"
    }}>
      <div style={{ 
        width: 80, 
        height: 80, 
        borderRadius: "50%", 
        background: "var(--primary-10)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        marginBottom: 24
      }}>
        <RiToolsFill size={40} color="var(--primary-50)" />
      </div>
      
      <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--fg-default)", marginBottom: 12 }}>
        {title}
      </h1>
      
      <p style={{ fontSize: 16, color: "var(--fg-muted)", maxWidth: 400, marginBottom: 32, lineHeight: 1.5 }}>
        {description}
      </p>

      <Link href={backUrl} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <RiArrowLeftLine size={18} /> {backLabel}
      </Link>
    </div>
  );
}
