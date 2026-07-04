"use client";
import { useEffect } from "react";
import { RiAlertLine, RiRefreshLine } from "@remixicon/react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // When Sentry is integrated: Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <RiAlertLine size={40} className="text-t-secondary" />
      <h2 className="text-xl font-semibold text-t-primary">Something went wrong</h2>
      <p className="text-sm text-t-secondary max-w-sm text-center">{error.message}</p>
      <button onClick={reset} className="btn btn-primary flex items-center gap-2">
        <RiRefreshLine size={16} /> Try again
      </button>
    </div>
  );
}
