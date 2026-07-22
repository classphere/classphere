"use client";

import { useEffect, useRef, useState } from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { parseSegments, normaliseSegments, segmentsToString, Segment } from "@/lib/segment-parser";
import { RiDeleteBin7Line, RiEditLine } from "@remixicon/react";

// ── MathLive type stub ────────────────────────────────────────────────────────
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

// ── Flat symbol strip (no tabs — just scroll) ─────────────────────────────────
const SYMBOLS = [
  { d: "a/b",  s: "\\frac{}{}" },
  { d: "√",    s: "\\sqrt{}" },
  { d: "∛",    s: "\\sqrt[3]{}" },
  { d: "x²",   s: "^{2}" },
  { d: "xⁿ",   s: "^{n}" },
  { d: "xₙ",   s: "_{n}" },
  { d: "±",    s: "\\pm" },
  { d: "×",    s: "\\times" },
  { d: "÷",    s: "\\div" },
  { d: "·",    s: "\\cdot" },
  { d: "∞",    s: "\\infty" },
  { d: "≤",    s: "\\leq" },
  { d: "≥",    s: "\\geq" },
  { d: "≠",    s: "\\neq" },
  { d: "≈",    s: "\\approx" },
  { d: "α",    s: "\\alpha" },
  { d: "β",    s: "\\beta" },
  { d: "γ",    s: "\\gamma" },
  { d: "δ",    s: "\\delta" },
  { d: "θ",    s: "\\theta" },
  { d: "λ",    s: "\\lambda" },
  { d: "μ",    s: "\\mu" },
  { d: "π",    s: "\\pi" },
  { d: "σ",    s: "\\sigma" },
  { d: "ω",    s: "\\omega" },
  { d: "Δ",    s: "\\Delta" },
  { d: "Σ",    s: "\\Sigma" },
  { d: "∑",    s: "\\sum_{n=1}^{N}" },
  { d: "∫",    s: "\\int" },
  { d: "∂",    s: "\\partial" },
  { d: "∇",    s: "\\nabla" },
  { d: "→",    s: "\\rightarrow" },
  { d: "⇒",    s: "\\Rightarrow" },
  { d: "⇌",    s: "\\rightleftharpoons" },
  { d: "a⃗",   s: "\\vec{}" },
  { d: "â",    s: "\\hat{}" },
  { d: "sin",  s: "\\sin" },
  { d: "cos",  s: "\\cos" },
  { d: "tan",  s: "\\tan" },
  { d: "log",  s: "\\log" },
  { d: "ln",   s: "\\ln" },
  { d: "lim",  s: "\\lim_{x \\to}" },
];

