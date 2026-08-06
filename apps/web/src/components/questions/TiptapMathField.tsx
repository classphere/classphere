"use client";

/**
 * TiptapMathField — inline WYSIWYG editor for question text / options / explanation.
 *
 * Math (LaTeX) flows naturally inside prose instead of being split into disjoint
 * bordered boxes. An inline math node renders a KaTeX preview; clicking it reopens
 * MathLive on that node so the editor can fix the LaTeX in place. A display-math
 * node renders centered on its own line.
 *
 * The editor serialises to the SAME stored format the backend and the student-facing
 * MarkdownRenderer already consume: markdown prose with $...$ inline math and
 * $$...$$ display math. Round-trip is lossless against MarkdownRenderer's regex for
 * real JEE/NEET question text (where every $ is a math delimiter).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, type Editor, type NodeViewProps } from "@tiptap/react";
import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useAuth } from "@/lib/auth-context";
import "./tiptap-math-field.css";
import {
  RiFunctionLine,
  RiImageAddLine,
  RiDeleteBin7Line,
  RiParagraph,
} from "@remixicon/react";

// ── MathLive type stub (web component, dynamic import) ─────────────────────────
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "virtual-keyboard-mode"?: string;
          "smart-mode"?: string;
        },
        HTMLElement
      >;
    }
  }
}

// ── Grouped symbol palette (JEE/NEET focused) ──────────────────────────────────
const SYMBOL_GROUPS = [
  {
    label: "Structures",
    symbols: [
      { d: "a/b", s: "\\frac{}{}" },
      { d: "√", s: "\\sqrt{}" },
      { d: "∛", s: "\\sqrt[3]{}" },
      { d: "x²", s: "^{2}" },
      { d: "xⁿ", s: "^{n}" },
      { d: "xₙ", s: "_{n}" },
      { d: "( )", s: "\\left( \\right)" },
      { d: "| |", s: "\\left| \\right|" },
      { d: "[ ]", s: "\\left[ \\right]" },
    ],
  },
  {
    label: "Combinatorics",
    symbols: [
      { d: "n!", s: "{}!" },
      { d: "nPr", s: "{}P{}" },
      { d: "nCr", s: "\\binom{}{}" },
      { d: "ₙCᵣ", s: "{}_{}C_{}" },
      { d: "ₙPᵣ", s: "{}_{}P_{}" },
      { d: "(ⁿⁿ)", s: "\\left( \\right)^{}" },
    ],
  },
  {
    label: "Matrix",
    symbols: [
      { d: "matrix", s: "\\begin{matrix} & \\\\ & \\end{matrix}" },
      { d: "pmatrix", s: "\\begin{pmatrix} & \\\\ & \\end{pmatrix}" },
      { d: "bmatrix", s: "\\begin{bmatrix} & \\\\ & \\end{bmatrix}" },
      { d: "vmatrix", s: "\\begin{vmatrix} & \\\\ & \\end{vmatrix}" },
      { d: "2×2", s: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
      { d: "3×3", s: "\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}" },
    ],
  },
  {
    label: "Greek",
    symbols: [
      { d: "α", s: "\\alpha" }, { d: "β", s: "\\beta" }, { d: "γ", s: "\\gamma" },
      { d: "δ", s: "\\delta" }, { d: "θ", s: "\\theta" }, { d: "λ", s: "\\lambda" },
      { d: "μ", s: "\\mu" }, { d: "π", s: "\\pi" }, { d: "σ", s: "\\sigma" },
      { d: "ω", s: "\\omega" }, { d: "Δ", s: "\\Delta" }, { d: "Σ", s: "\\Sigma" },
      { d: "Ω", s: "\\Omega" }, { d: "Φ", s: "\\Phi" }, { d: "Ψ", s: "\\Psi" },
    ],
  },
  {
    label: "Vectors",
    symbols: [
      { d: "a⃗", s: "\\vec{}" }, { d: "â", s: "\\hat{}" }, { d: "ā", s: "\\bar{}" },
      { d: "ȧ", s: "\\dot{}" }, { d: "î", s: "\\hat{i}" }, { d: "ĵ", s: "\\hat{j}" },
      { d: "k̂", s: "\\hat{k}" }, { d: "·", s: "\\cdot" }, { d: "×", s: "\\times" },
    ],
  },
  {
    label: "Calculus",
    symbols: [
      { d: "∫", s: "\\int" }, { d: "∫ₐᵇ", s: "\\int_{a}^{b}" }, { d: "∮", s: "\\oint" },
      { d: "∂", s: "\\partial" }, { d: "∑", s: "\\sum_{n=1}^{N}" },
      { d: "lim", s: "\\lim_{x \\to }" }, { d: "d/dx", s: "\\frac{d}{dx}" },
      { d: "∇", s: "\\nabla" },
    ],
  },
  {
    label: "Trig & Log",
    symbols: [
      { d: "sin", s: "\\sin" }, { d: "cos", s: "\\cos" }, { d: "tan", s: "\\tan" },
      { d: "sec", s: "\\sec" }, { d: "cot", s: "\\cot" },
      { d: "sin⁻¹", s: "\\sin^{-1}" }, { d: "log", s: "\\log" }, { d: "ln", s: "\\ln" },
    ],
  },
  {
    label: "Relations",
    symbols: [
      { d: "≤", s: "\\leq" }, { d: "≥", s: "\\geq" }, { d: "≠", s: "\\neq" },
      { d: "≈", s: "\\approx" }, { d: "±", s: "\\pm" }, { d: "→", s: "\\rightarrow" },
      { d: "⇒", s: "\\Rightarrow" }, { d: "⇌", s: "\\rightleftharpoons" },
      { d: "°", s: "^{\\circ}" }, { d: "∞", s: "\\infty" },
    ],
  },
];

// ── Serialization: stored string <-> Tiptap JSON ───────────────────────────────
//
// Stored format: markdown prose + $...$ inline math + $$...$$ display math +
// markdown images ![alt](url). Paragraphs are separated by blank lines; single
// newlines are soft breaks. Prose (including any markdown like **bold**) is passed
// through verbatim so it round-trips to the exact stored string.

type Span =
  | { kind: "text"; text: string }
  | { kind: "imath"; latex: string }
  | { kind: "dmath"; latex: string };

/** Tokenise stored string into text / inline-math / display-math spans. */
function tokenizeStored(stored: string): Span[] {
  const spans: Span[] = [];
  // Order matters: $$ before $, \[ before \(. Same precedence as MarkdownRenderer.
  const RE = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(stored)) !== null) {
    if (m.index > last) spans.push({ kind: "text", text: stored.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("$$")) spans.push({ kind: "dmath", latex: tok.slice(2, -2).trim() });
    else if (tok.startsWith("\\[")) spans.push({ kind: "dmath", latex: tok.slice(2, -2).trim() });
    else if (tok.startsWith("\\(")) spans.push({ kind: "imath", latex: tok.slice(2, -2).trim() });
    else spans.push({ kind: "imath", latex: tok.slice(1, -1).trim() });
    last = m.index + tok.length;
  }
  if (last < stored.length) spans.push({ kind: "text", text: stored.slice(last) });
  return spans;
}

