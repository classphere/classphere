# ExamPrep: PDF to Structured JSON Ingestion Engine

## 1. The Core Problem
Converting coaching institute PDFs into structured JSON for the Analysis Engine is the hardest technical challenge in EdTech. Standard PDF parsers (like `pdf2text`) fail completely because:
1. **Double Columns:** Most exam papers are formatted in two columns.
2. **Math & Physics:** Standard OCR cannot read integral signs, matrices, or complex chemical structures.
3. **Diagrams:** Questions often contain inline images that must be extracted and hosted.
4. **Metadata:** The Analysis Engine requires strict `subject`, `chapter`, `topic`, and `difficulty` tags, which are almost never written in the raw PDF.

---

## 2. The Multi-Agent Architecture (Foolproof Strategy)

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

## 3. The Architecture Workflow (With Agents)

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
*   The teacher reviews the Split-Screen UI. Because of the Multi-Agent system, the teacher now spends 30 seconds clicking "Approve All" instead of 10 minutes fixing typos.

---

## 4. Technology Stack & Costs

| Component | Technology | Cost Estimate |
| :--- | :--- | :--- |
| **Agent Framework** | LangChain / LangGraph / Microsoft AutoGen | Open Source |
| **Vision Extractor (Agent 1)** | Gemini 1.5 Pro / GPT-4o | ~$0.01 per page |
| **Critic & Tagger (Agents 2 & 3)**| Claude 3.5 Sonnet / GPT-4o-mini | ~$0.002 per question |
| **Vector DB (For Agent 3)** | Pinecone / Supabase pgvector | Free Tier / Built-in |
| **Math OCR (Alternative)** | Mathpix API (Industry Standard for Math) | ~$0.004 per request |

*Note: The multi-agent loop costs slightly more in API tokens, but drastically reduces the human labor cost required to digitize an exam.*

---

## 5. UI Requirements for Teacher Dashboard
1. **Upload Portal:** Drag-and-drop PDF area.
2. **Agent Progress UI:** A progress bar showing the agent status: *(1. Extracting Text... 2. Validating Math... 3. Searching Syllabus...)*. This looks incredibly premium to users.
3. **Verification Split-Screen:** 
   - Left side: The PDF viewer.
   - Right side: Form fields for Question Text, Subject/Chapter/Topic.
4. **Bulk Action:** "Publish Test" button.
