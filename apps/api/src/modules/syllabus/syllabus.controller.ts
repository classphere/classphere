import { Request, Response } from "express";
import { CANONICAL_SYLLABI, normaliseExamCode } from "./canonical-syllabus";

/**
 * GET /api/v1/syllabus/:examCode
 * A versioned, chapter-level catalog that clients can use for filters,
 * coverage UI and content planning. It intentionally excludes copied PDF
 * prose; the official URL remains the authoritative full specification.
 */
export const getCanonicalSyllabus = (req: Request, res: Response): void => {
  const syllabus = CANONICAL_SYLLABI[normaliseExamCode(req.params.examCode)];
  res.status(200).json({ success: true, data: syllabus });
};