/** Parse stored string into Tiptap JSON (doc -> paragraphs containing inline text,
 *  inline math, and display-math atoms). Display math is kept INLINE within its
 *  paragraph (not forced onto its own block) so that "Solve $$...$$ for the area."
 *  round-trips byte-for-byte — matching how MarkdownRenderer treats $$...$$ as a
 *  display-mode KaTeX span wherever it appears. */
function storedToDoc(stored: string): any {
  const doc = { type: "doc", content: [] as any[] };
  if (!stored) {
    doc.content.push({ type: "paragraph", content: [] });
    return doc;
  }

  const spans = tokenizeStored(stored);
  let inline: any[] = []; // current paragraph's inline content
  const flushParagraph = () => {
    doc.content.push({ type: "paragraph", content: inline });
    inline = [];
  };

  for (const span of spans) {
    if (span.kind === "dmath") {
      // display math stays inline within the current paragraph (lossless)
      inline.push({ type: "displayMath", attrs: { latex: span.latex } });
    } else if (span.kind === "imath") {
      inline.push({ type: "inlineMath", attrs: { latex: span.latex } });
    } else {
      const text = span.text;
      const paras = text.split(/\n{2,}/); // blank line = paragraph break
      for (let i = 0; i < paras.length; i++) {
        if (i > 0) flushParagraph();
        const seg = paras[i];
        // detect markdown images: ![alt](url)
        const imgRe = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
        let li = 0;
        let im: RegExpExecArray | null;
        while ((im = imgRe.exec(seg)) !== null) {
          if (im.index > li) pushInlineText(inline, seg.slice(li, im.index));
          flushParagraph();
          doc.content.push({ type: "image", attrs: { src: im[2], alt: im[1] || "" } });
          li = im.index + im[0].length;
        }
        if (li < seg.length) pushInlineText(inline, seg.slice(li));
      }
    }
  }
  flushParagraph();
  if (doc.content.length === 0) doc.content.push({ type: "paragraph", content: [] });
  return doc;
}

