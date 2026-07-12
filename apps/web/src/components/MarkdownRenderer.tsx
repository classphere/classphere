"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  children: string;
}

export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
        // Customize components if necessary (e.g. style tables)
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full divide-y divide-s-stroke2 border border-s-stroke2 rounded-[10px]" {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => (
          <thead className="bg-b-surface2/50" {...props} />
        ),
        th: ({ node, ...props }) => (
          <th className="px-4 py-3 text-left text-[13px] font-bold text-t-primary uppercase tracking-wider" {...props} />
        ),
        td: ({ node, ...props }) => (
          <td className="px-4 py-3 text-[14px] text-t-primary border-t border-s-stroke2" {...props} />
        ),
        p: ({ node, ...props }) => (
          <p className="my-2 leading-relaxed" {...props} />
        ),
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-inside my-2" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal list-inside my-2" {...props} />
        )
      }}
    >
      {children}
    </ReactMarkdown>
    </div>
  );
}
