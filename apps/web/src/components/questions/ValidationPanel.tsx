"use client";

import { useState } from "react";
import { RiShieldCheckLine, RiErrorWarningLine, RiAlertLine, RiRobot2Line } from "@remixicon/react";
import { SUBJECT_COLOR } from "@/lib/exam-config";

/**
 * The result of validating a paper, as a worklist.
 *
 * Shared by every surface that reviews a PDF-extracted paper — the Test
 * Department workspace, the Institute Admin's own review, and the Superadmin
 * question bank. A small coaching where the owner does everything and a large
 * one with a dedicated test department are looking at the same paper with the
 * same problems, so they get the same screen.
 *
 * It reports which questions are wrong rather than how many. Counting told a
 * reviewer that twelve questions had a problem and left them to open all
 * seventy-five to find them; each affected question is listed here with what is
 * wrong with it, and selecting one opens it in the editor.
 *
 * Fed by lib/paper-validation.ts on the server, which also guards publication —
 * so a paper cannot pass this panel and then be refused at publish.
 */

export type IssueSeverity = "error" | "warning";

export interface QuestionIssue {
  code: string;
  message: string;
  severity: IssueSeverity;
}

export interface QuestionReport {
  question_id: string;
  question_number: number;
  position: number;
  subject: string | null;
  severity: IssueSeverity;
  issues: QuestionIssue[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  counts: Record<string, number>;
  total: number;
  examCode: string;
  summary?: { total: number; clean: number; withIssues: number; withErrors: number };
  questions?: QuestionReport[];
}

// Issue codes worth handing to AI. Deliberately excludes ones where an
// automated "fix" would be wrong or pointless: text_mismatch (the whole point
// is a human checking against the source PDF — an AI can't verify itself
// against a page it never saw), ai_unverified (fixing it requires the same
// human check that clears it, not another AI pass), missing_figure (nothing
// to generate an image from), and no_subject/no_chapter (better hand-picked
// by a reviewer who actually knows the paper than guessed).
const AI_FIXABLE_CODES = new Set([
  "empty_question", "no_answer", "too_few_options", "empty_option", "answer_count",
  "options_not_array", "option_missing_id", "answer_not_array", "answer_not_scalar",
  "answer_not_an_option", "unbalanced_math", "images_not_array", "image_not_a_url", "raw_mathml",
  "matching_options_are_table_numbers",
]);

export function ValidationPanel({
  result,
  onClose,
  onJump,
  onFixWithAI,
}: {
  result: ValidationResult;
  onClose: () => void;
  /** Opens the question in the editor. The panel stays open — the reviewer is
   *  working through a list and closing it after the first fix loses their place. */
  onJump: (questionId: string) => void;
  /**
   * Asks AI to repair a question against its own validation errors — the
   * option/answer-key problems "matching" and "assertion_reason" questions
   * usually fail with, not just gap placeholders. Omitted where the surface
   * has no AI fix wired up.
   */
  onFixWithAI?: (questionId: string, errorMessage: string) => Promise<void>;
}) {
  const summary = result.summary;
  const reports = result.questions ?? [];
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixError, setFixError] = useState<{ id: string; message: string } | null>(null);

  const runFix = async (report: QuestionReport) => {
    if (!onFixWithAI || fixingId) return;
    setFixingId(report.question_id);
    setFixError(null);
    try {
      await onFixWithAI(report.question_id, report.issues.map((i) => i.message).join(" "));
    } catch (error: any) {
      setFixError({ id: report.question_id, message: error?.message ?? "AI could not fix this." });
    } finally {
      setFixingId(null);
    }
  };