/** Push a text fragment into the current inline list, splitting single newlines into hardBreaks. */
function pushInlineText(inline: any[], text: string) {
  const lines = text.split(/\n/);
  for (let j = 0; j < lines.length; j++) {
    if (j > 0) inline.push({ type: "hardBreak" });
    if (lines[j]) inline.push({ type: "text", text: lines[j] });
  }
}

/** Render Tiptap JSON back to the stored string. */
function docToStored(doc: any): string {
  if (!doc || !doc.content) return "";
  const blocks: string[] = [];
  for (const node of doc.content) {
    if (node.type === "paragraph") {
      blocks.push(renderInline(node.content));
    } else if (node.type === "image") {
      blocks.push(`![${node.attrs?.alt ?? ""}](${node.attrs?.src ?? ""})`);
    }
  }
  // paragraphs join with blank line; collapse accidental triple+ newlines
  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function renderInline(content: any[] | undefined): string {
  if (!content || !content.length) return "";
  let s = "";
  for (const node of content) {
    if (node.type === "text") {
      s += node.text ?? "";
    } else if (node.type === "inlineMath") {
      s += `$${(node.attrs?.latex ?? "").trim()}$`;
    } else if (node.type === "displayMath") {
      s += `$$${(node.attrs?.latex ?? "").trim()}$$`;
    } else if (node.type === "hardBreak") {
      s += "\n";
    }
  }
  return s;
}

// ── Inline math node ───────────────────────────────────────────────────────────
const InlineMath = TiptapNode.create({
  name: "inlineMath",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { latex: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "span[data-inline-math]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-inline-math": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(InlineMathView);
  },
});

// ── Display math node ──────────────────────────────────────────────────────────
// Inline atom (lives inside a paragraph) so it round-trips losslessly, but rendered
// as a centered block via CSS, matching KaTeX's display-mode presentation.
const DisplayMath = TiptapNode.create({
  name: "displayMath",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { latex: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "span[data-display-math]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-display-math": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DisplayMathView);
  },
});

