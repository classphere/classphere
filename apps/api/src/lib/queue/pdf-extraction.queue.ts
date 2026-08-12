import { Queue } from "bullmq";
import { loggedConnection } from "./redis";
import type { ExamCategory } from "../../services/extractor/pdfExtractor.service";

export const PDF_EXTRACTION_QUEUE_NAME = "pdf_extraction_queue";

export interface PdfExtractionJobData {
  jobId: string;       // Supabase row id in pdf_extraction_jobs
  r2Key: string;       // Original temp PDF in R2
  pages?: string;      // Optional page range e.g. "1-5"
  requestedBy: string; // user id for audit
  examCategory?: ExamCategory; // Selected exam type to route to appropriate LLM
}

export const pdfExtractionQueue = new Queue(PDF_EXTRACTION_QUEUE_NAME, {
  connection: loggedConnection("pdfExtractionQueue") as any,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200, age: 48 * 3600 },
  },
});

export async function enqueuePdfExtraction(data: PdfExtractionJobData) {
  return pdfExtractionQueue.add("extract", data, {
    jobId: `pdf-${data.jobId}`,
  });
}
