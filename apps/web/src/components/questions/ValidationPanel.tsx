"use client";

import { RiShieldCheckLine, RiErrorWarningLine, RiAlertLine } from "@remixicon/react";
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

export function ValidationPanel({
  result,
  onClose,
  onJump,
}: {
  result: ValidationResult;
  onClose: () => void;
  /** Opens the question in the editor. The panel stays open — the reviewer is
   *  working through a list and closing it after the first fix loses their place. */
  onJump: (questionId: string) => void;
}) {
  const summary = result.summary;
  const reports = result.questions ?? [];

  return (
    <div className={`mb-3 shrink-0 overflow-hidden rounded-[12px] border text-sm ${result.valid ? "border-green-500/30 bg-green-500/5" : "border-primary-03/30 bg-primary-03/5"}`}>
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
          {reports.map((report) => (
            <button
              key={report.question_id}
              type="button"
              onClick={() => onJump(report.question_id)}
              className="flex w-full items-start gap-3 border-b border-s-stroke2/40 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-b-surface2"
            >
              <span className={`mt-0.5 flex h-6 w-9 shrink-0 items-center justify-center rounded-[6px] text-[11px] font-bold ${
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
              </span>
              <span className="mt-0.5 shrink-0 text-[11px] font-semibold text-t-tertiary">Open →</span>
            </button>
          ))}
        </div>
      )}

      {result.valid && (
        <p className="px-4 pb-3 text-xs text-t-secondary">
          Every question has text, options and an answer, and the counts match {result.examCode}.
        </p>
      )}
    </div>
  );
}
