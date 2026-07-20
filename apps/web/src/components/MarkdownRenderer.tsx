"use client";

import React, { useEffect, useRef } from "react";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  children: string | any;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]!));
}

/** Keep Markdown usable while removing executable/raw-HTML attack surfaces. */
function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocked = new Set(["script", "style", "iframe", "object", "embed", "form", "input", "button", "meta", "link"]);
  doc.body.querySelectorAll("*").forEach((element) => {
    if (blocked.has(element.tagName.toLowerCase())) {
      element.remove();
      return;
    }
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || name === "style" ||
          ((name === "href" || name === "src") && !/^(https?:|mailto:|#|\/|data:image\/)/.test(value))) {
        element.removeAttribute(attribute.name);
      }
    }
    if (element.tagName.toLowerCase() === "a") {
      element.setAttribute("rel", "noopener noreferrer");
    }
  });
  return doc.body.innerHTML;
}

/**
 * OCR table extraction commonly emits a leading empty cell for every row.
 * Those cells add visual noise without carrying question data. Remove only
 * genuinely empty cells/rows; real tables, values, maths and images remain.
 */
function removeEmptyExtractedTableCells(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.body.querySelectorAll("table").forEach((table) => {
    table.querySelectorAll("tr").forEach((row) => {
      row.querySelectorAll("th, td").forEach((cell) => {
        const hasMeaningfulText = (cell.textContent ?? "").replace(/\u00a0/g, " ").trim().length > 0;
        const hasMedia = Boolean(cell.querySelector("img, svg, math"));
        if (!hasMeaningfulText && !hasMedia) cell.remove();
      });
      if (!row.querySelector("th, td")) row.remove();
    });
    if (!table.querySelector("tr")) table.remove();
  });
  return doc.body.innerHTML;
}

function recoverOcrCodeBlocks(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.body.querySelectorAll("pre > code").forEach((code) => {
    const text = code.textContent ?? "";
    const isLikelyProgram = /[{};]|\b(?:const|let|function|class|return|import|def)\b/.test(text);
    // Matching tables extracted from a PDF are often emitted as a multi-line
    // code block. Keep genuine programming questions intact.
    if (text.includes("\n") && !isLikelyProgram) {
      const replacement = doc.createElement("div");
      replacement.className = "ocr-text-recovery";
      // OCR often inserts several whitespace-only lines between each table
      // value. They are not meaningful paragraph spacing and make matching
      // questions look like a broken, metres-tall list.
      replacement.textContent = text.replace(/\n[ \t]*\n+/g, "\n").trim();
      code.parentElement?.replaceWith(replacement);
    }
  });
  return doc.body.innerHTML;
}

/**
 * PDF/OCR extraction frequently indents every line of a question. Markdown
 * treats four spaces as a code block, which turns normal Biology tables into
 * narrow monospace grey strips. Remove the common indentation only outside
 * explicit fenced code blocks.
 */
function removeAccidentalOcrIndentation(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const nonEmpty = lines.filter((line) => line.trim() && !line.trimStart().startsWith("```"));
  if (!nonEmpty.length) return text;
  const indents = nonEmpty.map((line) => (line.match(/^ +/)?.[0].length ?? 0));
  const commonIndent = Math.min(...indents);
  if (commonIndent < 4) return text;

  let inFence = false;
  return lines.map((line) => {
    if (line.trimStart().startsWith("```")) { inFence = !inFence; return line; }
    return inFence ? line : line.slice(0, commonIndent) === " ".repeat(commonIndent) ? line.slice(commonIndent) : line;
  }).join("\n");
}

/**
 * Lightweight markdown + LaTeX renderer.
 * 
 * Supports:
 *  - $$...$$ → display math
 *  - \[...\] → display math (alternative notation)
 *  - $...$ → inline math
 *  - \(...\) → inline math (alternative notation)
 * 
 * Uses marked.parse() with DEFAULT renderer to avoid marked v5 API breakage
 * where custom renderer callbacks receive token objects instead of strings.
 */
export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Coerce to string defensively
  const safeChildren: string =
    children == null
      ? ""
      : typeof children === "string"
        ? children
        : typeof children === "object"
          ? JSON.stringify(children)
          : String(children);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    if (!safeChildren.trim()) {
      ref.current.innerHTML = "";
      return;
    }

    (async () => {
      try {
        const katex = (await import("katex")).default;

        const mathBlocks: string[] = [];

        const renderMath = (expr: string, displayMode: boolean): string => {
          const idx = mathBlocks.length;
          try {
            mathBlocks.push(
              katex.renderToString(expr.trim(), {
                displayMode,
                throwOnError: false,
                // TeX remains fully supported, but KaTeX must not emit raw HTML,
                // JavaScript URLs, or HTML attributes from untrusted question text.
                trust: false,
                strict: false,
              })
            );
          } catch {
            mathBlocks.push(
              `<span class="text-red-500 text-xs">${displayMode ? "$$" : "$"}${escapeHtml(expr)}${displayMode ? "$$" : "$"}</span>`
            );
          }
          return `%%MATH_${idx}%%`;
        };

        let src = removeAccidentalOcrIndentation(safeChildren);

        // ── Display math: $$...$$ (highest priority, check before inline)
        src = src.replace(/\$\$([\s\S]+?)\$\$/g, (_m, e) => renderMath(e, true));

        // ── Display math: \[...\]
        src = src.replace(/\\\[([\s\S]+?)\\\]/g, (_m, e) => renderMath(e, true));

        // ── Inline math: \(...\)
        src = src.replace(/\\\(([\s\S]+?)\\\)/g, (_m, e) => renderMath(e, false));

        // ── Inline math: $...$ (only when not preceded/followed by another $)
        src = src.replace(/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g, (_m, e) => renderMath(e, false));

        // ── Run marked with DEFAULT renderer ────────────────────────────────
        let html: string;
        try {
          const { marked } = await import("marked");
          html = await marked.parse(src, { gfm: true, breaks: true });
        } catch {
          // Fallback: treat newlines as breaks
          html = `<p>${src.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
        }

        // ── Restore math blocks ─────────────────────────────────────────────
        // Sanitize only untrusted Markdown output. KaTeX is generated locally
        // and needs its inline positioning styles for fractions and subscripts.
        html = recoverOcrCodeBlocks(removeEmptyExtractedTableCells(sanitizeHtml(html)));
        html = html.replace(/%%MATH_(\d+)%%/g, (_m, i) => mathBlocks[+i] ?? "");

        if (ref.current) ref.current.innerHTML = html;
      } catch (err) {
        if (ref.current) ref.current.innerText = safeChildren;
      }
    })();
  }, [safeChildren]);

  return (
    <div
      ref={ref}
      className="markdown-content"
    />
  );
}
