# Question Difficulty Classification System
### System Design & Architecture Documentation
**For: Engineering, ML, and Content Teams**
**Status: v1.0 — Founding Design Doc**

---

## 1. Purpose of This Document

This document describes the full system we are building to automatically classify exam questions (JEE/NEET, and any future exam) into **Easy / Medium / Hard**, why each design decision was made, and how the system evolves over time as we collect real student data.

Anyone joining the team should be able to read this and understand:
- What we're building and why
- How each component works
- Why we chose this approach over alternatives
- What their part of the system needs to do
- How the system gets *better* over time, not just bigger

---

## 2. Problem Statement

Coaching institutes, books, and mock test providers each label question difficulty inconsistently — there is no shared, objective standard. Labels are usually:
- Assigned by a single author's intuition
- Inconsistent across institutes and even across chapters of the same book
- Static — never updated based on how students actually perform

**Our goal:** build a system that assigns a *consistent, defensible, data-grounded* difficulty label to any question, and that **improves automatically** as more students attempt it.

### 2.1 Why this is hard
Difficulty is not one thing. Three different signals get conflated in casual usage:

| Signal | Definition | Example |
|---|---|---|
| **Cognitive difficulty** | How many concepts/steps the question intrinsically requires | A 3-concept rotational mechanics problem |
| **Empirical difficulty** | What % of real students get it right (ground truth) | Only 22% of test-takers answered correctly |
| **Perceived difficulty** | How hard it *felt* to students, independent of whether they got it right | "Physics felt hard" even when accuracy was decent, due to time pressure |

A question can score differently on each axis (e.g., conceptually simple but long calculation → low perceived/empirical difficulty score despite "easy" concepts). Our system must reconcile these, not pick one and ignore the others.

### 2.2 Why we're sequencing it the way we are
We currently have **zero student response data**. Waiting for data before building anything means months of no product. So we bootstrap with LLM-based feature extraction now, and replace/calibrate it with real empirical data (via Item Response Theory) once we have test-takers. This is the single most important architectural decision in this document — everything below is designed around this two-phase reality.

---

## 3. System Overview (High Level)

```
                     ┌─────────────────────────┐
                     │   Question Bank (raw)   │
                     │  text, options, source  │
                     └────────────┬─────────────┘
                                  │
                     ┌────────────▼─────────────┐
                     │  Phase 1: LLM Feature     │
                     │  Extraction Pipeline      │
                     │  (structured JSON output) │
                     └────────────┬─────────────┘
                                  │
                     ┌────────────▼─────────────┐
                     │  Rule Engine /            │
                     │  Lightweight Classifier   │
                     │  → v1 difficulty label    │
                     └────────────┬─────────────┘
                                  │
                      [questions go live, students attempt them]
                                  │
                     ┌────────────▼─────────────┐
                     │  Response Logging Layer   │
                     │  (correct/incorrect, time) │
                     └────────────┬─────────────┘
                                  │
                     ┌────────────▼─────────────┐
                     │  Phase 2: IRT Calibration  │
                     │  + ML Difficulty Model     │
                     │  → v2 difficulty label     │
                     │  (overrides v1 once stable)│
                     └────────────┬─────────────┘
                                  │
                     ┌────────────▼─────────────┐
                     │  Difficulty Label Store    │
                     │  (versioned, auditable)    │
                     └────────────────────────────┘
```

**Why this shape:** the LLM feature-extraction step and the ML model in Phase 2 are designed to consume the *same feature schema*. This is intentional — it means Phase 1 isn't throwaway work; it becomes the feature engineering layer for Phase 2. We are not building two systems, we are building one system with two label sources feeding the same store.

---

## 4. Phase 1 — LLM-Based Feature Extraction

### 4.1 Why we don't ask the LLM for "easy/medium/hard" directly

This is a critical decision. If we prompt "is this easy, medium, or hard?" we get:
- Inconsistent answers across runs (LLM judgment of subjective labels has high variance)
- No way to audit *why* it decided that
- A black box that breaks the moment we want to retune what counts as "medium"
- No reusable signal for the future ML model — a single label is a dead end

