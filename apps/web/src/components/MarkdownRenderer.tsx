"use client";

import React, { useEffect, useRef } from "react";

interface MarkdownRendererProps {
  children: string | any;
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
              `<span class="text-red-500 text-xs">${displayMode ? "$$" : "$"}${expr}${displayMode ? "$$" : "$"}</span>`
            );
          }
          return `%%MATH_${idx}%%`;
        };

        let src = safeChildren;

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
        html = html.replace(/%%MATH_(\d+)%%/g, (_m, i) => mathBlocks[+i] ?? "");
        html = sanitizeHtml(html);

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
