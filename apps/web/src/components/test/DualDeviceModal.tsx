import React from "react";
import { RiSmartphoneLine, RiShieldUserLine } from "@remixicon/react";

interface DualDeviceModalProps {
  show: boolean;
  onExit: () => void;
}

export function DualDeviceModal({ show, onExit }: DualDeviceModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="card w-full max-w-md p-6 text-center md:p-8 bg-b-surface1 border-red-500/50 shadow-2xl">
        <div className="mb-5 flex justify-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/30 animate-bounce">
            <RiSmartphoneLine size={44} />
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-t-primary">
          Dual-Device Session Blocked
        </h2>

        <p className="mt-3 text-sm text-t-secondary leading-relaxed">
          Another device or tab initiated an active test session for your account. Simultaneous test-taking on multiple devices is strictly prohibited by your institute.
        </p>

        <div className="my-6 rounded-[12px] border border-red-500/20 bg-red-500/5 p-3.5 text-xs text-red-400 font-semibold flex items-center justify-center gap-2">
          <RiShieldUserLine size={16} />
          <span>Session token terminated on this device.</span>
        </div>

        <button
          onClick={onExit}
          className="w-full py-3.5 px-6 rounded-[10px] bg-shade-02 text-white font-bold text-sm shadow-md hover:bg-black transition-all active:scale-98 cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
