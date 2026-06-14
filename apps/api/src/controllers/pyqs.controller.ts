import { Request, Response } from "express";
import path from "path";
import fs from "fs";

// ─── PYQ Paper Registry ───────────────────────────────────────────────────────
// Describes the papers we have on disk. Add new entries here as more JSONs land.

interface PYQMeta {
  id: string;
  exam: string;
  year: number;
  shift: string;
  subjects: string[];
  questions: number;
  marks: number;
  duration: number;          // minutes
  difficulty: "easy" | "medium" | "hard";
  fileName: string;          // path relative to project root (from api process.cwd())
}

// Resolve from the project root (two levels up from apps/api/src)
export const ROOT = path.resolve(process.cwd(), "../../");

export const PYQ_REGISTRY: PYQMeta[] = [
  {
    id: "jee-main-2024-jan-shift1",
    exam: "JEE Main",
    year: 2024,
    shift: "27 Jan – Shift 1",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    questions: 90,
    marks: 300,
    duration: 180,
    difficulty: "hard",
    fileName: "JEE Main 2024 (27 Jan Shift 1).json",
  },
  {
    id: "jee-main-2024-jan-shift2",
    exam: "JEE Main",
    year: 2024,
    shift: "27 Jan – Shift 2",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    questions: 90,
    marks: 300,
    duration: 180,
    difficulty: "hard",
    fileName: "JEE Main 2024 (27 Jan Shift 2).json",
  },
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/pyqs
 * Returns metadata for all available PYQ papers (no questions included).
 */
export const getPYQList = async (req: Request, res: Response): Promise<void> => {
  try {
    // Strip fileName from the public response (it's an internal detail)
    const papers = PYQ_REGISTRY.map(({ fileName, ...meta }) => meta);
    res.json({ success: true, data: { papers, total: papers.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/pyqs/:id/questions
 * Returns the full enriched question array for a specific PYQ paper.
 * Correct answers are included here because this is a PYQ paper
 * (student reviews answers after submitting — no anti-cheat concern for PYQs).
 */
export const getPYQQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const paper = PYQ_REGISTRY.find((p) => p.id === id);
    if (!paper) {
      res.status(404).json({ success: false, message: `PYQ paper '${id}' not found.` });
      return;
    }

    const filePath = path.join(ROOT, paper.fileName);
    if (!fs.existsSync(filePath)) {
      res.status(500).json({
        success: false,
        message: `Question file for '${id}' is not on disk. Expected: ${filePath}`,
      });
      return;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const questions = JSON.parse(raw);

    res.json({
      success: true,
      data: {
        paper: (() => { const { fileName, ...meta } = paper; return meta; })(),
        questions,
        total: questions.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
