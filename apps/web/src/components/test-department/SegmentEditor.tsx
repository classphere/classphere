"use client";

import { useEffect, useRef, useState } from "react";
import { MathLiveModal } from "./MathLiveModal";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { parseSegments, normaliseSegments, segmentsToString, Segment } from "@/lib/segment-parser";
import { RiDeleteBin7Line, RiEditLine } from "@remixicon/react";

// ── Auto-growing textarea for prose segments ──────────────────────────────────

function ProseTextarea({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-resize whenever value changes
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

// ── Rendered math chip ────────────────────────────────────────────────────────

function MathChip({
  latex,
  display,
  disabled,
  onEdit,
  onDelete,
}: {
  latex: string;
  display: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rendered = display ? `$$${latex}$$` : `$${latex}$`;
  return (
    <span
      className={`group/chip my-1 flex items-center gap-1 ${display ? "w-full justify-center" : "inline-flex"}`}
    >
      <span
        onClick={!disabled ? onEdit : undefined}
        title={!disabled ? "Click to edit equation" : undefined}
        className={[
          "inline-flex items-center gap-1 rounded-[8px] border px-2 py-0.5 text-sm transition-colors",
          disabled
            ? "cursor-default border-s-stroke2 bg-b-surface2/50"
            : "cursor-pointer border-primary-01/20 bg-primary-01/5 hover:border-primary-01/50 hover:bg-primary-01/10",
        ].join(" ")}
      >
        <MarkdownRenderer>{rendered}</MarkdownRenderer>
        {!disabled && <RiEditLine size={10} className="shrink-0 text-primary-01/50" />}
      </span>
      {!disabled && (
        <button
          type="button"
          onClick={onDelete}
          title="Remove equation"
          tabIndex={-1}
          className="shrink-0 rounded p-0.5 text-t-tertiary opacity-0 transition-opacity hover:text-primary-03 group-hover/chip:opacity-100"
        >
          <RiDeleteBin7Line size={11} />
        </button>
      )}
    </span>
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

type ModalState = { afterIndex: number; editIndex?: number; initial: string };

export function SegmentEditor({
  label,
  value,
  disabled,
  onChange,
  placeholder,
}: SegmentEditorProps) {
  const [segments, setSegments] = useState<Segment[]>(() =>
    normaliseSegments(parseSegments(value ?? ""))
  );
  const [modal, setModal] = useState<ModalState | null>(null);

  // Sync when value changes from outside (e.g. different question selected)
  const prevValue = useRef(value);
  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      setSegments(normaliseSegments(parseSegments(value ?? "")));
    }
  }, [value]);

  const emit = (segs: Segment[]) => {
    const str = segmentsToString(segs);
    prevValue.current = str;
    onChange(str);
  };

  const updateText = (index: number, content: string) => {
    const next = segments.map((s, i) =>
      i === index && s.type === "text" ? { ...s, content } : s
    ) as Segment[];
    setSegments(next);
    emit(next);
  };

  const applyMath = (latex: string, display: boolean) => {
    if (!modal) return;
    let next: Segment[];

    if (modal.editIndex !== undefined) {
      next = segments.map((s, i) =>
        i === modal.editIndex ? ({ type: "math", latex, display } as Segment) : s
      );
    } else {
      // Insert new math after afterIndex, with an empty text segment after it
      const insertAt = modal.afterIndex + 1;
      next = [
        ...segments.slice(0, insertAt),
        { type: "math", latex, display } as Segment,
        { type: "text", content: "" } as Segment,
        ...segments.slice(insertAt),
      ];
    }

    const normed = normaliseSegments(next);
    setSegments(normed);
    emit(normed);
    setModal(null);
  };

  const removeMath = (index: number) => {
    const raw = segments.filter((_, i) => i !== index);
    const normed = normaliseSegments(raw.length ? raw : [{ type: "text", content: "" }]);
    setSegments(normed);
    emit(normed);
  };

  return (
    <div>
      {label && (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-secondary">
          {label}
        </p>
      )}

      {/* Editor surface — matches app's bordered card pattern */}
      <div
        className={[
          "min-h-[2.5rem] w-full rounded-[10px] border px-3 py-2.5 transition-colors",
          disabled
            ? "border-s-stroke2 bg-b-surface2/50"
            : "border-s-stroke2 bg-b-surface1 focus-within:border-primary-01/40",
        ].join(" ")}
      >
        {segments.map((seg, i) =>
          seg.type === "text" ? (
            <ProseTextarea
              key={i}
              value={seg.content}
              disabled={disabled}
              placeholder={i === 0 ? placeholder : ""}
              onChange={(v) => updateText(i, v)}
            />
          ) : (
            <MathChip
              key={i}
              latex={seg.latex}
              display={seg.display}
              disabled={disabled}
              onEdit={() => setModal({ afterIndex: i, editIndex: i, initial: seg.latex })}
              onDelete={() => removeMath(i)}
            />
          )
        )}

        {/* Insert equation button */}
        {!disabled && (
          <button
            type="button"
            onClick={() => setModal({ afterIndex: segments.length - 1, initial: "" })}
            className="mt-1 text-[11px] text-t-tertiary hover:text-primary-01 transition-colors"
          >
            + Insert equation
          </button>
        )}
      </div>

      {/* MathLive modal */}
      {modal && (
        <MathLiveModal
          initialLatex={modal.initial}
          onInsertInline={(latex) => applyMath(latex, false)}
          onInsertDisplay={(latex) => applyMath(latex, true)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
