import React from "react";
import { RiAlertFill, RiShieldCrossLine } from "@remixicon/react";

interface ProctorWarningModalProps {
  show: boolean;
  warningCount: number;
  maxWarnings: number;
  countdown: number;
  onResume: () => void;
}

export function ProctorWarningModal({
  show,
  warningCount,
  maxWarnings,
  countdown,
  onResume,
}: ProctorWarningModalProps) {
  if (!show) return null;

  const isFinalWarning = warningCount >= maxWarnings;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="card w-full max-w-md p-6 text-center md:p-8 animate-in zoom-in-95 duration-150 bg-b-surface1 border-red-500/40 shadow-dropdown">
        <div className="mb-3 flex justify-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
            {isFinalWarning ? (
              <RiShieldCrossLine size={44} />
            ) : (
              <RiAlertFill size={44} />
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-t-primary">
          {isFinalWarning ? "Test Auto-Submitting!" : "Proctoring Alert: Tab Switch Detected"}
        </h2>

        <p className="mt-3 text-sm text-t-secondary leading-relaxed">
          {isFinalWarning ? (
            <span className="text-red-500 font-semibold">
              You exceeded the maximum allowed tab switches ({maxWarnings}). Your test is being automatically submitted.
            </span>
          ) : (
            <>
              You navigated away from the test window. This event has been logged for your institute admin.
            </>
          )}
        </p>

        {!isFinalWarning && (
          <div className="my-6 rounded-md border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                Warning {warningCount} of {maxWarnings}
              </span>
              <span className="font-mono text-xl font-bold text-red-500 tabular-nums">
                {countdown}s
              </span>
            </div>
            <p className="mt-2 text-xs text-t-secondary">
              Return to test within <strong>{countdown} seconds</strong> or your paper will auto-submit.
            </p>
          </div>
        )}

        {!isFinalWarning && (
          <button
            onClick={onResume}
            className="w-full py-3.5 px-6 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-depth transition-all active:scale-98 cursor-pointer"
          >
            I Understand — Resume Test
          </button>
        )}
      </div>
    </div>
  );
}