// ── Math node views (KaTeX preview; click opens MathLive editor) ───────────────
function InlineMathView({ node, selected, deleteNode, updateAttributes, editor }: NodeViewProps) {
  const latex = node.attrs.latex ?? "";
  const [editing, setEditing] = useState(false);
  return (
    <NodeViewWrapper
      as="span"
      className={`group/math inline-flex items-center rounded-[5px] border align-middle transition-colors ${
        selected
          ? "border-primary-01/60 bg-primary-01/10"
          : "border-primary-01/20 bg-primary-01/5 hover:border-primary-01/50"
      }`}
    >
      {editing ? (
        <MathLiveInline
          initial={latex}
          onSave={(lx) => {
            updateAttributes({ latex: lx });
            setEditing(false);
            editor.commands.focus();
          }}
          onClose={() => setEditing(false)}
        />
      ) : (
        <span
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="cursor-pointer"
          title="Click to edit equation"
        >
          {latex.trim() ? (
            <MarkdownRenderer>{`$${latex}$`}</MarkdownRenderer>
          ) : (
            <span className="px-1 text-[11px] italic text-t-tertiary">empty equation — click to edit</span>
          )}
        </span>
      )}
      {!editing && (
        <button
          type="button"
          contentEditable={false}
          onClick={(e) => { e.stopPropagation(); deleteNode(); }}
          className="ml-0.5 text-t-tertiary opacity-0 transition-opacity hover:text-primary-03 group-hover/math:opacity-100"
          title="Remove equation"
        >
          <RiDeleteBin7Line size={9} />
        </button>
      )}
    </NodeViewWrapper>
  );
}

function DisplayMathView({ node, selected, deleteNode, updateAttributes, editor }: NodeViewProps) {
  const latex = node.attrs.latex ?? "";
  const [editing, setEditing] = useState(false);
  return (
    <NodeViewWrapper
      as="div"
      className={`group/math my-1 flex w-full items-center justify-center gap-1 rounded-[8px] border py-1 transition-colors ${
        selected
          ? "border-primary-01/60 bg-primary-01/10"
          : "border-primary-01/20 bg-primary-01/5 hover:border-primary-01/50"
      }`}
    >
      {editing ? (
        <div className="w-full max-w-2xl">
          <MathLiveInline
            initial={latex}
            display
            onSave={(lx) => {
              updateAttributes({ latex: lx });
              setEditing(false);
              editor.commands.focus();
            }}
            onClose={() => setEditing(false)}
          />
        </div>
      ) : (
        <span
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="cursor-pointer"
          title="Click to edit equation"
        >
          {latex.trim() ? (
            <MarkdownRenderer>{`$$${latex}$$`}</MarkdownRenderer>
          ) : (
            <span className="px-2 text-xs italic text-t-tertiary">empty display equation — click to edit</span>
          )}
        </span>
      )}
      {!editing && (
        <button
          type="button"
          contentEditable={false}
          onClick={(e) => { e.stopPropagation(); deleteNode(); }}
          className="text-t-tertiary opacity-0 transition-opacity hover:text-primary-03 group-hover/math:opacity-100"
          title="Remove equation"
        >
          <RiDeleteBin7Line size={10} />
        </button>
      )}
    </NodeViewWrapper>
  );
}

