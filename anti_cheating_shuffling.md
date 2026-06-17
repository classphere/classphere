# Anti-Cheating Architecture: Question Shuffling & Answer Key Mapping

**Author:** Engineering Team
**Status:** Architecture Blueprint

---

## 1. The Problem: Cheating via Sequence Sharing

In large-scale competitive mock tests (JEE/NEET), students taking the exam simultaneously may attempt to share answers sequentially (e.g., "1 is B, 2 is C, 3 is A"). 

To prevent this, the system must shuffle the display sequence of questions for every individual student. If Student A sees a Physics question at `Q1`, Student B might see that exact same question at `Q14`.

**The Challenge:** When an Institute uploads a single "Master Answer Key" (usually a simple CSV mapped to the original 1-200 sequence of the uploaded PDF), how does the system score answers correctly when every student has a unique, randomized sequence?

---

## 2. The Solution: Decoupling Display Sequence from Question ID

The core architectural principle to solve this is to **strictly decouple the visual display number from the data layer's tracking ID.**

Business logic, scoring, and analysis must **never** rely on the index/number (1, 2, 3...) that the student sees.

### 2.1. Phase 1: Ingestion & Master State
When an Institute Admin uploads a Test (PDF + Answer Key), the system creates the "Master Sequence".

1.  **Question Generation:** The system slices the PDF and creates a database row for each question, assigning a unique, immutable `UUID`.
2.  **Answer Key Binding:** The uploaded answer key is mapped directly to these UUIDs, not to display numbers.

**Internal Database State (Master):**
| Internal `question_id` | Original Seq | Correct Answer |
| :--- | :--- | :--- |
| `uuid-8a92` | 1 | A |
| `uuid-4b3f` | 2 | C |
| `uuid-7c1e` | 3 | B |

---

### 2.2. Phase 2: Shuffling & Attempt Tracking (Student State)
When a student starts the test, the backend generates a randomized mapping for that specific `attempt_id`.

1.  **Fetching & Shuffling:** The backend fetches all `question_id`s for the test and shuffles the array.
2.  **Display Mapping:** This shuffled array is sent to the frontend. The frontend simply maps index `0` to `Q1`, index `1` to `Q2`, etc., strictly for visual rendering.

**Student A's Screen:**
*   **Question 1** -> renders image for `uuid-7c1e`
*   **Question 2** -> renders image for `uuid-8a92`
*   **Question 3** -> renders image for `uuid-4b3f`

---

### 2.3. Phase 3: Submission Payload (Frontend Contract)
The frontend must be entirely "dumb" regarding scoring logic. When the student clicks "Submit" (or during the 30-second autosave pings), the frontend sends an array of answers. 

**Critical Rule:** The payload must map the student's chosen option to the internal `question_id`, ignoring the display number completely.

**Example `POST /attempts/:id/submit` Payload:**
```json
{
  "attempt_id": "attempt-12345",
  "answers": [
    { "question_id": "uuid-7c1e", "selected_option": "B", "time_taken_sec": 45 },
    { "question_id": "uuid-8a92", "selected_option": "A", "time_taken_sec": 30 },
    { "question_id": "uuid-4b3f", "selected_option": "D", "time_taken_sec": 120 }
  ]
}
```

---

### 2.4. Phase 4: Evaluation & Scoring (Backend)
When the BullMQ worker pulls the submission job from the queue, scoring is a simple map lookup with O(1) complexity per question.

1.  The worker loads the Master Answer Key into memory (a hash map keyed by `question_id`).
2.  It iterates over the student's submitted `answers` array.
3.  It compares `submitted_answer.selected_option` against `MasterKey[submitted_answer.question_id]`.

**Evaluation Trace:**
*   Looks up `uuid-7c1e`. Master says `B`. Student answered `B`. **Result: Correct (+4)**
*   Looks up `uuid-8a92`. Master says `A`. Student answered `A`. **Result: Correct (+4)**
*   Looks up `uuid-4b3f`. Master says `C`. Student answered `D`. **Result: Incorrect (-1)**

---

## 3. Benefits of this Architecture

1.  **Infinite Variations:** You can generate 100,000 unique test sequences for 100,000 students without changing a single line of the scoring engine.
2.  **Fault Tolerance:** If the frontend loses track of sequence numbers due to a crash or refresh, it doesn't matter. As long as it pairs the UUID with the selected option, the data is perfectly safe.
3.  **Simpler Analysis:** The Analysis Engine (which calculates Batch Averages and Weak Topics) automatically aggregates data based on `question_id`, completely bypassing the complexity of figuring out which sequence individual students saw.
4.  **Zero Institute Overhead:** The institute only provides the Master Key once. They do not need to know about or manage the randomized variations.
