"use client";

import React, { useEffect, useRef } from "react";

interface MarkdownRendererProps {
  children: string;
}

/**
 * Lightweight markdown + LaTeX renderer using:
 *  - marked  (CJS, Turbopack-safe) for Markdown → HTML
 *  - KaTeX   (CJS, Turbopack-safe) for math rendering
 *
 * Replaces the react-markdown / remark / rehype stack which is pure-ESM
 * and breaks with Next.js 16 Turbopack from a monorepo node_modules.
 */
export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    (async () => {
      try {
        // Dynamically import so they never run on the server
        const { marked } = await import("marked");
        const katex = (await import("katex")).default;
        await import("katex/dist/katex.min.css" as any);

        // 1. Pre-process: protect LaTeX blocks before marked touches them
        //    $$ ... $$ → display math,   $ ... $ → inline math
        const mathBlocks: string[] = [];
        let src = children;

        // Display math ($$...$$) — replace with placeholder
        src = src.replace(/\$\$([\s\S]+?)\$\$/g, (_match, expr) => {
          const idx = mathBlocks.length;
          try {
            mathBlocks.push(
              katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false })
            );
          } catch {
            mathBlocks.push(`<span class="katex-error">$$${expr}$$</span>`);
          }
          return `MATHBLOCK_${idx}_END`;
        });

        // Inline math ($...$) — replace with placeholder
        src = src.replace(/\$([^$\n]+?)\$/g, (_match, expr) => {
          const idx = mathBlocks.length;
          try {
            mathBlocks.push(
              katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false })
            );
          } catch {
            mathBlocks.push(`<span class="katex-error">$${expr}$</span>`);
          }
          return `MATHBLOCK_${idx}_END`;
        });

        // 2. Run marked on the math-free source
        marked.setOptions({ gfm: true, breaks: true });
        
        // Custom renderer to inject Tailwind classes (replacing react-markdown components)
        const renderer: any = new marked.Renderer();
        renderer.table = (header: any, body: any) => {
          return `<div class="overflow-x-auto my-4"><table class="min-w-full divide-y divide-s-stroke2 border border-s-stroke2 rounded-[10px]">\n<thead>\n${header}</thead>\n<tbody>\n${body}</tbody>\n</table></div>\n`;
        };
        renderer.tablerow = (content: any) => {
          return `<tr>\n${content}</tr>\n`;
        };
        renderer.tablecell = (content: any, flags: any) => {
          const type = flags.header ? 'th' : 'td';
          const className = flags.header 
            ? 'px-4 py-3 text-left text-[13px] font-bold text-t-primary uppercase tracking-wider bg-b-surface2/50' 
            : 'px-4 py-3 text-[14px] text-t-primary border-t border-s-stroke2';
          const align = flags.align ? ` align="${flags.align}"` : '';
          return `<${type} class="${className}"${align}>\n${content}</${type}>\n`;
        };
        renderer.paragraph = (text: any) => `<p class="my-2 leading-relaxed">${text}</p>\n`;
        renderer.list = (body: any, ordered: any, start: any) => {
          const type = ordered ? 'ol' : 'ul';
          const className = ordered ? 'list-decimal list-inside my-2' : 'list-disc list-inside my-2';
          return `<${type} class="${className}">\n${body}</${type}>\n`;
        };

        marked.use({ renderer });
        let html = await marked(src);

        // 3. Restore math blocks
        html = html.replace(/MATHBLOCK_(\d+)_END/g, (_m, i) => mathBlocks[+i] ?? "");

        if (ref.current) ref.current.innerHTML = html;
      } catch (err) {
        // Fallback: plain text
        if (ref.current) ref.current.innerText = children;
      }
    })();
  }, [children]);

  return (
    <div
      ref={ref}
      className="markdown-content prose prose-sm max-w-none"
    />
  );
}
