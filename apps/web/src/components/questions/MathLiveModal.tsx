"use client";

import { useEffect, useRef, useState } from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { RiCloseLine } from "@remixicon/react";

// ── Symbol groups shown as a quick-insert strip ──────────────────────────────
const SYMBOL_GROUPS = [
  {
    label: "Structures",
    symbols: [
      { display: "a/b",     insert: "\\frac{#0}{#0}" },
      { display: "√",       insert: "\\sqrt{#0}" },
      { display: "∛",       insert: "\\sqrt[3]{#0}" },
      { display: "x²",      insert: "{#0}^{2}" },
      { display: "xⁿ",      insert: "{#0}^{n}" },
      { display: "xₙ",      insert: "{#0}_{n}" },
      { display: "xₙᵐ",     insert: "{#0}_{#0}^{#0}" },
      { display: "|x|",     insert: "\\left|#0\\right|" },
      { display: "(x)",     insert: "\\left(#0\\right)" },
      { display: "‖x‖",    insert: "\\left\\|#0\\right\\|" },
    ],
  },
  {
    label: "Greek",
    symbols: [
      { display: "α", insert: "\\alpha" },
      { display: "β", insert: "\\beta" },
      { display: "γ", insert: "\\gamma" },
      { display: "δ", insert: "\\delta" },
      { display: "ε", insert: "\\epsilon" },
      { display: "ζ", insert: "\\zeta" },
      { display: "η", insert: "\\eta" },
      { display: "θ", insert: "\\theta" },
      { display: "λ", insert: "\\lambda" },
      { display: "μ", insert: "\\mu" },
      { display: "ν", insert: "\\nu" },
      { display: "π", insert: "\\pi" },
      { display: "ρ", insert: "\\rho" },
      { display: "σ", insert: "\\sigma" },
      { display: "τ", insert: "\\tau" },
      { display: "φ", insert: "\\phi" },
      { display: "ω", insert: "\\omega" },
      { display: "Γ", insert: "\\Gamma" },
      { display: "Δ", insert: "\\Delta" },
      { display: "Θ", insert: "\\Theta" },
      { display: "Λ", insert: "\\Lambda" },
      { display: "Σ", insert: "\\Sigma" },
      { display: "Φ", insert: "\\Phi" },
      { display: "Ψ", insert: "\\Psi" },
      { display: "Ω", insert: "\\Omega" },
    ],
  },
  {
    label: "Vectors",
    symbols: [
      { display: "a⃗", insert: "\\vec{#0}" },
      { display: "â",  insert: "\\hat{#0}" },
      { display: "ā",  insert: "\\bar{#0}" },
      { display: "ȧ",  insert: "\\dot{#0}" },
      { display: "ä",  insert: "\\ddot{#0}" },
      { display: "î",  insert: "\\hat{i}" },
      { display: "ĵ",  insert: "\\hat{j}" },
      { display: "k̂",  insert: "\\hat{k}" },
      { display: "î·ĵ", insert: "\\hat{i}\\cdot\\hat{j}" },
    ],
  },
  {
    label: "Relations",
    symbols: [
      { display: "≤",  insert: "\\leq" },
      { display: "≥",  insert: "\\geq" },
      { display: "≠",  insert: "\\neq" },
      { display: "≈",  insert: "\\approx" },
      { display: "≡",  insert: "\\equiv" },
      { display: "∼",  insert: "\\sim" },
      { display: "∝",  insert: "\\propto" },
      { display: "∈",  insert: "\\in" },
      { display: "∉",  insert: "\\notin" },
      { display: "⊂",  insert: "\\subset" },
      { display: "⊃",  insert: "\\supset" },
      { display: "∞",  insert: "\\infty" },
      { display: "±",  insert: "\\pm" },
      { display: "∓",  insert: "\\mp" },
      { display: "×",  insert: "\\times" },
      { display: "÷",  insert: "\\div" },
      { display: "·",  insert: "\\cdot" },
      { display: "°",  insert: "^{\\circ}" },
    ],
  },
  {
    label: "Calculus",
    symbols: [
      { display: "∫",       insert: "\\int" },
      { display: "∫ₐᵇ",    insert: "\\int_{a}^{b}" },
      { display: "∮",       insert: "\\oint" },
      { display: "∂",       insert: "\\partial" },
      { display: "∑",       insert: "\\sum_{n=1}^{\\infty}" },
      { display: "∏",       insert: "\\prod_{n=1}^{N}" },
      { display: "lim",     insert: "\\lim_{x \\to #0}" },
      { display: "lim∞",    insert: "\\lim_{x \\to \\infty}" },
      { display: "d/dx",    insert: "\\frac{d}{dx}" },
      { display: "∂/∂x",   insert: "\\frac{\\partial}{\\partial x}" },
      { display: "d²/dx²",  insert: "\\frac{d^2}{dx^2}" },
      { display: "∇",       insert: "\\nabla" },
    ],
  },
  {
    label: "Trig & Log",
    symbols: [
      { display: "sin",    insert: "\\sin" },
      { display: "cos",    insert: "\\cos" },
      { display: "tan",    insert: "\\tan" },
      { display: "sec",    insert: "\\sec" },
      { display: "csc",    insert: "\\csc" },
      { display: "cot",    insert: "\\cot" },
      { display: "sin⁻¹",  insert: "\\sin^{-1}" },
      { display: "cos⁻¹",  insert: "\\cos^{-1}" },
      { display: "tan⁻¹",  insert: "\\tan^{-1}" },
      { display: "log",    insert: "\\log" },
      { display: "ln",     insert: "\\ln" },
      { display: "logₙ",   insert: "\\log_{#0}" },
      { display: "log₁₀",  insert: "\\log_{10}" },
    ],
  },
  {
    label: "Arrows",
    symbols: [
      { display: "→",  insert: "\\rightarrow" },
      { display: "←",  insert: "\\leftarrow" },
      { display: "↔",  insert: "\\leftrightarrow" },
      { display: "⇒",  insert: "\\Rightarrow" },
      { display: "⇐",  insert: "\\Leftarrow" },
      { display: "⇔",  insert: "\\Leftrightarrow" },
      { display: "⇌",  insert: "\\rightleftharpoons" },
      { display: "↑",  insert: "\\uparrow" },
      { display: "↓",  insert: "\\downarrow" },
      { display: "↗",  insert: "\\nearrow" },
    ],
  },
];

