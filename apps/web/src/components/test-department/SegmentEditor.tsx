"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { MathLiveModal } from "./MathLiveModal";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { parseSegments, normaliseSegments, segmentsToString, Segment } from "@/lib/segment-parser";
import { RiAddLine, RiDeleteBin7Line, RiEditLine } from "@remixicon/react";

// ── Inline editable text span (React-safe contenteditable) ───────────────────

interface EditableTextProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function EditableText({ value, onChange, disabled, placeholder }: EditableTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const lastExternal = useRef(value);

  // Only push external value changes INTO the DOM; never overwrite user edits
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (value !== lastExternal.current) {
      lastExternal.current = value;
      if (ref.current.textContent !== value) {
        ref.current.textContent = value;
      }
    }
  }, [value]);

  return (
    <span
      ref={ref}
      // "plaintext-only" is valid but not in TS types yet
      contentEditable={disabled ? false : ("plaintext-only" as unknown as boolean)}
      suppressContentEditableWarning
      onInput={(e) => {
        const text = e.currentTarget.textContent ?? "";
        lastExternal.current = text;
        onChange(text);
      }}
      data-placeholder={!value && placeholder ? placeholder : undefined}
      className={[
        "min-w-[4px] whitespace-pre-wrap break-words text-sm text-t-primary outline-none",
        !value && !disabled ? "before:text-t-tertiary before:content-[attr(data-placeholder)]" : "",
        disabled ? "opacity-70 cursor-default" : "cursor-text",
      ].join(" ")}
    />
  );
}

// ── Rendered math chip (click-to-edit) ───────────────────────────────────────

interface MathChipProps {
  latex: string;
  display: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function MathChip({ latex, display, disabled, onEdit, onDelete }: MathChipProps) {
  const rendered = display ? `$$${latex}$$` : `$${latex}$`;
  return (
    <span className={`inline-flex items-center gap-0.5 ${display ? "my-1 w-full justify-center" : ""}`}>
      <span
        onClick={!disabled ? onEdit : undefined}
        className={[
          "inline-flex items-center gap-1 rounded-[7px] border px-2 py-0.5 text-sm leading-none transition-all",
          disabled
            ? "border-s-stroke2 bg-b-surface2/50 cursor-default"
            : "border-primary-01/30 bg-primary-01/5 cursor-pointer hover:border-primary-01/60 hover:bg-primary-01/10",
        ].join(" ")}
        title={!disabled ? "Click to edit equation" : undefined}
      >
        <MarkdownRenderer>{rendered}</MarkdownRenderer>
        {!disabled && <RiEditLine size={10} className="shrink-0 text-primary-01/50" />}
      </span>
      {!disabled && (
        <button
          onClick={onDelete}
          className="rounded-full p-0.5 text-t-tertiary opacity-0 transition-opacity hover:text-primary-03 group-hover:opacity-100"
          title="Remove equation"
          tabIndex={-1}
        >
          <RiDeleteBin7Line size={10} />
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

export function SegmentEditor({ label, value, disabled, onChange, placeholder }: SegmentEditorProps) {
  const [segments, setSegments] = useState<Segment[]>(() =>
    normaliseSegments(parseSegments(value ?? ""))
  );
  const [modal, setModal] = useState<ModalState | null>(null);
  // Track external value to avoid re-parsing on every internal change
  const lastString = useRef(value);

  // Sync external value changes → re-parse
  const derivedSegs = useMemo(() => {
    if (value !== lastString.current) {
      lastString.current = value;
      return normaliseSegments(parseSegments(value ?? ""));
    }
    return null; // no update needed
  }, [value]);

  if (derivedSegs) {
    // Update state synchronously during render (valid in React 18 with checks)
    if (JSON.stringify(derivedSegs) !== JSON.stringify(segments)) {
      setSegments(derivedSegs);
    }
  }

  const emit = (segs: Segment[]) => {
    const str = segmentsToString(segs);
    lastString.current = str;
    onChange(str);
    return segs;
  };

  const updateText = (index: number, content: string) => {
    const next = segments.map((s, i) =>
      i === index && s.type === "text" ? { ...s, content } : s
    ) as Segment[];
    setSegments(next);
    emit(next);
  };

  const openInsert = (afterIndex: number) => {
    setModal({ afterIndex, initial: "" });
  };

  const openEdit = (index: number) => {
    const seg = segments[index];
    if (seg?.type !== "math") return;
    setModal({ afterIndex: index, editIndex: index, initial: seg.latex });
  };

  const applyMath = (latex: string, display: boolean) => {
    if (!modal) return;
    let next: Segment[];

    if (modal.editIndex !== undefined) {
      // Update existing math segment
      next = segments.map((s, i) =>
        i === modal.editIndex ? ({ type: "math", latex, display } as Segment) : s
      );
    } else {
      // Insert new math segment after afterIndex, with empty text after it
      const insertAt = modal.afterIndex + 1;
      const newMath: Segment = { type: "math", latex, display };
      const newText: Segment = { type: "text", content: "" };
      next = [
        ...segments.slice(0, insertAt),
        newMath,
        newText,
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
    <div className="group">
      {label && (
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-t-secondary">{label}</p>
      )}

      {/* Content area — renders as a document-like mixed editor */}
      <div
        className={[
          "min-h-[3rem] w-full rounded-[12px] border px-3 py-2.5",
          disabled
            ? "border-s-stroke2 bg-b-surface2/30 cursor-default"
            : "border-s-stroke2 bg-b-surface1 focus-within:border-primary-01/40 focus-within:ring-1 focus-within:ring-primary-01/20",
        ].join(" ")}
      >
        <span className="inline leading-relaxed">
          {segments.map((seg, i) =>
            seg.type === "text" ? (
              <EditableText
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
                onEdit={() => openEdit(i)}
                onDelete={() => removeMath(i)}
              />
            )
          )}

          {/* Insert equation button — always at the end */}
          {!disabled && (
            <button
              onClick={() => openInsert(segments.length - 1)}
              className="ml-1.5 inline-flex items-center gap-0.5 rounded-[6px] border border-dashed border-s-stroke2 px-2 py-0.5 text-[11px] text-t-tertiary transition-colors hover:border-primary-01/50 hover:text-primary-01"
              type="button"
              title="Insert equation (MathLive)"
            >
              <RiAddLine size={11} />
              <span>∑</span>
            </button>
          )}
        </span>
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