// ── MathLive inline editor (appears in place, no overlay) ──────────────────────
function MathLiveInline({
  initial,
  display,
  onSave,
  onClose,
}: {
  initial: string;
  display?: boolean;
  onSave: (latex: string) => void;
  onClose: () => void;
}) {
  const mfRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [activeGroup, setActiveGroup] = useState(1); // Combinatorics (nPr/nCr/!) — a common JEE default
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    import("mathlive")
      .then(() => {
        if (cancelled) return;
        setReady(true);
        requestAnimationFrame(() => {
          if (!mfRef.current) return;
          mfRef.current.value = initial ?? "";
          try { mfRef.current.executeCommand(["moveToMathfieldEnd"]); } catch {}
          mfRef.current.focus();
        });
      })
      .catch(() => !cancelled && setReady(true));
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const insertSymbol = (sym: string) => {
    if (!mfRef.current) return;
    try {
      mfRef.current.executeCommand(["insert", sym]);
    } catch {
      mfRef.current.value = (mfRef.current.value ?? "") + sym;
    }
    mfRef.current.focus();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        const val = (mfRef.current?.value ?? "").trim();
        if (val) { e.stopPropagation(); onSave(val); }
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [onClose, onSave]);

  // Close on outside click (deferred so the opening click doesn't immediately close)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", h), 120);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", h); };
  }, [onClose]);

  return (
    <div
      ref={wrapperRef}
      className="mt-1.5 w-full rounded-[14px] border border-s-stroke2 bg-b-surface1 p-3 shadow-dropdown"
      contentEditable={false}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2.5 overflow-hidden rounded-[10px] border border-s-stroke2 bg-b-surface2/60">
        {ready ? (
          /* @ts-ignore — math-field is a custom element registered by mathlive */
          <math-field
            ref={mfRef}
            virtual-keyboard-mode="off"
            smart-mode="true"
            mathVirtualKeyboardPolicy="manual"
            style={{
              display: "block",
              width: "100%",
              minHeight: display ? "4rem" : "2.75rem",
              fontSize: "1.15rem",
              padding: "0.6rem 0.75rem",
              background: "transparent",
              outline: "none",
              border: "none",
              // Hide MathLive's built-in toolbar/menu chrome — we provide our own
              // symbol palette below, so the native action bar is redundant clutter.
              ["--.smart-mode-color" as any]: "transparent",
            } as React.CSSProperties}
          />
        ) : (
          <p className="flex h-11 items-center px-3 text-sm text-t-tertiary">Loading equation editor…</p>
        )}
      </div>

      {/* Grouped symbol palette */}
      <div className="mb-2 flex flex-wrap gap-1">
        {SYMBOL_GROUPS.map((g, i) => (
          <button
            key={g.label}
            type="button"
            onClick={() => setActiveGroup(i)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              activeGroup === i
                ? "bg-primary-01 text-white"
                : "border border-s-stroke2 bg-b-surface2 text-t-secondary hover:text-t-primary hover:border-primary-01/30"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {SYMBOL_GROUPS[activeGroup].symbols.map((sym) => (
          <button
            key={sym.s + sym.d}
            type="button"
            onClick={() => insertSymbol(sym.s)}
            title={sym.s}
            className="min-w-[2rem] rounded-[7px] border border-s-stroke2 bg-b-surface2 px-2.5 py-1.5 text-center text-[13px] font-medium text-t-primary transition-colors hover:border-primary-01/40 hover:bg-primary-01/5"
          >
            {sym.d}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-s-stroke2 pt-2.5">
        <button
          type="button"
          onClick={() => {
            const val = (mfRef.current?.value ?? "").trim();
            if (val) onSave(val);
          }}
          className="h-8 rounded-[8px] bg-[#151515] px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
        >
          Save equation
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-8 rounded-[8px] border border-s-stroke2 bg-b-surface2 px-4 text-xs font-semibold text-t-secondary transition-colors hover:text-t-primary"
        >
          Cancel
        </button>
        <span className="ml-auto hidden text-[10px] text-t-tertiary sm:inline">⌘/Ctrl+Enter to save · Esc to cancel</span>
      </div>
    </div>
  );
}

// ── Main field ─────────────────────────────────────────────────────────────────
interface TiptapMathFieldProps {
  label?: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  /**
   * Where a picked image should go, when it does not belong in the text.
   *
   * A question's figure is part of the question, not part of its prose, and it
   * is stored in question_images. Given this, the toolbar button hands the file
   * over as a data URL instead of embedding it in the document — so there is
   * one place a figure lives rather than two, and the caller uploads it on save.
   */
  onImageAdd?: (dataUrl: string) => void;
}

export function TiptapMathField({ label, value, disabled, onChange, placeholder, onImageAdd }: TiptapMathFieldProps) {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const lastEmitted = useRef<string>(value ?? "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // question text needs paragraphs, text, hard breaks, bold/italic, history.
        // headings/lists/code blocks/blockquotes/HR are noise here.
        heading: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Image.configure({ inline: false, allowBase64: false }),
      InlineMath,
      DisplayMath,
    ],
    content: storedToDoc(value ?? ""),
    editable: !disabled,
    // React 19 / Next 16: Tiptap renders synchronously on mount by default, which
    // triggers a "flushSync was called from inside a lifecycle method" warning.
    // immediatelyRender: false defers the first render to a microtask, which is
    // the documented Tiptap fix for React 18+/19 + SSR.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-math-field text-sm leading-relaxed text-t-primary outline-none",
        "aria-label": label ?? "Question editor",
      },
    },
    onUpdate: ({ editor }) => {
      const stored = docToStored(editor.getJSON());
      lastEmitted.current = stored;
      onChange(stored);
    },
  });

  editorRef.current = editor;

  // Re-sync from external value when the parent swaps to a different question
  useEffect(() => {
    if (!editor) return;
    if (value !== lastEmitted.current) {
      lastEmitted.current = value ?? "";
      editor.commands.setContent(storedToDoc(value ?? ""), false);
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  const insertInlineMath = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.chain().focus().insertContent({ type: "inlineMath", attrs: { latex: "" } }).run();
  }, []);

  const insertDisplayMath = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.chain().focus().insertContent({ type: "displayMath", attrs: { latex: "" } }).run();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const ed = editorRef.current;
    const file = e.target.files?.[0];
    if (!file) return;

    // A question's figure belongs to the question, so it goes to the field that
    // holds figures rather than into the sentence the reviewer is typing. Read
    // here and uploaded by the caller on save: nothing is stored until the edit
    // is kept, and it works for every role, where the upload endpoint below is
    // open to test-department accounts only.
    if (onImageAdd) {
      try {
        setUploading(true);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        onImageAdd(dataUrl);
      } catch (err: any) {
        alert("Could not read that image: " + (err?.message ?? "unknown error"));
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return;
    }

    if (!ed || !session?.access_token) return;
    try {
      setUploading(true);
      const sessionToken = typeof window !== "undefined"
        ? localStorage.getItem("classphere_session_token") ?? ""
        : "";
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/test-department/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            ...(sessionToken ? { "x-session-token": sessionToken } : {}),
          },
          body: formData,
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Upload failed");
      const url = data.data.url;
      ed.chain().focus().setImage({ src: url, alt: "" }).run();
    } catch (err: any) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!editor) {
    return <div className="min-h-[2.5rem] rounded-[10px] border border-s-stroke2 bg-b-surface2/50" />;
  }

  return (
    <div>
      {label && (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-secondary">{label}</p>
      )}
      <div
        className={[
          "w-full rounded-[12px] border px-3.5 py-3 transition-colors",
          disabled
            ? "border-s-stroke2 bg-b-surface2/50"
            : "border-s-stroke2 bg-b-surface1 focus-within:border-primary-01/40 focus-within:ring-1 focus-within:ring-primary-01/20",
        ].join(" ")}
      >
        <div className="min-h-[2.75rem] tiptap-math-field-host" data-placeholder={placeholder}>
          <EditorContent editor={editor} />
        </div>

        {!disabled && (
          <div className="mt-2 flex items-center gap-1.5 border-t border-s-stroke2/60 pt-2">
            <button
              type="button"
              onClick={insertInlineMath}
              className="flex h-7 items-center gap-1.5 rounded-full border border-s-stroke2 bg-b-surface2 px-2.5 text-[11px] font-semibold text-t-secondary transition-colors hover:border-primary-01/40 hover:bg-primary-01/5 hover:text-primary-01"
              title="Insert inline equation"
            >
              <RiFunctionLine size={13} />
              equation
            </button>
            <button
              type="button"
              onClick={insertDisplayMath}
              className="flex h-7 items-center gap-1.5 rounded-full border border-s-stroke2 bg-b-surface2 px-2.5 text-[11px] font-semibold text-t-secondary transition-colors hover:border-primary-01/40 hover:bg-primary-01/5 hover:text-primary-01"
              title="Insert display (centered) equation"
            >
              <RiParagraph size={13} />
              display
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-7 items-center gap-1.5 rounded-full border border-s-stroke2 bg-b-surface2 px-2.5 text-[11px] font-semibold text-t-secondary transition-colors hover:border-primary-01/40 hover:bg-primary-01/5 hover:text-primary-01 disabled:opacity-50"
            >
              <RiImageAddLine size={13} />
              {uploading ? "uploading…" : "image"}
            </button>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
        )}
      </div>
    </div>
  );
}

export default TiptapMathField;
