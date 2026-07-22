/**
 * segment-parser.ts
 * Parses a LaTeX+prose string into typed segments so the editor can render
 * text and math independently, and serialises them back to a flat string.
 */

export type Segment =
  | { type: "text"; content: string }
  | { type: "math"; latex: string; display: boolean };

/**
 * Split a question-text / option string into alternating text and math segments.
 * Handles: $$...$$, $...$, \[...\], \(...\)
 */
export function parseSegments(raw: string): Segment[] {
  if (!raw && raw !== "") return [{ type: "text", content: "" }];

  const segs: Segment[] = [];
  // Order matters: $$ before $, and \[ before \(
  const MATH_RE = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;

  let lastEnd = 0;
  let m: RegExpExecArray | null;

  while ((m = MATH_RE.exec(raw)) !== null) {
    if (m.index > lastEnd) {
      segs.push({ type: "text", content: raw.slice(lastEnd, m.index) });
    }

    const token = m[0];
    let latex: string;
    let display: boolean;

    if (token.startsWith("$$")) {
      latex = token.slice(2, -2);
      display = true;
    } else if (token.startsWith("\\[")) {
      latex = token.slice(2, -2);
      display = true;
    } else if (token.startsWith("\\(")) {
      latex = token.slice(2, -2);
      display = false;
    } else {
      // $...$
      latex = token.slice(1, -1);
      display = false;
    }

    segs.push({ type: "math", latex: latex.trim(), display });
    lastEnd = m.index + token.length;
  }

  const tail = raw.slice(lastEnd);
  if (tail) segs.push({ type: "text", content: tail });
  if (segs.length === 0) segs.push({ type: "text", content: "" });

  return segs;
}

/** Merge adjacent text segments and drop empty text segments between math blocks. */
export function normaliseSegments(segs: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const s of segs) {
    const prev = out[out.length - 1];
    if (s.type === "text" && prev?.type === "text") {
      (prev as { type: "text"; content: string }).content += s.content;
    } else {
      out.push({ ...s });
    }
  }
  // Ensure at least one segment
  if (out.length === 0) out.push({ type: "text", content: "" });
  return out;
}

/** Convert segment array back to a LaTeX string. */
export function segmentsToString(segs: Segment[]): string {
  return segs
    .map((s) => (s.type === "text" ? s.content : s.display ? `$$${s.latex}$$` : `$${s.latex}$`))
    .join("");
}
