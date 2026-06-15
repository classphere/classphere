# ExamPrep: NEET Offline (OMR) Architecture & Design Doc

## 1. Executive Summary & Philosophy

NEET is a pen-and-paper exam. If we force institutes to test students digitally on screens, we ruin their OMR bubbling practice and time-management conditioning. 

To win B2B deals with NEET-focused coaching institutes, ExamPrep operates as a **Data Ingestion & Intelligence Layer**. We allow institutes to conduct physical exams exactly as they do today, ingest the data from their physical OMR scanning machines, and instantly generate our signature "AI-grade" analysis reports.

**Cost Philosophy:** This entire offline architecture uses **zero** external LLM/AI APIs. The CSV parsing, data mapping, and analysis generation run entirely on our deterministic, free Typescript rule engine (v3).

---

## 2. The Three Workflows

### Workflow A: Institute Bulk Upload (The B2B MVP)
*This is what the team must build first.*
1. Institute conducts physical exam and uses their existing optical scanner (e.g., Sekonic, Scantron).
2. The scanner outputs a standard Excel/CSV file containing Roll Numbers and bubbled answers.
3. Institute admin logs into ExamPrep B2B Dashboard, selects the exam, and uploads the CSV.
4. ExamPrep instantly generates Attempt records and fires the Analysis Engine.
5. 500 students instantly receive their deep-dive diagnostics on their phones.

### Workflow B: The "Hybrid" Speed Run (At-Home Practice)
1. Student sits at home with a physical question paper.
2. Student opens the ExamPrep app and selects "Offline Test Mode".
3. The app displays only a timer and a grid of A/B/C/D buttons (no questions on screen).
4. Student solves on paper and taps the app instead of bubbling a sheet.
5. *Benefit:* This preserves exact `time_taken_sec` data, giving the student 100% of the analysis engine's power while keeping their eyes on physical paper.

### Workflow C: Mobile OMR Scanning (Future Roadmap)
1. Student prints an ExamPrep OMR sheet.
2. Bubbles the sheet at home.
3. Uses the ExamPrep mobile app camera to scan the sheet (via OpenCV/AWS Rekognition).

---

## 3. Data Schema: The CSV Ingestion Format

To reduce friction, we must accept the **industry-standard horizontal format** that optical scanners natively export.

### Expected CSV Structure
| roll_number | Q1 | Q2 | Q3 | Q4 | ... | Q200 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NT2024001** | A | C | B | | ... | D |
| **NT2024002** | B | C | *BLANK* | A | ... | A |

### Parsing Rules:
*   **`roll_number`**: The unique ID bubbled by the student. Must map to our `student.roll_number` or `student.id` in the DB.
*   **Answers**: Valid values are `A`, `B`, `C`, `D` (or `1`, `2`, `3`, `4`).
*   **Skips/Blanks**: Empty strings or the word `BLANK` map to `selected_answer: null`.
*   **Multiple Bubbles (e.g., `A,C`)**: Map to `selected_answer: null` (invalidated / zero marks as per NEET rules).

---

## 4. API Implementation Plan

### Endpoint: `POST /api/institute/tests/:testId/omr-upload`
**Auth Level:** Institute Admin / Teacher

**Workflow:**
1. **Validate Test:** Ensure `testId` exists and has an uploaded answer key / question map.
2. **Parse CSV:** Use `csv-parse` (or native fast-csv) to read rows into memory.
3. **Lookup Students:** Batch query the DB to resolve `roll_number` to `student_id`. Return errors for missing roll numbers.
4. **Generate Attempts (Transaction):**
   For each matched student, generate an `Attempt` record:
   ```json
   {
     "student_id": "uuid",
     "exam_id": "testId",
     "submission_mode": "omr_upload",
     "has_timing_data": false
   }
   ```
5. **Generate Answers:**
   Iterate from Q1 to Q200. Map `Q{i}` to the actual database `question_id`.
   ```json
   {
     "attempt_id": "uuid",
     "question_id": "uuid",
     "selected_answer": "A",
     "time_taken_sec": 0,
     "marked_review": false
   }
   ```
6. **Trigger Analysis:** Execute `analyzeAttempt(attemptId, false)` asynchronously.

---

## 5. The Analysis Engine "Offline Mode"

The v3 Analysis Engine (`analysis.service.ts`) accepts a `hasTimingData` boolean. When OMR data is passed (`hasTimingData = false`), the engine gracefully degrades to remain mathematically safe:

#### What is Disabled / Changed:
1. **Attempt Strategy:** Completely skipped. The engine returns a neutral score of 100 with the message *"Offline OMR test — time management tracking is disabled."*
2. **Time-Based Heuristics:** In `mistake-classifier.ts`, we cannot flag a question as a "Lucky Guess" or a "Misread" based on speed.
3. **Difficulty Fallback:** If a wrong answer lacks a distractor map, the engine looks at difficulty. Wrong on an Easy question = "Calculation Error". Wrong on Medium/Hard = "Conceptual Error".
4. **Skips:** Classified simply as "Unknown" rather than attempting to guess if the student ran out of time or didn't know the concept.

#### What Still Works Perfectly (The Value Prop):
*   Overall Scoring & Percentiles
*   Topic-by-Topic Accuracy & Weakness Detection
*   Longitudinal Profiling (Recurring blind spots across multiple tests)
*   Distractor Map Analysis (If they pick option C, and we know C is a common sign error trap)
*   Study Plan Generation
*   Urgency-Aware Narrative Summary

---

## 6. Frontend UI Considerations

**Institute Dashboard (`apps/web/src/app/institute/...`)**
*   Add an "Upload OMR Data" button on the Test Detail page.
*   Provide a "Download Sample CSV Format" button.
*   Build a staging table UI that shows the CSV parse results before hitting "Confirm Upload" (e.g., *"Found 190 students. 3 Roll Numbers missing in database."*).

**Student Result Dashboard (`apps/web/src/app/results/[id]...`)**
*   If `attempt.submission_mode === 'omr_upload'`, hide the "Time per Question" graphs and the "Attempt Strategy" timeline component.
*   Add a subtle badge: "Offline Attempt" to set expectations.