  return (
    <div className={`mb-3 shrink-0 overflow-hidden rounded-md border text-sm ${result.valid ? "border-green-500/30 bg-green-500/5" : "border-primary-03/30 bg-primary-03/5"}`}>
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          {result.valid
            ? <RiShieldCheckLine size={16} className="text-green-600" />
            : <RiErrorWarningLine size={16} className="text-primary-03" />}
          <span className="font-semibold text-t-primary">
            {result.valid
              ? "Paper is valid"
              : summary?.withErrors
                ? `${summary.withErrors} question${summary.withErrors === 1 ? "" : "s"} need fixing`
                : "Validation failed"}
          </span>
          {summary && (
            <span className="text-[11px] text-t-secondary">{summary.clean}/{summary.total} clean</span>
          )}
        </div>
        <button onClick={onClose} className="text-[11px] text-t-tertiary hover:text-t-primary">Dismiss</button>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 py-2">
        {Object.entries(result.counts ?? {}).map(([subject, count]) => {
          const color = SUBJECT_COLOR[subject];
          return (
            <span
              key={subject}
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${color ? `${color.bg} ${color.border} ${color.text}` : "border-s-stroke2 bg-b-surface2 text-t-secondary"}`}
            >
              {subject}: {count}
            </span>
          );
        })}
        <span className="rounded-full border border-s-stroke2 bg-b-surface2 px-2 py-0.5 text-xs text-t-secondary">
          Total: {result.total}
        </span>
      </div>

      {/* Paper level: counts against the exam's known structure. */}
      {(result.errors?.length > 0 || result.warnings?.length > 0) && (
        <div className="px-4 pb-2">
          {result.errors?.map((error, index) => (
            <div key={`e${index}`} className="mb-1 flex items-start gap-1.5">
              <RiErrorWarningLine size={12} className="mt-0.5 shrink-0 text-primary-03" />
              <p className="text-xs text-primary-03">{error}</p>
            </div>
          ))}
          {result.warnings?.map((warning, index) => (
            <div key={`w${index}`} className="mb-1 flex items-start gap-1.5">
              <RiAlertLine size={12} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-600 dark:text-amber-400">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Per question. Errors first, then paper order — worked top to bottom. */}
      {reports.length > 0 && (
        <div className="max-h-[260px] overflow-y-auto border-t border-s-stroke2/60 bg-b-surface1/40">
          {reports.map((report) => {
            const fixable = onFixWithAI && report.issues.some((issue) => AI_FIXABLE_CODES.has(issue.code));
            const fixing = fixingId === report.question_id;
            return (
              <div
                key={report.question_id}
                className="flex w-full items-start gap-2 border-b border-s-stroke2/40 px-4 py-2.5 last:border-b-0 hover:bg-b-surface2"
              >
                <button
                  type="button"
                  onClick={() => onJump(report.question_id)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <span className={`mt-0.5 flex h-6 w-9 shrink-0 items-center justify-center rounded-sm text-[11px] font-bold ${
                    report.severity === "error" ? "bg-primary-03/15 text-primary-03" : "bg-amber-500/15 text-amber-600"
                  }`}>
                    Q{report.question_number}
                  </span>
                  <span className="min-w-0 flex-1">
                    {report.issues.map((issue, index) => (
                      <span
                        key={index}
                        className={`block text-xs leading-relaxed ${issue.severity === "error" ? "text-primary-03" : "text-amber-600 dark:text-amber-400"}`}
                      >
                        {issue.message}
                      </span>
                    ))}
                    {fixError?.id === report.question_id && (
                      <span className="mt-1 block text-xs font-semibold text-primary-03">{fixError.message}</span>
                    )}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  {fixable && (
                    <button
                      type="button"
                      disabled={fixing}
                      onClick={() => runFix(report)}
                      title="Ask AI to repair this question against the errors above"
                      className="flex items-center gap-1 rounded-md border border-primary-01/30 bg-primary-01/5 px-2 py-1 text-[11px] font-semibold text-primary-01 transition-colors hover:border-primary-01/60 disabled:opacity-50"
                    >
                      <RiRobot2Line size={12} />
                      {fixing ? "Fixing…" : "Fix with AI"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onJump(report.question_id)}
                    className="text-[11px] font-semibold text-t-tertiary hover:text-t-primary"
                  >
                    Open →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {result.valid && (
        <p className="px-4 pb-3 text-xs text-t-secondary">
          Every question has text, options and an answer — ready to publish.
        </p>
      )}
    </div>
  );
}
