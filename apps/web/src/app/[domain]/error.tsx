"use client";

import { useEffect } from "react";
import { RiAlertFill } from "@remixicon/react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary] Caught error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div className="bg-b-surface2 border border-s-stroke2 rounded-[24px] p-10 max-w-md w-full shadow-lg">
        <div className="mx-auto w-16 h-16 bg-primary-03/10 text-primary-03 rounded-full flex items-center justify-center mb-6">
          <RiAlertFill size={32} />
        </div>
        <h1 className="text-[22px] font-black tracking-tight text-t-primary mb-3">
          Something went wrong
        </h1>
        <p className="text-[14px] text-t-secondary mb-8 leading-relaxed">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2.5 bg-b-surface1 border border-s-stroke2 hover:bg-b-surface2 text-t-primary text-[14px] font-semibold rounded-[10px] cursor-pointer"
          >
            Reload Page
          </button>
          <button
            onClick={() => reset()}
            className="flex-1 px-4 py-2.5 bg-gradient-to-b from-[#2C2C2C] to-[#282828] hover:from-[#3c3c3c] hover:to-[#383838] text-white text-[14px] font-semibold rounded-[10px] cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
