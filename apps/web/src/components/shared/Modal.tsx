"use client";

import React, { useEffect } from "react";
import { RiCloseLine } from "@remixicon/react";

interface ModalProps {
  /** Controls whether the modal is visible */
  open: boolean;
  /** Called when the user closes the modal (X button or backdrop click) */
  onClose: () => void;
  /** Modal heading */
  title: string;
  /** Optional subtitle / description below the title */
  subtitle?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Max width class — default "max-w-[500px]" */
  maxWidth?: string;
}

/**
 * Modal
 *
 * Standard modal shell used across the platform (Create Batch, Onboard Institute, Create DPP, etc.).
 * Handles backdrop click, Escape key, body scroll lock, and consistent animation.
 *
 * @example
 * <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Create New Batch">
 *   <form>...</form>
 * </Modal>
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-[500px]",
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} rounded-[10px] bg-b-surface2 p-8 shadow-depth animate-in zoom-in-95 duration-200 border border-s-stroke2/40`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="t-heading-l text-t-primary">{title}</h2>
            {subtitle && (
              <p className="t-body-base text-t-secondary">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center shrink-0 rounded-[10px] bg-b-surface1 border border-s-stroke2/40 text-t-secondary hover:text-t-primary hover:border-s-highlight transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        {/* Body */}
        {children}
      </div>
    </div>
  );
}

export default Modal;
