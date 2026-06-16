# ExamPrep: PDF to Structured JSON Ingestion Engine

## 1. The Core Problem
Converting coaching institute PDFs into structured JSON for the Analysis Engine is the hardest technical challenge in EdTech. Standard PDF parsers (like `pdf2text`) fail completely because:
1. **Double Columns:** Most exam papers are formatted in two columns.
2. **Math & Physics:** Standard OCR cannot read integral signs, matrices, or complex chemical structures.
3. **Diagrams:** Questions often contain inline images that must be extracted and hosted.
4. **Metadata:** The Analysis Engine requires strict `subject`, `chapter`, `topic`, and `difficulty` tags, which are almost never written in the raw PDF.

## 2. The Architecture Workflow

To solve this, we must use a **Vision-based Large Language Model (Vision LLM)** combined with a **Human-in-the-Loop** staging area.

### Step 1: PDF Upload & Slicing
*   The teacher uploads a PDF.
*   The backend (Node.js/Python) converts every page of the PDF into a high-resolution image (`.png` or `.jpeg`).

### Step 2: Vision LLM Extraction (e.g., Gemini 1.5 Pro, GPT-4o)
*   We send the page images to a Vision LLM with a strict JSON schema prompt.
*   **The Prompt:** *"You are an expert JEE/NEET data extractor. Read this exam page. Extract every question. Output complex math in LaTeX format. If there is a diagram, return the bounding box coordinates. Return the output strictly in the provided JSON schema."*

### Step 3: Taxonomy Tagging (RAG / Few-Shot)
*   Once the raw text is extracted, we must tag it.
*   We inject our official ExamPrep Syllabus Taxonomy (List of all JEE/NEET subjects, chapters, and topics) into the LLM prompt.
*   The LLM analyzes the question text and assigns the closest `subject`, `chapter`, and `topic`. It also estimates `difficulty` based on the complexity of the concepts.

### Step 4: Diagram Cropping & Hosting
*   Using the bounding boxes returned by the LLM, our backend crops the diagrams out of the original page images.
*   These cropped images are uploaded to AWS S3 or Supabase Storage.
*   The S3 URLs are injected into the JSON `question_images` array.

### Step 5: The "Staging" Area (Human-in-the-Loop)
*   **AI is never 100% accurate.** A teacher must verify the output before students see it.
*   The generated JSON is saved to a `staging_questions` table.
*   The teacher sees a UI where the original PDF is on the left, and the AI-extracted digital questions (with rendered LaTeX) are on the right.
*   The teacher fixes any typos, corrects the Topic tag if the AI got it wrong, selects the correct Answer Key, and hits **Publish**.

---

## 3. Technology Stack & Costs

| Component | Technology | Cost Estimate |
| :--- | :--- | :--- |
| **PDF to Image Slicer** | `pdf2pic` (Node.js) or `pdf2image` (Python) | Free (Server Compute) |
| **Vision Extraction** | Gemini 1.5 Pro API or OpenAI GPT-4o | ~$0.01 to $0.02 per page |
| **Math OCR (Alternative)** | Mathpix API (Industry Standard for Math) | ~$0.004 per request |
| **Image Hosting** | AWS S3 / Supabase Storage | Near Zero |

*Note: Because this process costs API money, you can charge institutes a "Digitization Fee" (e.g., ₹500 per test), or bundle it into premium B2B plans.*

---

## 4. The LLM Prompt Strategy (Taxonomy Tagging)

To get accurate tags for the Analysis Engine, the prompt must constrain the LLM:

```text
You are an expert JEE/NEET teacher. Analyze the following question:
{question_text}

1. Classify it strictly into one of these SUBJECTS: [Physics, Chemistry, Mathematics, Botany, Zoology].
2. Based on the subject, classify it into the correct CHAPTER from the official NTA syllabus list provided below.
3. Identify the specific TOPIC within that chapter.
4. Estimate difficulty (easy/medium/hard) based on multi-concept usage or calculation depth.

Return ONLY a JSON object: 
{ "subject": "...", "chapter": "...", "topic": "...", "difficulty": "..." }
```

## 5. UI Requirements for Teacher Dashboard
To build this, the frontend team needs to create:
1. **Upload Portal:** Drag-and-drop PDF area.
2. **Parsing Loading State:** A progress bar (Parsing Page 1/15...).
3. **Verification Split-Screen:** 
   - Left side: The PDF viewer.
   - Right side: Form fields for Question Text (with LaTeX preview), Options, Subject/Chapter/Topic dropdowns, and Answer Key selection.
4. **Bulk Action:** "Publish Test" button that moves data from `staging` to production.
