# Batch Analysis Architecture

The batch analysis engine aggregates individual student insights to the **Teacher Level**, showing teachers exactly where their entire batch is struggling, and providing them with a UI to enhance the engine's intelligence.

## Features
1. **Batch Analysis Service** (Stage 9 of the pipeline).
2. **Teacher Analytics Dashboard** to display live aggregate data.
3. **Distractor Mapping UI** for teachers to feed rules back into the engine.

## Proposed Changes

### 1. Backend: Batch Analysis Aggregator
We have built the service that aggregates hundreds of student `AnalysisResult` objects into a single cohesive class report.

#### [NEW] [apps/api/src/modules/analysis-engine/services/batch-analysis.ts](file:///home/harshsinghsv/Projects/test-jee-neet/apps/api/src/modules/analysis-engine/services/batch-analysis.ts)
- Implement `generateBatchAnalysis(testId, batchId)`
- Aggregates average topic accuracy across the class.
- Identifies the Top 3 "Bottleneck Topics" affecting the entire batch.
- Identifies the Top 3 "Trap Questions" where >50% of the class chose the *same* wrong option.

#### [MODIFY] [apps/api/src/modules/analysis-engine/analysis.controller.ts](file:///home/harshsinghsv/Projects/test-jee-neet/apps/api/src/modules/analysis-engine/analysis.controller.ts)
- Implement `getBatchAnalysis` to return the aggregated report from the in-memory mock store.

### 2. Frontend: Teacher Analytics Dashboard
We updated the teacher portal to consume this batch-level data.

#### [MODIFY] [apps/web/src/app/teacher/analytics/page.tsx](file:///home/harshsinghsv/Projects/test-jee-neet/apps/web/src/app/teacher/analytics/page.tsx)
- Replace static mock data with a `fetch` to `/api/v1/analysis/batch/...`.
- Render the Class Topic Heatmap.
- Render the "Actionable Insights" (e.g., "Review Thermodynamics with the class, 70% failed it").

### 3. Frontend: Distractor Mapping UI (The Intelligence Loop)
This is how the engine gets smarter without AI. Teachers will use this UI to explain *why* options are wrong.

#### [NEW] [apps/web/src/app/teacher/tasks/[taskId]/distractors/page.tsx](file:///home/harshsinghsv/Projects/test-jee-neet/apps/web/src/app/teacher/tasks/[taskId]/distractors/page.tsx)
- Create a UI where a teacher can view a test question.
- For every incorrect option (A, B, C, D), provide a dropdown to map it to an `ErrorType` (Conceptual, Calculation, Formula, Sill, etc.).
- Saving this will persist the `distractor_map` to the database, which our Phase 1 `MistakeClassifier` service will then use to tag future student mistakes with 100% deterministic accuracy.

> [!NOTE]  
> Like Phase 1, we will continue using the in-memory `globalDbStore` to simulate DB queries so we can test the entire flow instantly.


