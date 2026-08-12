import { EXAM_PATTERNS } from "./paper-validation";
import { normaliseQuestionType } from "./question-taxonomy";

/**
 * How a paper's sections were arrived at.
 *
 * A reviewer approving a paper needs to know the difference. "Read off the page"
 * is evidence — the paper printed "SECTION B — Numerical Value" and extraction
 * copied it. "Assumed from the exam pattern" is a guess that happens to be right
 * most of the time, and is exactly what silently mislabels a paper that broke
 * the pattern. They must not look the same on screen.
 */
export type SectionSource = "printed" | "pattern" | "inferred";

export interface PaperSection {
  /** "SECTION A", or "Physics" where only the subject split is known. */
  label: string;
  subject: string | null;
  /** Question numbers in this section, in paper order. */
  question_numbers: number[];
  count: number;
  source: SectionSource;
}

interface SectionableQuestion {
  question_number?: number | null;
  position?: number | null;
  subject?: string | null;
  question_type?: unknown;
  source_reference?: { section?: string | null } | null;
}

const numberOf = (q: SectionableQuestion, index: number): number =>
  Number(q.question_number ?? q.position ?? index + 1);

function build(
  groups: Map<string, { subject: string | null; numbers: number[] }>,
  source: SectionSource,
): PaperSection[] {
  return [...groups.entries()]
    .map(([label, group]) => ({
      label,
      subject: group.subject,
      question_numbers: group.numbers.sort((a, b) => a - b),
      count: group.numbers.length,
      source,
    }))
    // Paper order, not insertion order: a question read out of sequence during
    // reconciliation must not reorder the sections it belongs to.
    .sort((a, b) => (a.question_numbers[0] ?? 0) - (b.question_numbers[0] ?? 0));
}

/**
 * The sections of a paper, and how confident we are about them.
 *
 * Three layers, most trustworthy first:
 *
 *   1. printed  — the heading the paper itself printed, detected by
 *                 pymupdf_extractor (SECTION_RE / data-section), copied back by
 *                 the model and carried in source_reference.section. This is a
 *                 fact about the source document.
 *   2. pattern  — the exam's known structure. JEE Main and NEET have a fixed
 *                 per-subject split, so subject boundaries are derivable even
 *                 when the instructions page was missing or unreadable.
 *   3. inferred — subject changes alone. The last resort, and the only option
 *                 for a paper assembled from the question bank, where there is
 *                 no source document to read and no pattern to assume.
 *
 * JEE Advanced never reaches layer 2. Its subject split varies paper to paper,
 * so an expected count is not evidence of anything there, and treating an
 * uneven split as an error produces wrong labels rather than catching them.
 */
export function derivePaperSections(
  questions: SectionableQuestion[],
  examCode: string,
): PaperSection[] {
  if (!questions.length) return [];

  // ── Layer 1: what the paper printed ────────────────────────────────────────
  const printed = new Map<string, { subject: string | null; numbers: number[] }>();
  for (const [index, question] of questions.entries()) {
    const label = String(question.source_reference?.section ?? "").trim();
    if (!label) continue;
    const entry = printed.get(label) ?? { subject: question.subject ?? null, numbers: [] };
    entry.numbers.push(numberOf(question, index));
    printed.set(label, entry);
  }

  // Partial coverage is not a section structure. A heading detected on one page
  // of a twenty-page paper describes that page, and presenting it as the
  // paper's sections would hide every question that fell outside it.
  if (printed.size > 1) {
    const covered = [...printed.values()].reduce((sum, g) => sum + g.numbers.length, 0);
    if (covered >= questions.length * 0.9) return build(printed, "printed");
  }

  // ── Layer 2: the exam's known pattern ──────────────────────────────────────
  const pattern = EXAM_PATTERNS[String(examCode ?? "").trim().toLowerCase()];
  const hasFixedSplit = Boolean(pattern && Object.keys(pattern.counts).length > 0);

  // ── Layers 2 and 3 both group by subject; only the confidence differs ──────
  const bySubject = new Map<string, { subject: string | null; numbers: number[] }>();
  for (const [index, question] of questions.entries()) {
    const subject = String(question.subject ?? "").trim() || "Unspecified";
    const entry = bySubject.get(subject) ?? { subject, numbers: [] };
    entry.numbers.push(numberOf(question, index));
    bySubject.set(subject, entry);
  }

  if (bySubject.size <= 1) return [];

  return build(bySubject, hasFixedSplit ? "pattern" : "inferred");
}

/**
 * Split a section further by question type, where the paper says to.
 *
 * JEE Main and NEET both run a single-correct block and a numerical block
 * inside each subject, and the numerical block always sits at the tail. Only
 * applied when a section actually mixes types — splitting a uniform section
 * would invent a boundary the paper does not have.
 */
export function splitSectionByType(
  section: PaperSection,
  questions: SectionableQuestion[],
): PaperSection[] {
  const byNumber = new Map<number, SectionableQuestion>();
  questions.forEach((question, index) => byNumber.set(numberOf(question, index), question));

  const types = new Map<string, number[]>();
  for (const number of section.question_numbers) {
    const type = normaliseQuestionType(byNumber.get(number)?.question_type) ?? "unknown";
    types.set(type, [...(types.get(type) ?? []), number]);
  }
  if (types.size <= 1) return [section];

  return [...types.entries()]
    .map(([type, numbers]) => ({
      ...section,
      label: `${section.label} · ${type === "integer" ? "Numerical" : "Objective"}`,
      question_numbers: numbers.sort((a, b) => a - b),
      count: numbers.length,
    }))
    .sort((a, b) => (a.question_numbers[0] ?? 0) - (b.question_numbers[0] ?? 0));
}