**Decision:** the LLM extracts **structured, low-level features**. A deterministic rule engine (which we control, version, and can tune without re-running the LLM) converts those features into the actual label. This separates "understanding the question" (LLM's job) from "deciding the threshold" (our job, adjustable any time).

### 4.2 Feature Extraction Schema

This is the contract between the LLM and the rest of the system. Every question gets converted into this JSON object.

```json
{
  "question_id": "string",
  "subject": "Physics | Chemistry | Biology | Maths",
  "chapter": "string",
  "topic": "string",

  "concepts_required": [
    {
      "concept": "string — name of the concept/formula",
      "is_core_syllabus": true
    }
  ],
  "concept_count": "integer — len(concepts_required)",

  "solution_step_count": "integer — number of distinct logical/calculation steps a well-prepared student would take",

  "step_breakdown": [
    "string — one short phrase per step, e.g. 'apply conservation of momentum', 'substitute values', 'solve quadratic'"
  ],

  "source_type": "ncert_direct | pyq_modified | novel",

  "novelty_justification": "string — why this is/isn't a seen pattern",

  "negative_or_tricky_framing": {
    "present": true,
    "type": "NOT/EXCEPT | assertion_reason | multi_statement | none",
    "explanation": "string"
  },

  "numeric_complexity": {
    "num_calculation_steps": "integer",
    "involves_unit_conversion": true,
    "involves_multi_step_algebra": false,
    "calculation_tedium_score": "1-5 integer, 5 = very long/messy numbers"
  },

  "estimated_solve_time_seconds": {
    "well_prepared_student": "integer",
    "average_student": "integer"
  },

  "cross_topic": {
    "is_cross_topic": false,
    "topics_combined": []
  },

  "llm_confidence": "1-5 integer — how confident the model is in this extraction",

  "raw_reasoning": "string — brief explanation, used for audit/QA, NOT shown to end users"
}
```

### 4.3 Field-by-field rationale

| Field | Why it exists |
|---|---|
| `concept_count` | Direct proxy for "formula-based vs multi-formula vs multi-concept" — your own original framing |
| `solution_step_count` + `step_breakdown` | Step count is a better difficulty predictor than concept count alone; breakdown lets humans audit LLM reasoning instead of trusting a number blindly |
| `source_type` | NCERT-direct questions are empirically easier across the board (confirmed by NEET paper analyses); this field lets the rule engine apply a strong, well-evidenced prior |
| `negative_or_tricky_framing` | Assertion-reason / NOT-EXCEPT questions are a well-documented difficulty multiplier independent of concept count — must be captured separately or it gets lost inside "step count" |
| `numeric_complexity` | Captures *tedium*, which is distinct from conceptual difficulty (this is the Physics problem: simple concept, long messy calculation, still feels/performs hard) |
| `estimated_solve_time_seconds` | Time is the single most reliable proxy for real-world difficulty until we have actual response-time data; having both "well-prepared" and "average" student estimates lets us separate intrinsic difficulty from prep-gap difficulty |
| `cross_topic` | Cross-topic questions are harder to retrieve the right method for, even if each individual concept is simple |
| `llm_confidence` | Lets us route low-confidence extractions to human review instead of silently trusting bad outputs |
| `raw_reasoning` | Auditability — when content team disagrees with a label, we can see *why* the model said what it said, instead of debugging a black box |

### 4.4 Prompting approach
- One question per call (no batching multiple questions in one prompt — cross-contamination of reasoning is a real risk and batching saves tokens at the cost of label quality, which is the wrong trade here).
- Use a **fixed, version-locked system prompt**. Any change to this prompt is a new pipeline version — old extractions are not silently mixed with new ones.
- Force JSON-only output (no preamble) and validate against the schema programmatically before storing. Reject and retry on schema mismatch.
- Few-shot examples in the prompt: include 2–3 worked examples per subject (one Easy, one Medium, one Hard from known PYQs) so the model is anchored to your taxonomy, not its own internal notion of difficulty.

### 4.5 QA loop for Phase 1 (do this before trusting it at scale)
1. Run extraction on ~300–500 PYQs that already have **published accuracy %** (from NTA reports / coaching analyses).
2. Convert extracted features → v1 label via the rule engine.
3. Compare v1 labels against actual historical accuracy bands (e.g., >70% correct → was empirically easy).
4. Measure agreement. Where systematically wrong (e.g., Physics over-flagged as "hard" due to tedium being conflated with concept difficulty), adjust the rule engine's weighting — not the LLM prompt, unless the LLM's raw feature extraction itself was wrong.
5. Re-run until agreement is acceptable (target: directional agreement on ≥80% of labels, exact 3-class match on ≥65% — these are reasonable starting bars given the inherent fuzziness of human-labeled difficulty too).

---

## 5. The Rule Engine (v1 Label Assignment)

This is intentionally simple, transparent, and yours to own and tune — not ML, on purpose. We don't want a black box deciding thresholds before we have any ground truth to train against.

**Baseline rule (illustrative — actual weights need tuning in QA loop above):**

```
score = (concept_count * 1.0)
      + (solution_step_count * 1.2)
      + (numeric_complexity.calculation_tedium_score * 0.8)
      + (3 if negative_or_tricky_framing.present else 0)
      + (2 if source_type == "novel" else (1 if source_type == "pyq_modified" else 0))
      + (1.5 if cross_topic.is_cross_topic else 0)

if score <= EASY_THRESHOLD: label = "Easy"
elif score <= MEDIUM_THRESHOLD: label = "Medium"
else: label = "Hard"
```

Thresholds are set per-subject (Physics' thresholds ≠ Biology's, because tedium and time pressure hit subjects differently — confirmed repeatedly in NEET/JEE paper analyses where Physics is rated hardest largely due to time/calculation load, not raw concept depth).

**Why a weighted score and not a decision tree or lookup table:** it's easy to explain to non-technical stakeholders (content reviewers, teachers you hire), easy to tune by adjusting one number, and easy to later replace with a learned model without changing the upstream feature schema.

---

## 6. Phase 2 — Empirical Calibration (Once You Have Student Data)

### 6.1 Why Item Response Theory (IRT), not just "% correct"
Raw accuracy is a poor difficulty measure because it conflates question difficulty with *who happened to attempt it*. A question attempted mostly by weak students will show low accuracy even if it's objectively easy, and vice versa.

IRT instead estimates:
- A **difficulty parameter (b)** per question
- An **ability parameter (θ)** per student
- It iteratively solves for both — a strong student missing a question moves that question's difficulty up more than a weak student missing it.

**Decision:** start with the 1-parameter (Rasch) model — simpler, fewer data requirements, easier to explain to the team — and move to a 2-parameter model (adds a "discrimination" parameter — how well the question separates strong from weak students) once you have enough volume (rough guideline: 200+ responses per question for stable 2PL estimates; Rasch can work with less).

### 6.2 Minimum data thresholds before trusting empirical labels
| Responses per question | What we trust |
|---|---|
| 0–29 | LLM/rule-engine label only (v1) |
| 30–99 | Blend: weighted average of v1 label and raw accuracy-based estimate |
| 100+ | Full IRT-derived difficulty becomes primary (v2), v1 becomes a fallback for new/unattempted questions only |

These thresholds are starting points — recalibrate once you see your actual response volume and variance.

### 6.3 The ML Model (bridges Phase 1 features → Phase 2 ground truth)
Once IRT-derived difficulty exists for a meaningful chunk of your question bank, train a supervised model:

- **Input features:** the exact same JSON schema from Section 4.2 (concept_count, step_count, tedium, source_type, etc.) plus a topic-level historical-difficulty prior.
- **Target:** IRT difficulty parameter (continuous) or empirical 3-class label.
- **Model choice:** gradient-boosted trees (LightGBM/XGBoost) — handles mixed feature types well, doesn't need huge data, and is interpretable via feature importance (you can show a content reviewer *why* a question was flagged hard).
- **Why not deep learning / fine-tuned LLM at this stage:** you won't have enough labeled data (thousands, not millions) for a deep model to outperform a tree-based model, and interpretability matters for trust with your content team.

This model lets you assign a *good* difficulty estimate to brand-new questions immediately (no need to wait for 30+ responses) by predicting what the IRT difficulty is *likely to be*, based on questions that look similar and already have empirical labels. This is the real payoff of keeping Phase 1 and Phase 2 on the same feature schema.

### 6.4 Feedback loop / re-calibration cadence
- Re-run IRT calibration on a rolling basis (e.g., weekly, or after every N new responses) — difficulty estimates stabilize and shift slightly as more data arrives.
- Re-train the ML model on a slower cadence (e.g., monthly) once you have enough newly-calibrated IRT labels to justify a retrain.
- Track **label drift**: if a question's label flips between v1 and v2, log it — these are valuable QA cases to review manually, and over time they tell you where your LLM/rule engine systematically over- or under-estimates difficulty.

---

## 7. Data Architecture

### 7.1 Core tables (conceptual, not final schema)

**`questions`**
- question_id, text, options, correct_answer, subject, chapter, topic, source_type, created_at

**`question_features`** (output of Phase 1, versioned)
- question_id, pipeline_version, concept_count, step_count, numeric_complexity, source_type, negative_framing, est_time, llm_confidence, raw_json, extracted_at

**`question_difficulty_labels`** (versioned, auditable — this is the most important table)
- question_id, label_version (v1_llm / v2_irt_blend / v3_ml), label (easy/medium/hard), numeric_score, confidence, assigned_at

**`student_responses`**
- response_id, student_id, question_id, is_correct, time_taken_seconds, attempt_timestamp, test_id

**`irt_parameters`**
- question_id, difficulty_b, discrimination_a (once 2PL), last_calibrated_at, n_responses_used

### 7.2 Why labels are versioned, not overwritten
Never silently overwrite a difficulty label. Keep history. This matters because:
- You'll want to audit "why did this question's label change"
- You may want to compare v1 (LLM) vs v2 (empirical) performance over time as a way of continuously validating whether your LLM pipeline is trustworthy
- If something breaks downstream (e.g., a test paper gets miscalibrated), you need to know exactly which label version was live at that time

---

## 8. Team & Roles (Who Owns What)

| Role | Owns |
|---|---|
| **ML/Data Engineer** | IRT calibration pipeline, ML difficulty model, response data pipeline |
| **Backend Engineer** | Question bank schema, response logging, label store, versioning |
| **LLM/Prompt Engineer** | Feature extraction schema, prompt versioning, QA loop against PYQ accuracy data |
| **Content Reviewer (subject expert)** | Validates LLM feature extraction quality per subject, especially `raw_reasoning` and edge cases (assertion-reason, cross-topic), tunes per-subject thresholds in rule engine |
| **Product/Founder (you)** | Defines what difficulty *means* for the product (e.g., do test-takers see "Hard" as discouraging? Does difficulty feed into adaptive test generation?), sets the rollout sequencing |

---

## 9. Key Architectural Decisions — Summary Table

| Decision | Alternative considered | Why we chose this |
|---|---|---|
| LLM extracts features, not labels | LLM directly outputs easy/medium/hard | Labels are unauditable and untunable; features are reusable for the future ML model |
| Same feature schema across Phase 1 and Phase 2 | Separate systems for bootstrap vs. production | Avoids throwaway work; Phase 1 becomes feature engineering for Phase 2 |
| Rule engine (not ML) for v1 label | Train a model immediately on hand-labeled data | No ground truth exists yet to train against; rule engine is transparent and tunable by non-ML team members |
| IRT over raw accuracy % | Just use % correct per question | Raw accuracy conflates question difficulty with who attempted it; IRT separates the two |
| Gradient-boosted trees over deep learning for Phase 2 | Fine-tune a neural model | Data volume won't justify it early on; trees are interpretable, which matters for content team trust |
| Versioned labels, never overwritten | Single mutable difficulty field per question | Need auditability and the ability to compare label sources over time |
| Per-subject thresholds, not global | One global easy/medium/hard cutoff | Subjects differ systematically in what drives difficulty (e.g. Physics: tedium; Biology: recall volume) — confirmed by repeated paper analyses |

---

## 10. Rollout Plan

**Phase 0 (Week 1–2):** Lock the feature extraction schema (Section 4.2) and prompt. Build the validation/retry pipeline.

**Phase 1 (Week 2–4):** Run extraction on PYQs with known accuracy data. Calibrate rule-engine thresholds (Section 4.5 QA loop). Run extraction on full current question bank.

**Phase 2 (ongoing once live):** Build response logging. Once sufficient response volume exists (Section 6.2), stand up the IRT calibration job and the ML model. Begin blending/overriding v1 labels.

**Phase 3 (steady state):** Weekly IRT recalibration, monthly ML retrain, ongoing QA sampling comparing v1 vs v2 to catch systematic LLM/rule-engine bias and correct it.

---

## 11. Open Questions to Resolve Before Building (Founder-Level Decisions)

These aren't engineering decisions — they're product decisions only you can make, and they affect schema design downstream, so resolve them early:

1. Will difficulty labels be shown to students directly, or only used internally (e.g., for adaptive test generation, analytics, or institute-facing reports)?
2. Do you want a numeric difficulty score (e.g., 1–10) in addition to the 3-class label, for finer-grained use cases like adaptive testing?
3. Should difficulty be exam-specific (a question might be "easy" relative to NEET's pool but "medium" relative to JEE Advanced's pool)? If so, IRT calibration needs to run per exam-context, not globally.
4. What's your tolerance for early-stage label instability? (Early questions will have v1-only labels that may shift once real data arrives — do users need to be told a label is "provisional"?)