// ── Inline math editor — rendered inside the field, no modal ──────────────────
function InlineMathPanel({
  initialLatex,
  onDone,
  onClose,
}: {
  initialLatex: string;
  onDone: (latex: string, display: boolean) => void;
  onClose: () => void;
}) {
  const mfRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [latex, setLatex] = useState(initialLatex);

  useEffect(() => {
    import("mathlive").then(() => {
      setReady(true);
      requestAnimationFrame(() => {
        if (!mfRef.current) return;
        mfRef.current.value = initialLatex;
        mfRef.current.focus();
        mfRef.current.addEventListener("input", () => {
          setLatex(mfRef.current?.value ?? "");
        });
      });
    }).catch(() => setReady(true));
  }, []); // eslint-disable-line

  const insertSym = (sym: string) => {
    if (!mfRef.current) return;
    try { mfRef.current.executeCommand(["insert", sym]); }
    catch { mfRef.current.value = (mfRef.current.value ?? "") + sym; }
    mfRef.current.focus();
    setLatex(mfRef.current.value ?? "");
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="mt-2 rounded-[10px] border border-s-stroke2 bg-b-surface2/80 p-3 shadow-sm">
      {/* MathLive field — virtual keyboard OFF (prevents the browser-level keyboard overlay) */}
      <div className="mb-2 overflow-hidden rounded-[8px] border border-s-stroke2 bg-b-surface1">
        {ready ? (
          /* @ts-ignore */
          <math-field
            ref={mfRef}
            virtual-keyboard-mode="off"
            smart-mode="true"
            style={{
              display: "block",
              width: "100%",
              minHeight: "2.5rem",
              fontSize: "1.1rem",
              padding: "0.3rem 0.6rem",
              background: "transparent",
              outline: "none",
              border: "none",
            } as React.CSSProperties}
          />
        ) : (
          <p className="flex h-10 items-center px-3 text-sm text-t-tertiary">Loading…</p>
        )}
      </div>

      {/* Symbol strip */}
      <div className="mb-2.5 flex gap-1 overflow-x-auto pb-0.5">
        {SYMBOLS.map((sym) => (
          <button
            key={sym.s}
            type="button"
            onClick={() => insertSym(sym.s)}
            title={sym.s}
            className="shrink-0 rounded-[6px] border border-s-stroke2 bg-b-surface1 px-2 py-1 text-[11px] font-medium text-t-primary transition-colors hover:border-primary-01/40 hover:bg-primary-01/5"
          >
            {sym.d}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!latex.trim()}
          onClick={() => latex.trim() && onDone(latex, false)}
          className="h-7 rounded-[7px] bg-[#151515] px-3 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          Inline  <span className="ml-1 opacity-50 font-mono text-[10px]">$…$</span>
        </button>
        <button
          type="button"
          disabled={!latex.trim()}
          onClick={() => latex.trim() && onDone(latex, true)}
          className="h-7 rounded-[7px] border border-s-stroke2 bg-b-surface1 px-3 text-xs font-semibold text-t-primary disabled:opacity-40"
        >
          Display  <span className="opacity-50 font-mono text-[10px]">$$…$$</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto h-7 rounded-[7px] px-3 text-xs text-t-tertiary hover:text-t-primary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Math chip (click = edit inline) ──────────────────────────────────────────
function MathChip({
  latex, display, disabled, onEdit, onDelete,
}: {
  latex: string; display: boolean; disabled?: boolean;
  onEdit: () => void; onDelete: () => void;
}) {
  return (
    <span className={`group/chip inline-flex items-center gap-0.5 ${display ? "my-1 w-full justify-center" : ""}`}>
      <span
        onClick={!disabled ? onEdit : undefined}
        title={!disabled ? "Click to edit" : undefined}
        className={[
          "inline-flex items-center gap-1 rounded-[6px] border px-1.5 py-0.5 text-sm transition-colors",
          disabled
            ? "cursor-default border-s-stroke2 bg-b-surface2/60"
            : "cursor-pointer border-primary-01/20 bg-primary-01/5 hover:border-primary-01/50",
        ].join(" ")}
      >
        <MarkdownRenderer>{display ? `$$${latex}$$` : `$${latex}$`}</MarkdownRenderer>
        {!disabled && <RiEditLine size={9} className="shrink-0 text-primary-01/40" />}
      </span>
      {!disabled && (
        <button
          type="button"
          onClick={onDelete}
          tabIndex={-1}
          className="rounded p-0.5 text-t-tertiary opacity-0 transition-opacity hover:text-primary-03 group-hover/chip:opacity-100"
        >
          <RiDeleteBin7Line size={10} />
        </button>
      )}
    </span>
  );
}

// ── Auto-growing textarea ─────────────────────────────────────────────────────
function ProseTextarea({
  value, onChange, disabled, placeholder,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-t-primary placeholder:text-t-tertiary outline-none disabled:cursor-default disabled:opacity-60"
    />
  );
}

// ── SegmentEditor ─────────────────────────────────────────────────────────────
interface SegmentEditorProps {
  label?: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
}

type PanelState = { afterIndex: number; editIndex?: number; initial: string };

export function SegmentEditor({ label, value, disabled, onChange, placeholder }: SegmentEditorProps) {
  const [segments, setSegments] = useState<Segment[]>(() =>
    normaliseSegments(parseSegments(value ?? ""))
  );
  const [panel, setPanel] = useState<PanelState | null>(null);
  const prevValue = useRef(value);

  // Sync external value changes (e.g. switching question)
  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      setSegments(normaliseSegments(parseSegments(value ?? "")));
      setPanel(null);
    }
  }, [value]);

  const emit = (segs: Segment[]) => {
    const str = segmentsToString(segs);
    prevValue.current = str;
    onChange(str);
    return segs;
  };

  const updateText = (i: number, content: string) => {
    emit(segments.map((s, idx) => (idx === i && s.type === "text" ? { ...s, content } : s)) as Segment[]);
  };

  const applyMath = (latex: string, display: boolean) => {
    if (!panel) return;
    let next: Segment[];
    if (panel.editIndex !== undefined) {
      next = segments.map((s, i) => (i === panel.editIndex ? { type: "math", latex, display } as Segment : s));
    } else {
      const at = panel.afterIndex + 1;
      next = [...segments.slice(0, at), { type: "math", latex, display } as Segment, { type: "text", content: "" } as Segment, ...segments.slice(at)];
    }
    emit(normaliseSegments(next));
    setPanel(null);
  };

  const removeMath = (i: number) => {
    const raw = segments.filter((_, idx) => idx !== i);
    emit(normaliseSegments(raw.length ? raw : [{ type: "text", content: "" }]));
  };

  return (
    <div>
      {label && <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-secondary">{label}</p>}

      <div className={[
        "w-full rounded-[10px] border px-3 py-2.5 transition-colors",
        disabled ? "border-s-stroke2 bg-b-surface2/50" : "border-s-stroke2 bg-b-surface1 focus-within:border-primary-01/40",
      ].join(" ")}>
        {segments.map((seg, i) =>
          seg.type === "text" ? (
            <ProseTextarea key={i} value={seg.content} disabled={disabled} placeholder={i === 0 ? placeholder : ""} onChange={(v) => updateText(i, v)} />
          ) : (
            <MathChip
              key={i} latex={seg.latex} display={seg.display} disabled={disabled}
              onEdit={() => setPanel({ afterIndex: i, editIndex: i, initial: seg.latex })}
              onDelete={() => removeMath(i)}
            />
          )
        )}
        {!disabled && !panel && (
          <button
            type="button"
            onClick={() => setPanel({ afterIndex: segments.length - 1, initial: "" })}
            className="mt-1 text-[11px] text-t-tertiary hover:text-primary-01 transition-colors"
          >
            + equation
          </button>
        )}
      </div>

      {/* Inline math panel — appears below the field, no modal/overlay */}
      {panel && !disabled && (
        <InlineMathPanel
          initialLatex={panel.initial}
          onDone={applyMath}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}
