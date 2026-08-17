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
  backLabel = "Back to Dashboard",
}: ComingSoonProps) {
  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary-02/10">
        <RiToolsFill size={40} className="text-primary-02" />
      </div>

      <h1 className="mb-3 text-[32px] font-extrabold text-t-primary">{title}</h1>

      <p className="mb-8 max-w-[400px] text-[16px] leading-relaxed text-t-secondary">
        {description}
      </p>

      <Link href={backUrl} className="btn btn-primary inline-flex items-center gap-2 no-underline">
        <RiArrowLeftLine size={18} /> {backLabel}
      </Link>
    </div>
  );
}
