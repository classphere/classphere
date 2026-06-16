# ExamPrep: PDF to Structured JSON Ingestion Engine

## 1. The Core Problem
Converting coaching institute PDFs into structured JSON for the Analysis Engine is the hardest technical challenge in EdTech. Standard PDF parsers (like `pdf2text`) fail completely because:
1. **Double Columns:** Most exam papers are formatted in two columns.
2. **Math & Physics:** Standard OCR cannot read integral signs, matrices, or complex chemical structures.
3. **Diagrams:** Questions often contain inline images that must be extracted and hosted.

Because text extraction (LaTeX OCR) is highly prone to human-visible errors (like missing a minus sign), our architecture is split into two phases: **V1 (Image-Based)** for immediate foolproof market entry, and **V2 (Multi-Agent Text)** for advanced digital-native scaling.

---

## 2. The V1 Approach: Image-Based Smart Cropping (Recommended MVP)

To achieve 100% foolproof accuracy and bypass the OCR/LaTeX rendering problem entirely, the V1 ingestion engine uses **Smart Cropping**. Instead of extracting the text, we simply crop the physical question block out of the PDF and show the image to the student.

### The Workflow
1. **PDF Upload & Slicing:** Teacher uploads the PDF. Backend converts every page to a high-res image.
2. **Bounding Box Detection:** We use a lightweight Object Detection model (like YOLOv8) or a Vision LLM (GPT-4o/Gemini) to detect the exact `[y1, x1, y2, x2]` coordinates of each question block.
3. **Auto-Crop & Host:** A Python script (OpenCV) slices the PDF page using those coordinates. The resulting images (`q1_crop.jpg`, `q2_crop.jpg`) are uploaded to AWS S3.
4. **Taxonomy Tagging:** A RAG Agent reads the image in the background *purely* to assign the `subject`, `chapter`, and `topic` tags for the Analysis Engine. (If it misreads a number, it doesn't matter, it only cares about syllabus mapping).
5. **The Student UI:** The student sees the cropped image of the question on their phone, with 4 digital buttons below it: `[ A ] [ B ] [ C ] [ D ]`.

### Why V1 Wins B2B Deals:
* **Zero Rendering Errors:** It is literally a picture of the original paper. No missing minus signs, no broken matrices.
* **Speed:** Slicing a 100-page PDF takes seconds.
* **Cost:** Bounding box detection is 10x cheaper than full text OCR.
* **Zero Human Verification:** Because there is no digital text to fix, the teacher skips the verification step. They just upload the PDF and the A/B/C/D Answer Key CSV.

---

## 3. The V2 Approach: Multi-Agent Text Extraction (Future State)

When we need fully digital text (for accessibility, text-to-speech, or dynamic question banks), we use a Multi-Agent workflow to extract and correct the data.

To achieve 98%+ accuracy and reduce the teacher's manual verification time to near zero, we graduate from a single LLM prompt to an **Agentic Workflow**. 

Instead of asking one AI to do everything, we spin up a team of specialized AI Agents that critique and correct each other.

### Agent 1: The Vision Extractor
*   **Role:** Looks at the raw PDF image and extracts the raw text, LaTeX equations, and diagram bounding boxes.
*   **Limitation:** It might hallucinate a matrix or miss a minus sign.

### Agent 2: The LaTeX Compiler & Critic
*   **Role:** Takes the output from Agent 1 and tries to "compile" the LaTeX.
*   **Action:** If the math syntax is broken (e.g., missing a bracket `\frac{1}{2`), Agent 2 rejects the output and sends an error message back to Agent 1: *"Line 4 has invalid LaTeX. Fix the integral bounds and try again."*
*   **Result:** The frontend never crashes from bad math rendering because the Agents fixed it iteratively.

### Agent 3: The RAG Taxonomy Specialist
*   **Role:** Responsible purely for `subject`, `chapter`, and `topic` tagging.
*   **Action:** Instead of reading a static list, this Agent uses **Vector Search**. It compares the extracted question against a vector database of 10,000 past JEE questions that are perfectly tagged. It finds the 3 most similar questions and assigns the exact same topic tag. 
*   **Result:** 99% accuracy on syllabus mapping.

### Agent 4: The Auto-Solver (Optional / Advanced)
*   **Role:** Generates the Answer Key and Distractor Maps if the institute didn't provide one.
*   **Action:** Uses a Python Code Interpreter tool to actually *solve* the physics/math problem programmatically to verify the correct option, and deduces what common mistake leads to Option B (creating the `distractor_map`).

---

## 4. The V2 Architecture Workflow

### Step 1: PDF Upload & Slicing
*   The teacher uploads a PDF.
*   The backend converts every page into high-resolution images (`.png`).

### Step 2: The Agentic Loop
*   The Orchestrator script passes the image to **Agent 1**.
*   **Agent 1** extracts JSON.
*   **Agent 2** validates the LaTeX. (Loops back to Agent 1 if failed).
*   **Agent 3** assigns the Taxonomy tags.
*   The final, verified JSON is generated.

### Step 3: Diagram Cropping & Hosting
*   Backend crops the diagrams out using Agent 1's bounding boxes.
*   Uploaded to AWS S3.

### Step 4: The "Staging" Area (Human-in-the-Loop)
*   Even with Agents, you can never claim 100% foolproof perfection because input PDFs can be blurry or have typos themselves. 
*   The output goes to the `staging_questions` table.
*   The teacher reviews the Split-Screen UI to approve the digital text before publishing.

---

## 5. Technology Stack & Costs

| Component | Technology | Cost Estimate |
| :--- | :--- | :--- |
| **Agent Framework** | LangChain / LangGraph / Microsoft AutoGen | Open Source |
| **Vision Extractor (Agent 1)** | Gemini 1.5 Pro / GPT-4o | ~$0.01 per page |
| **Critic & Tagger (Agents 2 & 3)**| Claude 3.5 Sonnet / GPT-4o-mini | ~$0.002 per question |
| **Vector DB (For Agent 3)** | Pinecone / Supabase pgvector | Free Tier / Built-in |
| **Math OCR (Alternative)** | Mathpix API (Industry Standard for Math) | ~$0.004 per request |

*Note: The multi-agent loop costs slightly more in API tokens, but drastically reduces the human labor cost required to digitize an exam.*

---

## 6. UI Requirements for Teacher Dashboard
1. **Upload Portal:** Drag-and-drop PDF area.
2. **Processing UI:** Progress bar showing status *(Extracting Bounding Boxes -> Cropping Images -> Tagging Syllabus)*.
3. **Verification Screen (V1):** Teacher just confirms the bounding boxes match the questions.
4. **Verification Screen (V2):** Split-Screen UI with PDF viewer on left, generated text/LaTeX on right.
5. **Bulk Action:** "Publish Test" button.
