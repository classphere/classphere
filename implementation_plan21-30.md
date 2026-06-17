# ExamPrep Platform — 10-Day Development Sprint Plan

Based on a comprehensive review of the codebase and documentation (`ARCHITECTURE.md`, `SYSTEM_DESIGN.md`, `IDEA.md`, and `ANALYSIS_ENGINE_BLUEPRINT.md`), here is the current state of the application and a detailed 10-day execution plan for your development team.

## Current State Analysis

### ✅ What is Implemented
*   **Frontend UI & Layouts (Next.js):** The core dashboard structure, navigation, and UI components are built. Pages exist for students, teachers, institutes, superadmins, leaderboards, profiles, and tests.
*   **Mock Data Integration:** The frontend currently visualizes data beautifully using `recharts` and static mock files (`mockUser`, `mockStats`, etc.).
*   **Backend Scaffolding (Node.js/Express):** The API directory structure is fully set up. Routes, middleware, and controllers are defined for all major domains (auth, tests, questions, attempts, analysis, rankings, institutes).
*   **Documentation:** Extremely detailed system architecture, scaling plans, and the v2 analysis engine blueprint are clearly defined.

### ❌ What is NOT Implemented (The Delta)
*   **Real Authentication:** Supabase Auth is not integrated; auth controllers are stubbed.
*   **Database & CRUD:** No actual PostgreSQL connection or schema migrations have been applied. Controllers contain `TODO: implement` stubs.
*   **Data Flows (RBAC):** The hierarchical flow (Super Admin → Institute → Teacher → Student) is not enforced via code or database policies.
*   **Test Engine:** Question delivery, Redis caching, and answer autosaving are not built.
*   **Analysis Engine v2:** The 9-stage deterministic rule engine and BullMQ background workers do not exist in code yet.
*   **Frontend Integration:** React Query hooks to fetch live data from the API are missing.

---

## 10-Day Development Plan

### Day 1: Database & Authentication Foundation
**Goal:** Establish the data layer and secure user access.
*   **DB:** Run SQL migrations in Supabase to create core tables (`users`, `institutes`, `batches`, `questions`, `attempts`, `attempt_answers`).
*   **DB:** Implement Row Level Security (RLS) policies in Supabase for defense-in-depth.
*   **Auth:** Implement the `POST /api/v1/auth/signup` and login flows using the Supabase JS SDK.
*   **Backend:** Set up JWT validation middleware to protect all private API routes.

### Day 2: Role-Based Access & Data Flows
**Goal:** Complete the core B2B / B2C user hierarchy and workflows.
*   **Super Admin:** Implement institute creation and admin assignment endpoints.
*   **Institute Admin:** Implement batch creation, teacher assignment, and invite code generation endpoints.
*   **Teacher:** Implement endpoints to view assigned batches and students.
*   **Student:** Implement the `POST /api/v1/auth/join-batch` endpoint using invite codes.
*   **Frontend:** Connect the login/signup and invite-redemption UI to the real endpoints.

### Day 3: Question Bank & Test Management
**Goal:** Enable test creation via the DTP (Desktop Publishing) workflow.
*   **Backend:** Implement CRUD endpoints for `questions` (with LaTeX support and `distractor_map` schemas).
*   **Backend:** Implement test creation endpoints for Institute Admins/Teachers.
*   **Integration:** Connect GCP Cloud Storage for question image uploads (Smart Cropping AI integration can be mocked or deferred to post-launch if time is tight, relying on manual CSV/image uploads initially).
*   **Frontend:** Connect the Institute/Teacher "Create Test" dashboards to the API.

### Day 4: Test Engine Core (High-Concurrency Setup)
**Goal:** Build the system that serves tests to 100k concurrent users.
*   **Backend:** Implement `GET /api/tests/:id`. Integrate **Upstash Redis** to cache test questions (bypass DB).
*   **Backend:** Implement the autosave endpoint (`PATCH /attempts/:id`). Write logic to save answers to Redis hashes quickly, with a background worker flushing to PostgreSQL every few seconds.
*   **Frontend:** Hook up the active test UI. Implement the 30-second debounced autosave and local state recovery.

### Day 5: Test Submission & Scoring
**Goal:** Handle the burst of test submissions safely.
*   **Backend:** Implement `POST /attempts/:id/submit`. 
*   **Logic:** Flush final answers from Redis to DB, update attempt status.
*   **Backend:** Implement the **Stage 1 Scoring Service** (+4/-1 logic).
*   **Infra:** Set up BullMQ and enqueue the attempt ID into an `analysis:wait` queue upon submission instead of processing synchronously.

### Day 6: Analysis Engine v2 (Deterministic Logic)
**Goal:** Build the core differentiator (Stages 2-6 of the blueprint).
*   **Backend:** Implement the Mistake Classifier (distractor map + heuristic fallback).
*   **Backend:** Implement Topic Accuracy and the new Free Marks Calculator.
*   **Backend:** Implement Error Pattern Detection (8 detectors including subject avoidance and distractor trap victim).
*   **Backend:** Implement Skip Analysis logic.

### Day 7: Analysis Engine v2 (Actionable Outputs & AI)
**Goal:** Finish the analysis pipeline (Stages 7-9) and background processing.
*   **Backend:** Implement Study Plan Generation and Booster Test Configuration based on weak topics.
*   **Backend:** Implement Batch Analysis aggregations for teachers.
*   **Workers:** Finalize the BullMQ worker process that consumes the queue, runs all 9 stages, and saves the final JSON report to the DB.
*   **AI Optional:** Integrate Gemini API wrapper for unstructured text/insights if the deterministic engine needs fallback descriptions.

### Day 8: Ranking System & Leaderboards
**Goal:** Build the nightly batch jobs for gamification.
*   **Backend:** Write the SQL window functions to calculate `rank_score`, `rank_position`, and `percentile`.
*   **Infra:** Set up GCP Cloud Scheduler to hit the internal rankings endpoint at midnight.
*   **Backend:** Implement endpoints to fetch leaderboards and serve them strictly from Redis caching.
*   **Backend:** Implement the streak tracking logic.

### Day 9: Frontend Data Binding & Polish
**Goal:** Strip out all mock data and ensure the UI is fully dynamic.
*   **Frontend:** Replace `mockUser`, `mockStats`, etc., with React Query hooks fetching from the real backend.
*   **Frontend:** Implement polling on the Results page (polling `/api/analysis/:id` until the BullMQ worker finishes).
*   **Frontend:** Ensure charts (Recharts) render correctly with dynamic data structures.
*   **Frontend:** Hook up the Booster Test prompt UI to auto-start the generated config.

### Day 10: E2E Testing, Security, & Deployment
**Goal:** Production readiness.
*   **Testing:** Simulate a Mega-Test load (using a script to fire thousands of autosaves/submits) to verify Redis and BullMQ hold up.
*   **Security:** Audit Supabase RLS policies and ensure JWT verification is flawless across all routes.
*   **Deployment:** Finalize Dockerfiles, deploy the API to GCP Cloud Run, workers to dedicated instances, and the Next.js app to Vercel.

## Open Questions for Review
1.  **Smart Cropping AI:** For the 10-day sprint, should the team focus on manual question uploads first and defer the PDF Smart Cropping AI script to a later update to ensure the core test engine is stable?
2.  **Notification System:** Do you want to include WhatsApp/Email notifications (e.g., sending rank cards to parents) in this 10-day sprint, or push that to Week 3 post-launch?