// TypeScript type for the math-field web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "virtual-keyboard-mode"?: string;
        "smart-mode"?: string;
      };
    }
  }
}

interface MathLiveModalProps {
  initialLatex: string;
  onInsertInline: (latex: string) => void;
  onInsertDisplay: (latex: string) => void;
  onClose: () => void;
}

export function MathLiveModal({ initialLatex, onInsertInline, onInsertDisplay, onClose }: MathLiveModalProps) {
  const mfRef = useRef<any>(null);
  const [latex, setLatex] = useState(initialLatex ?? "");
  const [activeGroup, setActiveGroup] = useState(0);
  const [ready, setReady] = useState(false);

  // Dynamically import mathlive to avoid Next.js SSR issues
  useEffect(() => {
    import("mathlive").then(() => {
      setReady(true);
      // Set initial value after the element has registered
      requestAnimationFrame(() => {
        if (mfRef.current) {
          mfRef.current.value = initialLatex ?? "";
          mfRef.current.focus();
          mfRef.current.addEventListener("input", () => {
            setLatex(mfRef.current?.value ?? "");
          });
        }
      });
    }).catch(() => setReady(true)); // still set ready on failure
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const insertSymbol = (sym: string) => {
    if (!mfRef.current) return;
    try {
      mfRef.current.executeCommand(["insert", sym]);
    } catch {
      // fallback: append to value
      const cur = mfRef.current.value ?? "";
      mfRef.current.value = cur + sym;
    }
    mfRef.current.focus();
    setLatex(mfRef.current.value ?? "");
  };

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Keyboard shortcut: Escape closes, Enter inserts inline
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && latex.trim()) {
        onInsertDisplay(latex);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [latex, onClose, onInsertDisplay]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[18px] border border-s-stroke2 bg-b-surface1 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-s-stroke2 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-t-tertiary">Equation editor</p>
            <h3 className="mt-0.5 text-base font-semibold text-t-primary">
              {initialLatex ? "Edit equation" : "Insert equation"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden rounded border border-s-stroke2 bg-b-surface2 px-1.5 py-0.5 text-[10px] text-t-tertiary sm:block">
              Esc to close
            </kbd>
            <button
              onClick={onClose}
              className="rounded-[8px] p-1.5 text-t-secondary hover:bg-b-surface2 hover:text-t-primary"
            >
              <RiCloseLine size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* MathLive field */}
          <div className="overflow-hidden rounded-[12px] border border-s-stroke2 bg-b-surface2/40">
            <div className="flex items-center gap-2 border-b border-s-stroke2 px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-t-tertiary">
                Type or paste your equation
              </span>
              <span className="ml-auto text-[10px] text-t-tertiary">LaTeX is stored internally</span>
            </div>
            <div className="min-h-[64px] p-3">
              {ready ? (
                /* @ts-ignore - math-field is a custom element */
                <math-field
                  ref={mfRef}
                  virtual-keyboard-mode="onfocus"
                  smart-mode="true"
                  style={{
                    display: "block",
                    width: "100%",
                    minHeight: "3rem",
                    fontSize: "1.25rem",
                    padding: "0.25rem 0.5rem",
                    background: "transparent",
                    outline: "none",
                    border: "none",
                    "--caret-color": "var(--primary-01)",
                  } as React.CSSProperties}
                />
              ) : (
                <p className="flex h-12 items-center text-sm text-t-secondary">Loading equation editor…</p>
              )}
            </div>
          </div>

          {/* Symbol quick-insert */}
          <div>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {SYMBOL_GROUPS.map((g, i) => (
                <button
                  key={g.label}
                  onClick={() => setActiveGroup(i)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                    activeGroup === i
                      ? "bg-primary-01 text-white"
                      : "bg-b-surface2 text-t-secondary hover:text-t-primary border border-s-stroke2"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SYMBOL_GROUPS[activeGroup].symbols.map((sym) => (
                <button
                  key={sym.insert}
                  onClick={() => insertSymbol(sym.insert)}
                  title={sym.insert}
                  className="min-w-[2rem] rounded-[7px] border border-s-stroke2 bg-b-surface2 px-2.5 py-1.5 text-center text-sm text-t-primary transition-colors hover:border-primary-01/40 hover:bg-primary-01/5"
                >
                  {sym.display}
                </button>
              ))}
            </div>
          </div>

          {/* Live KaTeX preview */}
          {latex.trim() && (
            <div className="rounded-[10px] border border-s-stroke2 bg-b-surface2/50 px-4 py-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-tertiary">Preview</p>
              <div className="text-base leading-relaxed text-t-primary">
                <MarkdownRenderer>{`$$${latex}$$`}</MarkdownRenderer>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 border-t border-s-stroke2 pt-3">
            <button
              onClick={() => latex.trim() && onInsertInline(latex)}
              disabled={!latex.trim()}
              className="h-10 rounded-[10px] bg-[#151515] px-4 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-black"
            >
              Insert inline
              <code className="ml-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] dark:bg-black/10">
                $…$
              </code>
            </button>
            <button
              onClick={() => latex.trim() && onInsertDisplay(latex)}
              disabled={!latex.trim()}
              className="h-10 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 text-sm font-semibold text-t-primary disabled:opacity-40"
            >
              Insert display
              <code className="ml-1.5 rounded bg-b-surface1 px-1.5 py-0.5 text-[10px]">
                $$…$$
              </code>
            </button>
            <button
              onClick={onClose}
              className="ml-auto h-10 rounded-[10px] border border-s-stroke2 px-4 text-sm text-t-secondary hover:text-t-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
