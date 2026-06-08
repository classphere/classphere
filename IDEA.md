# ExamPrep Platform — Full Technical & Product Documentation

**Version:** 1.0 (Draft for internal team)
**Status:** Pre-development — for review and alignment
**Scope:** JEE (Phase 1) → NEET, SSC, UPSC (Phase 2+)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Feature Specifications](#4-feature-specifications)
   - 4.1 Question Bank
   - 4.2 Test Creation
   - 4.3 Test Taking UI
   - 4.4 AI Analysis Report
   - 4.5 Ranking System
   - 4.6 Institute & Batch Management
   - **4.7 Booster Test (Improvement Test)**
5. [System Architecture](#5-system-architecture)
6. [Tech Stack](#6-tech-stack)
7. [Monorepo Folder Structure](#7-monorepo-folder-structure)
8. [Database Schema](#8-database-schema)
9. [API Design](#9-api-design)
10. [AI Integration Strategy](#10-ai-integration-strategy)
11. [Ranking System](#11-ranking-system)
12. [Scalability Plan](#12-scalability-plan)
13. [Infrastructure & DevOps](#13-infrastructure--devops)
14. [Security](#14-security)
15. [Pricing & Business Model](#15-pricing--business-model)
16. [Development Roadmap](#16-development-roadmap)

---

## 1. Executive Summary

ExamPrep is an AI-powered test preparation platform targeting students appearing for competitive exams in India — starting with JEE and expanding to NEET, SSC, and UPSC. The platform allows students to take customized tests from a curated question bank, receive detailed AI-powered performance analysis, and track their progress against peers through a live ranking system.

The core differentiator is the AI feedback layer. Unlike existing platforms that show a score and stop, ExamPrep tells students exactly what they got wrong, why they got it wrong, what concept they are missing, and how to fix it in the next seven days. For coaching institutes, it provides batch-level AI analysis that tells teachers which chapters need re-teaching.

**Target revenue:** ₹80L/year by month 18–24, achieved through a hybrid of student subscriptions and institute partnerships.

---

## 2. Product Vision & Goals

### Vision

To be the most useful exam prep tool for Indian students — not the biggest, not the flashiest, but the one that actually improves scores.

### Phase 1 — JEE (Months 1–4)

- Working test platform with JEE question bank
- Custom test creation (chapter-wise, full subject, mixed)
- AI analysis per student after each test
- Booster test — auto-generated improvement test on weak topics after every attempt
- Basic ranking within platform

### Phase 2 — Institute Features (Months 4–7)

- Institute onboarding with batch management
- Teacher dashboard and institute-created tests
- Batch-level AI analysis for teachers
- Invite system and batch leaderboards

### Phase 3 — Scale (Months 7–12)

- NEET support (question bank + marking scheme)
- SSC support
- Streak system and shareable rank cards
- Email/push notifications
- PDF report generation

### Phase 4 — Growth (Months 12–24)

- UPSC support (objective sections)
- Mobile app (React Native, reusing existing components)
- Advanced analytics dashboard
- Institute billing and invoicing automation

---

## 3. User Roles & Permissions

There are four distinct roles in the system. Role is stored in the JWT token issued by Supabase Auth and validated on every API request.

### 3.1 Student

The primary user of the platform.

**Can do:**
- Sign up independently or via institute invite link
- Create and attempt self-customized tests
- Attempt institute-assigned tests (within scheduled window)
- View own AI analysis reports
- View own rank (batch, institute, global)
- View leaderboard (batch and global)
- Track streak and test history

**Cannot do:**
- See other students' detailed answers
- Access any institute management features
- Create tests for others

### 3.2 Teacher

Assigned to a batch by an institute admin.

**Can do:**
- Everything a student can do (for their own practice)
- Create institute tests and assign to their batch
- View all students in their assigned batch
- View batch-level AI analysis (aggregate performance)
- Export batch performance reports as PDF
- View per-student score (not individual answers)

**Cannot do:**
- Manage other batches they are not assigned to
- Add or remove students
- Manage billing or institute settings

### 3.3 Institute Admin

One per institute. Created when an institute is onboarded.

**Can do:**
- Create and manage all batches in their institute
- Add or remove teachers from batches
- Add or remove students from batches
- Generate institute-wide invite codes
- View all batch performance data
- Access billing and subscription management
- Export full institute reports

**Cannot do:**
- Access other institutes' data
- Modify the global question bank

### 3.4 Super Admin

The platform operator (you and your team).

**Can do:**
- Everything
- Manage all institutes on the platform
- Full CRUD on the question bank
- View platform-wide analytics
- Set feature flags per institute (enable/disable features)
- Manage subscriptions and billing overrides
- Access system health dashboard

---

## 4. Feature Specifications

### 4.1 Question Bank

The question bank is the foundation. Every question must be tagged correctly for the system to work.

**Question fields:**

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| exam_id | FK | JEE, NEET, SSC, UPSC |
| subject | string | Physics, Chemistry, Maths, Biology, etc. |
| chapter | string | Laws of Motion, Organic Chemistry, etc. |
| topic | string | Newton's Second Law, Aldehydes, etc. |
| difficulty | enum | easy, medium, hard |
| type | enum | mcq_single, mcq_multi, integer, subjective |
| question_text | text | Supports LaTeX for equations |
| options | JSONB | Array of option objects |
| correct_answer | string/array | Single or multiple correct options |
| explanation | text | Detailed solution |
| image_url | string | Optional — for diagram-based questions |
| source | string | Past year paper reference (e.g. JEE 2019 Paper 2 Q14) |
| year | integer | Year of the paper if past year |
| tags | array | Additional free-form tags |
| created_at | timestamp | |
| updated_at | timestamp | |

**Question types:**
- `mcq_single` — one correct option (standard JEE/NEET)
- `mcq_multi` — multiple correct options (JEE Advanced)
- `integer` — numeric answer (JEE integer type)
- `subjective` — long answer (UPSC, future phase)

### 4.2 Test Creation

Students and teachers can create tests with these configuration options:

**Configuration options:**
- Exam (JEE / NEET / SSC / UPSC)
- Type: chapter test / subject test / full test / past year paper
- Subject(s): one or multiple
- Chapter(s): one or multiple within the selected subject
- Number of questions: custom input
- Difficulty mix: easy/medium/hard (slider or preset)
- Time limit: custom minutes or use standard exam time
- Marking scheme: auto-set per exam, can override for practice

**Exam Format Presets:**
- **JEE Main:** 75 Questions / 180 Minutes (2.4 minutes per question). Subjects: Physics (25), Chemistry (25), Maths (25). Marking: +4/-1. Includes both MCQs and Numerical Value questions.
- **NEET-UG:** 180 Questions / 180 Minutes (1 minute per question). Subjects: Physics (45), Chemistry (45), Botany (45), Zoology (45). Marking: +4/-1. Strictly MCQs.

**Test modes:**
- Practice mode — no timer, can see hints, unlimited attempts
- Exam mode — timed, no hints, single attempt per test session

**Institute test (teacher-created):**
- Same configuration options
- Additionally: assigned to one or more batches
- Scheduled window: start datetime + end datetime (students can only attempt within this window)
- Can be published or kept in draft

### 4.3 Test Taking UI

**During the test:**
- Question displayed with full LaTeX rendering
- MCQ options as radio buttons (single) or checkboxes (multi)
- Integer input field for numeric answers
- Navigation panel showing all question numbers with status indicators (answered / unanswered / marked for review)
- Timer displaying remaining time
- Mark for review toggle per question
- Auto-save every 30 seconds to prevent data loss
- Warning at 5 minutes remaining
- Submit button with confirmation dialog

**On accidental disconnect:**
- Answers saved to server every 30 seconds
- Student can resume from where they left off within the time window

### 4.4 AI Analysis Report

Generated after every test submission. This is the core value proposition.

**Per-student report includes:**

1. **Score summary** — raw score, percentage, time taken, comparison to batch average
2. **Topic breakdown** — performance per chapter and topic with accuracy percentage
3. **Weak area identification** — AI-identified concepts where the student made systematic errors
4. **Error pattern analysis** — e.g. "You are consistently confusing Newton's 2nd and 3rd laws in problems involving pulleys"
5. **7-day study plan** — specific chapters and topics to focus on with suggested time allocation
6. **Next test recommendation** — based on weak areas, suggests the optimal next test to take
7. **Improvement trend** — compared to student's own past performance on the same topics

**Per-batch report (teacher view):**

1. **Class performance overview** — average score, score distribution histogram
2. **Chapter-level heatmap** — which chapters performed well and which poorly across the entire batch
3. **AI teaching recommendation** — "73% of your batch struggled with Thermodynamics Cycle problems. Recommend 2 additional classes on Carnot efficiency"
4. **Individual student attention flags** — students who are significantly underperforming or whose improvement has stalled
5. **Topper analysis** — what the top 10% of the batch did differently

### 4.5 Ranking System

Three levels of ranking, all precomputed nightly.

**Rank score formula:**
```
rank_score = (avg_score × 0.40) + (consistency_score × 0.25) + (improvement_score × 0.20) + (speed_score × 0.15)
```

- `avg_score` — weighted average across all tests (recent tests weighted higher)
- `consistency_score` — inverse of score variance (rewards consistent performance over lucky one-offs)
- `improvement_score` — slope of performance over last 10 tests
- `speed_score` — accuracy-per-minute ratio

**Rank levels:**
- Batch rank — within the student's enrolled batch
- Institute rank — across all batches in the institute
- Global rank — across all students on the platform for that exam

**Rank card (shareable):**
- Shows batch rank, institute rank, global rank, percentile, streak
- Downloadable as a PNG image
- Students will share on Instagram and WhatsApp — free organic marketing

**Streak system:**
- Streak increments by 1 for each calendar day a student completes at least one test
- Resets to 0 if a day is missed
- Displayed prominently on dashboard
- Longest streak also stored for all-time personal record

### 4.6 Institute & Batch Management

**Institute onboarding:**
- Super admin creates institute record and sets institute admin user
- Institute gets a unique subdomain (optional future feature) or institute code

**Batch management (institute admin):**
- Create batch with name, exam type, start and end dates
- Generate invite code or link for the batch
- Assign one or more teachers to a batch
- View all students enrolled
- Remove students or teachers

**Student enrollment:**
- Via invite link or invite code
- Student signs up (or logs in if existing) and is auto-enrolled in the batch
- One student can be in multiple batches (e.g. enrolled in JEE batch and a crash course batch)

**Free trial for institutes:**
- 30-day full access for institute and all their students
- No credit card required
- At the end of 30 days, institute admin prompted to subscribe
- Student access continues for 7 more days with a banner, then read-only

### 4.7 Booster Test (Improvement Test)

This is one of the most important features of the platform and a direct extension of the AI analysis. After every test, the system offers the student a curated follow-up test targeting only the topics and chapters they got wrong or skipped. The goal is to move a student from awareness of their weakness to actual mastery of it.

**Two modes of Improvement:**
1. **Micro Booster:** 15 to 30 questions. Designed for a quick revision session focused purely on weak areas (takes ~30-60 mins).
2. **Full Improvement Test:** Simulates real exam pressure using only weak topics. Scaled to 1, 2, or 3 hours (e.g., 25, 50, or 75 questions for JEE standard speed).

---

**How it is triggered**

The test is automatically generated the moment a student submits a test and the AI analysis is ready. On the result page, a prominent card appears:

```text
┌──────────────────────────────────────────────────┐
│  🎯 Improvement Options Ready                    │
│                                                  │
│  Based on your analysis, 3 topics need work:     │
│  • Newton's Laws (33% accuracy)                  │
│  • Work-Energy Theorem (25% accuracy)            │
│  • Thermodynamics — Carnot Cycle (0% accuracy)   │
│                                                  │
│  Choose your practice mode:                      │
│  [⚡ Micro Booster: 15-30 Qs]                      │
│  [⏱️ Full Improvement Test: 1-3 Hours]             │
│                                                  │
│  [Skip for now]                                  │
└──────────────────────────────────────────────────┘
```

---

**How the test is generated**

The system uses the AI analysis output and attempt data to build the configuration automatically. No student input is needed beyond selecting the mode.

**Step 1 — Identify weak topics**

Topics are marked as weak if any of the following is true:
- Accuracy below 50% on that topic in this test
- Topic was entirely skipped
- The AI analysis flagged it as a systematic error pattern

**Step 2 — Build question set**

```text
Rules for question selection:
1. Only questions from the identified weak topics
2. Never repeat questions from the original test
3. Start with slightly easier questions than what the student failed on
   — if they failed medium difficulty, start with easy then progress to medium
   — this builds confidence before reinforcing the concept
4. Sizing based on selected mode:
   - Micro Booster: Configurable between 15 and 30 questions.
   - Full Improvement Test: 
     * 1 Hour = 25 Qs (JEE) or 60 Qs (NEET)
     * 2 Hours = 50 Qs (JEE) or 120 Qs (NEET)
     * 3 Hours = 75 Qs (JEE) or 180 Qs (NEET)
5. Weighted toward the weakest topics
   — if 3 topics identified, weakest topic gets ~50% of questions
6. Exclude questions the student has seen in any previous booster on this topic
   (tracked via question_exposure table)
```

**Step 3 — Set test parameters**

- Duration: Calculated dynamically based on the target exam format (e.g., JEE is ~2.4 mins per question, NEET is ~1 min per question).
- Marking scheme: Same as parent exam (JEE, NEET, etc.)
- Mode: Always exam mode (timed, no hints) — same pressure as real test
- No custom configuration needed — the system does everything

---

**After the booster test — comparison report**

The post-booster AI analysis specifically compares performance against the original test on the same topics. It does not generate a generic analysis — it generates a delta report.

```
Booster Test Result — Comparison with Original

Topic                   Original    Booster    Change
Newton's Laws           33%         80%        +47% ✅ Improved
Work-Energy Theorem     25%         50%        +25% 🔄 Getting there
Carnot Cycle            0%          20%        +20% 🔄 Still weak

AI says: "Significant improvement in Newton's Laws — you clearly
understood the concept after reviewing it. Carnot Cycle is still
weak. Here is another booster focused only on Carnot Cycle."
```

If a topic is still below 70% accuracy after the booster, the system offers a second booster on that specific topic only. This creates a loop:

```
Original Test → Booster 1 (all weak topics) → Booster 2 (remaining weak topics) → Mastery
```

---

**Booster test chain tracking**

Each booster is linked to its parent test. This creates a chain that shows the student's journey from weakness to mastery on any given topic. Visible on the student's history page:

```
Chapter Test — Laws of Motion         Score: 45%   [view analysis]
  └── Booster 1 — 3 topics            Score: 68%   [view comparison]
        └── Booster 2 — Carnot Cycle  Score: 85%   ✅ Mastered
```

---

**Booster test configuration rules summary**

| Parameter | Value |
|---|---|
| Trigger | Automatic after AI analysis is ready |
| Question count | Micro Booster: 15-30. Full Improvement: 25/50/75 (JEE) |
| Source | Only weak topics from the parent test |
| Duplicate questions | Never — excludes all questions seen before |
| Difficulty | Slightly easier than failed questions, progresses upward |
| Time | Dynamic based on exam (JEE: ~2.4 mins/Q, NEET: ~1 min/Q) |
| Marking scheme | Same as parent exam |
| Next booster threshold | Offered if any topic still below 70% after booster |
| Max booster depth | 3 levels (original → booster 1 → booster 2 → booster 3) |

---

**Teacher visibility**

Teachers can see on the batch dashboard:
- How many students attempted the booster after each institute test
- Which topics required multiple boosters across the batch
- Average improvement percentage between original and booster scores

This is powerful data: if 80% of students needed a booster on Carnot Cycle and still scored poorly, the teacher knows they need another class on that topic.

---

**Why this feature matters for the product**

Most test platforms stop at the score. A few add AI analysis. Almost none close the loop by making the student immediately practice the weak area and showing them their improvement. This is the feature that makes students come back every day — because every test generates a next step automatically. There is no dead end on this platform. A bad test always leads to a booster, and a booster always leads to measurable improvement.

---

## 5. System Architecture

### 5.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  Student App  │  Teacher Dashboard  │  Institute Admin  │  Super Admin │
│  React 18 + Tailwind + Vite  │  Hosted on Vercel (Free tier)   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                   Vercel CDN + Edge Network                      │
│         Static asset delivery · Automatic HTTPS · Git deploys   │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼────────────────────────────────────┐
│                  GCP Cloud Run — Node.js 20 + Express            │
│   Docker container · Auto-scales to zero · 2M req/month free    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  /auth   │ │  /tests  │ │/analysis │ │   /rankings      │  │
│  │ router   │ │  router  │ │  router  │ │    router        │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           /institutes  /batches  /questions              │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────┬──────────────────────┬──────────────────────────────┘
            │                      │
    ┌───────▼──────┐    ┌──────────▼───────────────────────────┐
    │  Upstash     │    │            Data Layer                  │
    │  Redis       │    │  ┌──────────────┐  ┌───────────────┐ │
    │              │    │  │  Supabase    │  │  GCP Cloud    │ │
    │  Leaderboard │    │  │  PostgreSQL  │  │  Storage      │ │
    │  cache       │    │  │  (Primary DB)│  │  (Media files)│ │
    │  Rate limit  │    │  └──────────────┘  └───────────────┘ │
    └──────────────┘    └──────────────────────────────────────┘
                                    │
    ┌───────────────────────────────▼──────────────────────────┐
    │                    External Services                       │
    │  Supabase Auth (JWT)  │  Gemini API (AI)  │ GCP Scheduler│
    └──────────────────────────────────────────────────────────┘
```

### 5.2 Request Flow — Student Takes a Test

```
1. Student opens test page → React fetches GET /api/tests/:id
2. Express validates JWT → extracts student_id and role
3. Test engine queries PostgreSQL for questions
4. Questions returned to client (without correct answers)
5. Student answers → auto-saved every 30s via PATCH /api/attempts/:id
6. Student submits → POST /api/attempts/:id/submit
7. Express scores the test and writes to attempt_answers table
8. Express enqueues AI analysis job (async, does not block response)
9. Student immediately sees score page (score is instant)
10. AI analysis runs in background (Gemini API call)
11. When analysis ready, client polls /api/analysis/:attempt_id
12. Analysis report displayed when available (typically 3–8 seconds)
```

### 5.3 Data Flow — Nightly Ranking Computation

```
1. GCP Cloud Scheduler fires at 00:00 IST
2. Hits POST /api/internal/rankings/compute (protected endpoint)
3. Ranking engine queries all student_stats
4. Computes rank_score for each student per exam
5. Sorts by rank_score and assigns rank_position
6. Calculates percentile
7. Writes to leaderboard table (upsert, not insert)
8. Invalidates Redis cache for leaderboard keys
9. Next leaderboard page load reads fresh data from PostgreSQL
10. Subsequent loads served from Redis until next midnight
```

---

## 6. Tech Stack

### 6.1 Frontend

| Technology | Version | Purpose | Cost |
|---|---|---|---|
| React | 18 | UI framework | Free |
| Tailwind CSS | 3.x | Styling | Free |
| Vite | 5.x | Build tool and dev server | Free |
| React Router | 6 | Client-side routing | Free |
| Zustand | 4 | Lightweight state management | Free |
| React Query (TanStack) | 5 | Server state, caching, polling | Free |
| KaTeX | latest | LaTeX math rendering for questions | Free |
| Recharts | 2 | Charts in analytics dashboards | Free |
| React Hook Form | 7 | Form handling | Free |
| Zod | 3 | Schema validation (shared with backend) | Free |
| Axios | 1 | HTTP client | Free |

**Why Zustand over Redux?** For this app's complexity level, Zustand is simpler and has less boilerplate. If complexity grows significantly Redux Toolkit is a clean upgrade path.

**Why React Query?** The leaderboard polling and AI analysis polling are perfect use cases. React Query handles loading states, background refetching, and caching out of the box.

### 6.2 Backend

| Technology | Version | Purpose | Cost |
|---|---|---|---|
| Node.js | 20 LTS | Runtime | Free |
| Express | 4 | HTTP framework | Free |
| TypeScript | 5 | Type safety across the codebase | Free |
| Zod | 3 | Runtime validation of request bodies | Free |
| jsonwebtoken | 9 | JWT verification | Free |
| @supabase/supabase-js | 2 | Supabase client | Free |
| @google/generative-ai | latest | Gemini API client | Free |
| node-cron | 3 | Fallback scheduler (inside container) | Free |
| Winston | 3 | Structured logging | Free |
| Helmet | 7 | HTTP security headers | Free |
| express-rate-limit | 7 | API rate limiting | Free |
| cors | 2 | CORS configuration | Free |
| dotenv | 16 | Environment variable management | Free |

### 6.3 Infrastructure

| Service | Tier | Purpose | Monthly Cost |
|---|---|---|---|
| Vercel | Free | Frontend hosting, CDN, edge | ₹0 |
| GCP Cloud Run | Free tier | Backend API hosting | ₹0 (within 2M req) |
| Supabase | Free | PostgreSQL database + Auth | ₹0 (500MB) |
| Upstash | Free | Redis cache | ₹0 (10K cmds/day) |
| GCP Cloud Storage | Free tier | Question images and PDFs | ₹0 (5GB) |
| GCP Cloud Scheduler | Free | Cron jobs (3 free) | ₹0 |
| Google AI (Gemini) | Pay per use | AI analysis | ~₹800 at 1K analyses |
| Domain (.in or .com) | Annual | Custom domain | ~₹800/year |
| **Total prototype cost** | | | **~₹800–1,200/month** |

### 6.4 AI Models

The platform uses a model-agnostic AI service layer. The model can be switched via environment variable without code changes. This allows the team to A/B test different models for analysis quality.

**Primary model:** Gemini 2.5 Flash (Google AI)
- Best cost-to-quality ratio for structured text analysis
- Native GCP integration — same billing account as backend
- Fast response time (~2–4 seconds for analysis prompts)

**Secondary / testing models:**

| Model | Provider | Approx cost per call | Notes |
|---|---|---|---|
| Gemini 2.5 Flash | Google | ~₹0.03 | Primary — cheapest and capable |
| Gemini 2.5 Pro | Google | ~₹0.40 | Higher quality, test for complex UPSC analysis |
| GPT-4o mini | OpenAI | ~₹0.06 | Good alternative if Gemini underperforms |
| GPT-4o | OpenAI | ~₹0.90 | Premium, test for batch analysis quality |

The model is set via `AI_MODEL` environment variable on Cloud Run. Changing the model for A/B testing is a one-line config change with no redeployment needed.

---

## 7. Monorepo Folder Structure

The project is organized as a monorepo using **pnpm workspaces**. This keeps all code in one repository, allows sharing of types and validation schemas between frontend and backend, and simplifies CI/CD.

```
examprep/
├── package.json                    # Root package — pnpm workspaces config
├── pnpm-workspace.yaml             # Defines workspace packages
├── turbo.json                      # Turborepo config for build orchestration
├── .env.example                    # Environment variable template
├── .gitignore
├── README.md
│
├── packages/                       # Shared packages (used by both apps)
│   ├── types/                      # Shared TypeScript types
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── exam.types.ts       # Exam, Subject, Chapter, Question types
│   │       ├── test.types.ts       # Test, Attempt, Answer types
│   │       ├── user.types.ts       # User, Role, Student, Teacher types
│   │       ├── institute.types.ts  # Institute, Batch, Invite types
│   │       ├── ranking.types.ts    # Leaderboard, Rank, Streak types
│   │       └── ai.types.ts         # Analysis, Feedback, StudyPlan types
│   │
│   ├── schemas/                    # Shared Zod schemas (validated on both ends)
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── question.schema.ts
│   │       ├── test.schema.ts
│   │       ├── attempt.schema.ts
│   │       └── institute.schema.ts
│   │
│   └── constants/                  # Shared constants
│       ├── package.json
│       └── src/
│           ├── index.ts
│           ├── marking-schemes.ts  # +4/-1 for JEE, +4/-1 for NEET, etc.
│           ├── exam-config.ts      # Subjects per exam, chapters per subject
│           └── ai-prompts.ts       # Prompt templates for AI analysis
│
├── apps/
│   ├── web/                        # React frontend
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── router.tsx          # All routes defined here
│   │       │
│   │       ├── components/         # Reusable UI components
│   │       │   ├── ui/             # Base UI (Button, Input, Card, Modal, etc.)
│   │       │   ├── question/       # QuestionCard, OptionButton, MathRenderer
│   │       │   ├── test/           # TestTimer, NavigationPanel, ReviewPanel
│   │       │   ├── analysis/       # AnalysisCard, WeakTopicList, StudyPlan
│   │       │   ├── ranking/        # LeaderboardTable, RankCard, StreakBadge
│   │       │   ├── institute/      # BatchCard, StudentTable, InviteModal
│   │       │   └── layout/         # Navbar, Sidebar, PageWrapper
│   │       │
│   │       ├── pages/              # Route-level components
│   │       │   ├── auth/
│   │       │   │   ├── LoginPage.tsx
│   │       │   │   ├── SignupPage.tsx
│   │       │   │   └── InvitePage.tsx   # Invite link landing page
│   │       │   ├── student/
│   │       │   │   ├── DashboardPage.tsx
│   │       │   │   ├── CreateTestPage.tsx
│   │       │   │   ├── TestPage.tsx         # Active test UI
│   │       │   │   ├── ResultPage.tsx       # Score + AI analysis
│   │       │   │   ├── LeaderboardPage.tsx
│   │       │   │   ├── HistoryPage.tsx
│   │       │   │   └── ProfilePage.tsx
│   │       │   ├── teacher/
│   │       │   │   ├── TeacherDashboard.tsx
│   │       │   │   ├── CreateInstituteTesPage.tsx
│   │       │   │   ├── BatchAnalysisPage.tsx
│   │       │   │   └── BatchLeaderboardPage.tsx
│   │       │   ├── institute/
│   │       │   │   ├── InstituteAdminDashboard.tsx
│   │       │   │   ├── BatchManagementPage.tsx
│   │       │   │   ├── StudentManagementPage.tsx
│   │       │   │   ├── ReportsPage.tsx
│   │       │   │   └── BillingPage.tsx
│   │       │   └── superadmin/
│   │       │       ├── SuperAdminDashboard.tsx
│   │       │       ├── QuestionBankPage.tsx
│   │       │       ├── InstitutesPage.tsx
│   │       │       └── SystemHealthPage.tsx
│   │       │
│   │       ├── hooks/              # Custom React hooks
│   │       │   ├── useAuth.ts
│   │       │   ├── useTest.ts
│   │       │   ├── useAnalysis.ts
│   │       │   ├── useLeaderboard.ts
│   │       │   └── useTimer.ts
│   │       │
│   │       ├── store/              # Zustand stores
│   │       │   ├── auth.store.ts
│   │       │   ├── test.store.ts   # Active test state (answers, timer)
│   │       │   └── ui.store.ts
│   │       │
│   │       ├── services/           # API call functions
│   │       │   ├── api.ts          # Axios instance and interceptors
│   │       │   ├── auth.service.ts
│   │       │   ├── test.service.ts
│   │       │   ├── analysis.service.ts
│   │       │   ├── ranking.service.ts
│   │       │   └── institute.service.ts
│   │       │
│   │       ├── utils/
│   │       │   ├── format.ts       # Date formatting, score formatting
│   │       │   ├── latex.ts        # LaTeX/KaTeX helpers
│   │       │   └── share.ts        # Rank card share functionality
│   │       │
│   │       └── types/              # Frontend-only types (extends shared)
│   │
│   └── api/                        # Express backend
│       ├── package.json
│       ├── tsconfig.json
│       ├── Dockerfile
│       └── src/
│           ├── index.ts            # Server entry point
│           ├── app.ts              # Express app setup, middleware
│           │
│           ├── routes/             # Route definitions
│           │   ├── index.ts        # Mounts all routers
│           │   ├── auth.routes.ts
│           │   ├── questions.routes.ts
│           │   ├── tests.routes.ts
│           │   ├── attempts.routes.ts
│           │   ├── analysis.routes.ts
│           │   ├── rankings.routes.ts
│           │   ├── institutes.routes.ts
│           │   ├── batches.routes.ts
│           │   └── internal.routes.ts   # Protected internal endpoints for cron
│           │
│           ├── controllers/        # Request handling logic
│           │   ├── auth.controller.ts
│           │   ├── questions.controller.ts
│           │   ├── tests.controller.ts
│           │   ├── attempts.controller.ts
│           │   ├── analysis.controller.ts
│           │   ├── rankings.controller.ts
│           │   ├── institutes.controller.ts
│           │   └── batches.controller.ts
│           │
│           ├── services/           # Business logic
│           │   ├── scoring.service.ts      # Apply marking schemes
│           │   ├── ai.service.ts           # Model-agnostic AI wrapper
│           │   ├── gemini.service.ts       # Gemini-specific implementation
│           │   ├── openai.service.ts       # OpenAI implementation (for A/B)
│           │   ├── ranking.service.ts      # Rank computation logic
│           │   ├── invite.service.ts       # Invite code generation/validation
│           │   └── report.service.ts       # PDF report generation
│           │
│           ├── middleware/
│           │   ├── auth.middleware.ts      # JWT validation
│           │   ├── rbac.middleware.ts      # Role-based access control
│           │   ├── validate.middleware.ts  # Zod request validation
│           │   ├── rateLimit.middleware.ts # Per-route rate limits
│           │   └── logger.middleware.ts    # Request logging
│           │
│           ├── db/
│           │   ├── supabase.ts     # Supabase client initialization
│           │   ├── redis.ts        # Upstash Redis client
│           │   └── queries/        # Reusable database query functions
│           │       ├── questions.queries.ts
│           │       ├── tests.queries.ts
│           │       ├── attempts.queries.ts
│           │       ├── rankings.queries.ts
│           │       └── institutes.queries.ts
│           │
│           ├── jobs/               # Scheduled job logic
│           │   ├── ranking.job.ts          # Nightly rank computation
│           │   ├── streak.job.ts           # Daily streak reset
│           │   └── reports.job.ts          # Weekly institute reports
│           │
│           ├── config/
│           │   ├── env.ts          # Validated environment variables
│           │   └── ai-models.ts    # AI model registry and selector
│           │
│           └── utils/
│               ├── logger.ts
│               ├── errors.ts       # Custom error classes
│               └── helpers.ts
│
├── infrastructure/                 # DevOps and deployment
│   ├── docker/
│   │   └── api.Dockerfile
│   ├── gcp/
│   │   ├── cloud-run.yaml          # Cloud Run service config
│   │   └── scheduler.yaml          # Cloud Scheduler job config
│   └── scripts/
│       ├── seed-questions.ts       # Import questions from JSON files
│       └── migrate.ts              # Database migration helper
│
├── data/                           # Question bank source files (gitignored in prod)
│   ├── jee/
│   │   ├── physics/
│   │   ├── chemistry/
│   │   └── maths/
│   └── neet/
│       ├── physics/
│       ├── chemistry/
│       └── biology/
│
└── docs/                           # Documentation
    ├── api.md                      # API reference
    ├── database.md                 # Schema reference
    └── deployment.md               # Deployment guide
```

---

## 8. Database Schema

All tables live in Supabase PostgreSQL. Supabase provides row-level security which we use for an additional layer of data isolation.

### 8.1 Core Tables

```sql
-- Exams (JEE, NEET, SSC, UPSC)
CREATE TABLE exams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(20) UNIQUE NOT NULL,   -- 'JEE', 'NEET', 'SSC', 'UPSC'
  full_name   VARCHAR(200) NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Users (mirrors Supabase Auth users)
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(300) UNIQUE NOT NULL,
  role        VARCHAR(30) NOT NULL DEFAULT 'student',  -- student|teacher|institute_admin|super_admin
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Questions
CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         UUID REFERENCES exams(id) NOT NULL,
  subject         VARCHAR(100) NOT NULL,
  chapter         VARCHAR(200) NOT NULL,
  topic           VARCHAR(200),
  difficulty      VARCHAR(10) CHECK (difficulty IN ('easy', 'medium', 'hard')),
  type            VARCHAR(20) CHECK (type IN ('mcq_single', 'mcq_multi', 'integer', 'subjective')),
  question_text   TEXT NOT NULL,
  options         JSONB,             -- [{"id":"A","text":"..."},{"id":"B","text":"..."}]
  correct_answer  JSONB NOT NULL,    -- "A" or ["A","C"] for multi-correct
  explanation     TEXT,
  image_url       TEXT,
  source          VARCHAR(300),      -- "JEE Mains 2019 Paper 2 Q14"
  year            INTEGER,
  tags            TEXT[],
  is_active       BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_questions_exam_subject ON questions(exam_id, subject);
CREATE INDEX idx_questions_chapter ON questions(chapter);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
```

### 8.2 Test Tables

```sql
-- Tests (both student-created and institute-created)
CREATE TABLE tests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by       UUID REFERENCES users(id) NOT NULL,
  exam_id          UUID REFERENCES exams(id) NOT NULL,
  title            VARCHAR(300),
  type             VARCHAR(30) NOT NULL,  -- 'chapter', 'subject', 'full', 'past_year', 'institute'
  config           JSONB NOT NULL,        -- subjects, chapters, difficulty mix, count
  marking_scheme   JSONB NOT NULL,        -- {"correct":4,"incorrect":-1,"unattempted":0}
  duration_minutes INTEGER NOT NULL,
  total_marks      INTEGER NOT NULL,
  question_ids     UUID[] NOT NULL,       -- ordered array of question IDs
  mode             VARCHAR(20) DEFAULT 'exam',  -- 'exam' or 'practice'
  is_institute_test BOOLEAN DEFAULT false,
  scheduled_start  TIMESTAMPTZ,           -- for institute tests
  scheduled_end    TIMESTAMPTZ,           -- for institute tests
  is_published     BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Institute test batch assignments
CREATE TABLE test_batch_assignments (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id   UUID REFERENCES tests(id) NOT NULL,
  batch_id  UUID REFERENCES batches(id) NOT NULL,
  UNIQUE(test_id, batch_id)
);

-- Test attempts
CREATE TABLE attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES users(id) NOT NULL,
  test_id         UUID REFERENCES tests(id) NOT NULL,
  exam_id         UUID REFERENCES exams(id) NOT NULL,
  score           DECIMAL(10,2),
  max_score       INTEGER,
  percentage      DECIMAL(5,2),
  time_taken_sec  INTEGER,
  correct_count   INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  skipped_count   INTEGER DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'in_progress',  -- in_progress|submitted|timed_out
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attempts_student ON attempts(student_id);
CREATE INDEX idx_attempts_test ON attempts(test_id);

-- Individual answers within an attempt
CREATE TABLE attempt_answers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id       UUID REFERENCES attempts(id) NOT NULL,
  question_id      UUID REFERENCES questions(id) NOT NULL,
  selected_answer  JSONB,        -- null if skipped
  is_correct       BOOLEAN,
  marks_awarded    DECIMAL(5,2),
  time_taken_sec   INTEGER,      -- time on this specific question
  marked_review    BOOLEAN DEFAULT false
);

CREATE INDEX idx_attempt_answers_attempt ON attempt_answers(attempt_id);
```

### 8.3 Institute Tables

```sql
-- Institutes
CREATE TABLE institutes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(300) NOT NULL,
  owner_id          UUID REFERENCES users(id) NOT NULL,
  subscription_plan VARCHAR(30) DEFAULT 'trial',  -- trial|starter|growth|pro
  trial_ends_at     TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  max_students      INTEGER DEFAULT 100,
  max_batches       INTEGER DEFAULT 5,
  is_active         BOOLEAN DEFAULT true,
  metadata          JSONB,       -- address, contact, etc.
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Batches within an institute
CREATE TABLE batches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID REFERENCES institutes(id) NOT NULL,
  name         VARCHAR(200) NOT NULL,          -- "JEE 2026 Morning Batch"
  exam_id      UUID REFERENCES exams(id) NOT NULL,
  description  TEXT,
  start_date   DATE,
  end_date     DATE,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Students enrolled in batches (many-to-many)
CREATE TABLE batch_students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    UUID REFERENCES batches(id) NOT NULL,
  student_id  UUID REFERENCES users(id) NOT NULL,
  joined_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(batch_id, student_id)
);

-- Teachers assigned to batches (many-to-many)
CREATE TABLE batch_teachers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id   UUID REFERENCES batches(id) NOT NULL,
  teacher_id UUID REFERENCES users(id) NOT NULL,
  UNIQUE(batch_id, teacher_id)
);

-- Invite codes for batch enrollment
CREATE TABLE batch_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    UUID REFERENCES batches(id) NOT NULL,
  code        VARCHAR(20) UNIQUE NOT NULL,   -- "AAKASH-JEE26-XK9"
  created_by  UUID REFERENCES users(id),
  max_uses    INTEGER,                       -- null = unlimited
  used_count  INTEGER DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 8.4 AI Analysis Tables

```sql
-- AI analysis results (one per attempt)
CREATE TABLE ai_analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      UUID REFERENCES attempts(id) UNIQUE NOT NULL,
  student_id      UUID REFERENCES users(id) NOT NULL,
  model_used      VARCHAR(100),              -- "gemini-2.5-flash", "gpt-4o-mini", etc.
  weak_topics     JSONB,                     -- [{topic, accuracy, recommendation}]
  error_patterns  JSONB,                     -- [{pattern, description, questions_affected}]
  study_plan      JSONB,                     -- [{day, topic, activity, duration_minutes}]
  next_test_config JSONB,                    -- suggested next test config
  raw_response    TEXT,                      -- full AI response for debugging
  tokens_used     INTEGER,
  processing_ms   INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Batch-level AI analysis (one per institute test attempt batch)
CREATE TABLE batch_analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id         UUID REFERENCES tests(id) NOT NULL,
  batch_id        UUID REFERENCES batches(id) NOT NULL,
  model_used      VARCHAR(100),
  class_summary   JSONB,                     -- avg score, distribution
  chapter_heatmap JSONB,                     -- [{chapter, avg_accuracy, flag}]
  teaching_recs   JSONB,                     -- [{recommendation, priority}]
  attention_flags JSONB,                     -- [{student_id, reason}]
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_id, batch_id)
);
```

### 8.5 Ranking Tables

```sql
-- Student performance stats (rolling totals, updated after each attempt)
CREATE TABLE student_stats (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID REFERENCES users(id) NOT NULL,
  exam_id          UUID REFERENCES exams(id) NOT NULL,
  total_tests      INTEGER DEFAULT 0,
  total_score      DECIMAL(10,2) DEFAULT 0,
  avg_score        DECIMAL(5,2) DEFAULT 0,
  best_score       DECIMAL(5,2) DEFAULT 0,
  streak_days      INTEGER DEFAULT 0,
  longest_streak   INTEGER DEFAULT 0,
  last_test_date   DATE,
  total_time_sec   INTEGER DEFAULT 0,
  rank_score       DECIMAL(10,4) DEFAULT 0,  -- precomputed composite score
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, exam_id)
);

-- Precomputed leaderboard (refreshed nightly)
CREATE TABLE leaderboards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID REFERENCES users(id) NOT NULL,
  exam_id          UUID REFERENCES exams(id) NOT NULL,
  scope            VARCHAR(20) NOT NULL,     -- 'batch' | 'institute' | 'global'
  scope_id         UUID,                     -- batch_id or institute_id (null for global)
  rank_score       DECIMAL(10,4) NOT NULL,
  rank_position    INTEGER NOT NULL,
  percentile       DECIMAL(5,2),
  computed_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, exam_id, scope, scope_id)
);

CREATE INDEX idx_leaderboard_scope ON leaderboards(exam_id, scope, scope_id, rank_position);
```

---

## 9. API Design

All API routes are prefixed with `/api/v1`. Authentication is required on all routes except `/auth/*`.

### 9.1 Auth Routes

```
POST   /api/v1/auth/signup           — Register with email + password
POST   /api/v1/auth/login            — Login (handled by Supabase client-side)
POST   /api/v1/auth/join-batch       — Join batch via invite code
GET    /api/v1/auth/me               — Get current user profile
PATCH  /api/v1/auth/me               — Update profile
```

### 9.2 Question Routes

```
GET    /api/v1/questions             — List questions (filter: exam, subject, chapter, difficulty, type)
GET    /api/v1/questions/:id         — Get single question
POST   /api/v1/questions             — Create question [super_admin only]
PATCH  /api/v1/questions/:id         — Update question [super_admin only]
DELETE /api/v1/questions/:id         — Soft delete [super_admin only]
GET    /api/v1/questions/meta/exams  — Get available exams with subjects + chapters
```

### 9.3 Test Routes

```
POST   /api/v1/tests                 — Create a test (generates question set from config)
GET    /api/v1/tests/:id             — Get test config (without correct answers)
GET    /api/v1/tests/my              — List own tests
GET    /api/v1/tests/assigned        — List institute-assigned tests for current student
POST   /api/v1/tests/:id/publish     — Publish institute test [teacher only]
```

### 9.4 Attempt Routes

```
POST   /api/v1/attempts              — Start an attempt for a test
GET    /api/v1/attempts/:id          — Get current attempt state
PATCH  /api/v1/attempts/:id          — Auto-save answers
POST   /api/v1/attempts/:id/submit   — Submit attempt and trigger scoring
GET    /api/v1/attempts/my           — List own attempts
```

### 9.5 Analysis Routes

```
GET    /api/v1/analysis/:attempt_id  — Get AI analysis for an attempt
POST   /api/v1/analysis/:attempt_id/regenerate — Regenerate with different model [super_admin]
GET    /api/v1/analysis/batch/:test_id/:batch_id — Get batch analysis [teacher]
```

### 9.6 Ranking Routes

```
GET    /api/v1/rankings/me           — Get current user's ranks (batch + institute + global)
GET    /api/v1/rankings/leaderboard  — Get leaderboard (query: exam, scope, scope_id, page)
GET    /api/v1/rankings/rank-card    — Get shareable rank card data
```

### 9.7 Institute Routes

```
POST   /api/v1/institutes            — Create institute [super_admin]
GET    /api/v1/institutes/me         — Get own institute [institute_admin]
PATCH  /api/v1/institutes/:id        — Update institute settings [institute_admin]
GET    /api/v1/institutes/:id/stats  — Get institute-wide stats [institute_admin]

POST   /api/v1/batches               — Create batch [institute_admin]
GET    /api/v1/batches               — List batches in institute [institute_admin/teacher]
GET    /api/v1/batches/:id           — Get batch details
PATCH  /api/v1/batches/:id           — Update batch [institute_admin]
DELETE /api/v1/batches/:id           — Deactivate batch [institute_admin]

POST   /api/v1/batches/:id/students  — Add student to batch
DELETE /api/v1/batches/:id/students/:student_id — Remove student
POST   /api/v1/batches/:id/teachers  — Add teacher to batch
POST   /api/v1/batches/:id/invite    — Generate invite code/link
```

### 9.8 Internal Routes (cron only)

```
POST   /api/v1/internal/rankings/compute   — Trigger nightly rank computation
POST   /api/v1/internal/streaks/reset      — Daily streak maintenance
POST   /api/v1/internal/reports/weekly     — Send weekly institute reports
```

These routes require a separate `INTERNAL_API_KEY` header (not a JWT). GCP Cloud Scheduler is configured to include this header.

---

## 10. AI Integration Strategy

### 10.1 Model-Agnostic Service Layer

The AI service is built as an abstraction so the underlying model can be swapped without touching business logic.

```typescript
// apps/api/src/services/ai.service.ts

interface AIAnalysisInput {
  studentName: string;
  examId: string;
  testTitle: string;
  totalQuestions: number;
  score: number;
  maxScore: number;
  timeTakenSec: number;
  wrongAnswers: Array<{
    questionId: string;
    subject: string;
    chapter: string;
    topic: string;
    selectedAnswer: string;
    correctAnswer: string;
  }>;
  skippedQuestions: Array<{ questionId: string; chapter: string; topic: string; }>;
  pastPerformance?: Array<{ chapter: string; avgAccuracy: number; }>;
}

interface AIAnalysisOutput {
  weakTopics: Array<{ topic: string; accuracy: number; recommendation: string; }>;
  errorPatterns: Array<{ pattern: string; description: string; questionsAffected: number; }>;
  studyPlan: Array<{ day: number; topic: string; activity: string; durationMinutes: number; }>;
  nextTestConfig: object;
}

// Selector picks model from environment variable
function getAIProvider(): AIProvider {
  const model = process.env.AI_MODEL || 'gemini-2.5-flash';
  if (model.startsWith('gemini')) return new GeminiProvider(model);
  if (model.startsWith('gpt')) return new OpenAIProvider(model);
  throw new Error(`Unknown AI model: ${model}`);
}
```

### 10.2 Prompt Template (Student Analysis)

```
You are an expert JEE/NEET exam coach. Analyze the following student test performance and provide detailed, actionable feedback.

STUDENT: {studentName}
EXAM: {examId}
TEST: {testTitle}
SCORE: {score}/{maxScore} ({percentage}%)
TIME TAKEN: {timeTaken} minutes

WRONG ANSWERS:
{wrongAnswersList}

SKIPPED QUESTIONS:
{skippedList}

PAST PERFORMANCE ON THESE TOPICS:
{pastPerformance}

Provide your analysis in the following JSON structure:
{
  "weakTopics": [{"topic": "", "accuracy": 0, "recommendation": ""}],
  "errorPatterns": [{"pattern": "", "description": "", "questionsAffected": 0}],
  "studyPlan": [{"day": 1, "topic": "", "activity": "", "durationMinutes": 0}],
  "nextTestConfig": {"subjects": [], "chapters": [], "difficulty": ""}
}

Be specific. Reference actual topics from their wrong answers. Study plan should be for 7 days.
Return ONLY the JSON object. No preamble, no explanation outside the JSON.
```

### 10.3 Batch Analysis Prompt (Teacher)

```
You are an expert exam coaching coordinator. Analyze the following batch test results and provide teaching recommendations.

EXAM: {examId}
TEST: {testTitle}
BATCH SIZE: {totalStudents} students | {attemptedCount} attempted

CHAPTER PERFORMANCE:
{chapterPerformanceTable}

SCORE DISTRIBUTION:
{distribution}

COMMON WRONG ANSWERS:
{topWrongQuestions}

Provide your analysis in the following JSON structure:
{
  "classSummary": {"avgScore": 0, "topScore": 0, "bottomScore": 0, "belowAverageCount": 0},
  "chapterHeatmap": [{"chapter": "", "avgAccuracy": 0, "flag": "critical|warning|good"}],
  "teachingRecs": [{"recommendation": "", "priority": "high|medium|low"}],
  "attentionFlags": [{"studentId": "", "reason": ""}]
}

Return ONLY the JSON object.
```

### 10.4 A/B Testing Different Models

To test models, set the `AI_MODEL` environment variable on Cloud Run:

```bash
# Gemini 2.5 Flash (default, cheapest)
AI_MODEL=gemini-2.5-flash

# Gemini 2.5 Pro (higher quality)
AI_MODEL=gemini-2.5-pro

# GPT-4o mini (OpenAI alternative)
AI_MODEL=gpt-4o-mini
```

To compare model quality, the `ai_analyses` table stores `model_used` per analysis, allowing the team to run queries comparing analysis quality per model on the same test data.

---

## 11. Ranking System

### 11.1 Rank Score Computation

```typescript
// apps/api/src/jobs/ranking.job.ts

function computeRankScore(studentStats: StudentStats, recentAttempts: Attempt[]): number {
  const avgScore = computeWeightedAverage(recentAttempts);        // 40%
  const consistency = computeConsistency(recentAttempts);          // 25%
  const improvement = computeImprovementTrend(recentAttempts);     // 20%
  const speed = computeSpeedScore(recentAttempts);                 // 15%

  return (avgScore * 0.40) + (consistency * 0.25) + (improvement * 0.20) + (speed * 0.15);
}

// Weighted average — more recent tests have higher weight
function computeWeightedAverage(attempts: Attempt[]): number {
  const sorted = attempts.sort((a, b) => b.created_at - a.created_at);
  let totalWeight = 0;
  let weightedSum = 0;
  sorted.forEach((attempt, index) => {
    const weight = 1 / (index + 1);  // weight: 1, 0.5, 0.33, 0.25...
    weightedSum += attempt.percentage * weight;
    totalWeight += weight;
  });
  return weightedSum / totalWeight;
}

// Consistency = 100 - standard deviation of scores (normalized to 0-100)
function computeConsistency(attempts: Attempt[]): number {
  const scores = attempts.map(a => a.percentage);
  const stdDev = standardDeviation(scores);
  return Math.max(0, 100 - stdDev);
}
```

### 11.2 Rank Card Data Structure

```typescript
interface RankCardData {
  studentName: string;
  examId: string;
  batchRank: number;
  batchTotal: number;
  instituteRank: number;
  instituteTotal: number;
  globalRank: number;
  globalTotal: number;
  percentile: number;
  streakDays: number;
  avgScore: number;
  totalTests: number;
}
```

---

## 12. Scalability Plan

### Tier 1: 0 — 1,000 active students (Months 1–8)

Everything on free tiers. Total infra cost: ~₹800–1,200/month.

- Single Cloud Run container (monolith)
- Supabase free tier (500MB)
- Upstash Redis free tier
- Vercel free tier

### Tier 2: 1,000 — 10,000 active students (Months 8–18)

- Upgrade Supabase to Pro: ₹1,600/month (8GB database)
- Add Supabase read replica for leaderboard queries
- Upgrade Vercel to Pro if bandwidth exceeded: ₹1,600/month
- Cloud Run scales automatically — no change needed
- Redis: upgrade Upstash to Pay as You Go (~₹500/month)
- Total infra: ~₹4,000–5,000/month

### Tier 3: 10,000 — 100,000 active students (Months 18+)

- Split AI analysis into separate Cloud Run service with its own scaling config
- Add BullMQ job queue for async AI processing (prevents API timeouts)
- PostgreSQL connection pooling via PgBouncer (Supabase managed)
- CDN caching for question images (already on GCP Cloud Storage with CDN)
- Consider moving to Supabase Enterprise or direct GCP Cloud SQL
- Total infra: ~₹20,000–50,000/month (covered well by institute revenue)

### Database Scalability

Ranking computation is the heaviest query. It will always run at midnight with no user traffic, so it can take longer without user impact. Indexes are designed to support the exact query patterns used:

- Leaderboard reads: indexed on `(exam_id, scope, scope_id, rank_position)`
- Question filtering: indexed on `(exam_id, subject)` and `chapter`
- Attempt lookups: indexed on `student_id` and `test_id`

---

## 13. Infrastructure & DevOps

### 13.1 Environments

| Environment | Frontend URL | API URL | Database |
|---|---|---|---|
| Development | localhost:5173 | localhost:3000 | Local Supabase |
| Staging | staging.examprep.in | api-staging.examprep.in | Supabase staging project |
| Production | examprep.in | api.examprep.in | Supabase production project |

### 13.2 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml

On push to main:
  1. Run TypeScript type check (pnpm typecheck)
  2. Run linter (pnpm lint)
  3. Run unit tests (pnpm test)
  4. Build frontend → deploy to Vercel (automatic via Vercel GitHub integration)
  5. Build Docker image → push to GCP Artifact Registry
  6. Deploy new image to Cloud Run (zero-downtime rolling deploy)

On push to dev branch:
  1–3. Same checks
  4–6. Deploy to staging environment
```

### 13.3 Docker Configuration

```dockerfile
# infrastructure/docker/api.Dockerfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

### 13.4 Environment Variables

```bash
# apps/api/.env.example

# Server
PORT=8080
NODE_ENV=development

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Redis (Upstash)
UPSTASH_REDIS_URL=https://xxxx.upstash.io
UPSTASH_REDIS_TOKEN=AX...

# GCP
GCP_PROJECT_ID=examprep-prod
GCS_BUCKET_NAME=examprep-media

# AI
AI_MODEL=gemini-2.5-flash
GOOGLE_AI_API_KEY=AIza...
OPENAI_API_KEY=sk-...   # optional, for A/B testing

# Internal security
INTERNAL_API_KEY=random-secret-string-for-cron-jobs

# Frontend
FRONTEND_URL=https://examprep.in
```

### 13.5 GCP Cloud Scheduler Jobs

```yaml
# infrastructure/gcp/scheduler.yaml

jobs:
  - name: nightly-rankings
    schedule: "0 0 * * *"           # Midnight IST
    timeZone: "Asia/Kolkata"
    url: https://api.examprep.in/api/v1/internal/rankings/compute
    method: POST
    headers:
      X-Internal-Api-Key: ${INTERNAL_API_KEY}

  - name: daily-streaks
    schedule: "1 0 * * *"           # 12:01 AM IST
    timeZone: "Asia/Kolkata"
    url: https://api.examprep.in/api/v1/internal/streaks/reset
    method: POST
    headers:
      X-Internal-Api-Key: ${INTERNAL_API_KEY}

  - name: weekly-reports
    schedule: "0 8 * * 0"           # 8 AM Sunday IST
    timeZone: "Asia/Kolkata"
    url: https://api.examprep.in/api/v1/internal/reports/weekly
    method: POST
    headers:
      X-Internal-Api-Key: ${INTERNAL_API_KEY}
```

---

## 14. Security

### 14.1 Authentication

- All auth handled by Supabase Auth (battle-tested, not built from scratch)
- JWTs expire in 1 hour, refresh tokens valid for 7 days
- Every API request validates the JWT signature using Supabase public key
- Role is stored in JWT claims — checked on every protected route

### 14.2 Authorization

- Role-based middleware on every route: `requireRole('teacher')` etc.
- Institute data isolation: every query filters by the user's `institute_id` — a teacher from Institute A can never see Institute B's data even with a valid JWT
- Supabase row-level security policies as a second layer of defense

### 14.3 Input Validation

- All request bodies validated with Zod schemas on the server
- Shared schemas between frontend and backend — validation is consistent
- SQL injection not possible with Supabase JS client (parameterized queries only)

### 14.4 Rate Limiting

| Endpoint | Limit |
|---|---|
| POST /auth/signup | 5 per hour per IP |
| POST /attempts/:id/submit | 1 per attempt (prevents double-submit) |
| GET /analysis/:id | 10 per minute per user |
| POST /analysis/:id/regenerate | 3 per day per attempt [super_admin] |
| All other routes | 100 per minute per user |

### 14.5 API Security

- CORS configured to allow only production frontend domain
- Helmet.js sets security headers (CSP, HSTS, X-Frame-Options, etc.)
- Internal cron endpoints protected by a separate `X-Internal-Api-Key` header
- All API communication over HTTPS (enforced by Vercel and Cloud Run)

### 14.6 Data Privacy

- Students only see their own answers and performance — not other students' answers
- Teachers see aggregated batch data and per-student scores, not individual answers
- Question correct answers are never sent to the frontend during an active test
- AI raw responses stored for debugging but access is super admin only

---

## 15. Pricing & Business Model

### 15.1 Plans

| Plan | Target | Price | Limits |
|---|---|---|---|
| Free | Individual students | ₹0 | 2 tests/week, basic score report |
| Student Pro | Individual students | ₹99/month or ₹499/6 months | Unlimited tests, full AI analysis, history |
| Institute Trial | Institutes | ₹0 | 30 days, full access, all features |
| Institute Starter | Small institutes | ₹2,999/month | 3 batches, 100 students |
| Institute Growth | Mid-size institutes | ₹6,999/month | 10 batches, 500 students |
| Institute Pro | Large institutes | ₹14,999/month | Unlimited batches and students |

### 15.2 Revenue Targets

**₹80L/year target (Month 18–24):**

| Source | Target | Revenue |
|---|---|---|
| Student Pro | 500 paying students @ ₹99/month | ₹49,500/month |
| Institute Growth | 6 institutes @ ₹6,999/month | ₹41,994/month |
| Institute Starter | 5 institutes @ ₹2,999/month | ₹14,995/month |
| **Total** | | **~₹1,06,000/month → ~₹12.7L/year** |

The institute channel is the highest priority. Six Institute Growth clients alone cover ₹50L/year with less customer acquisition effort than reaching 500 individual paying students.

### 15.3 Go-to-Market

**Month 1–3:** Free launch, JEE only. Target 500 active students through student communities (Reddit, Telegram JEE groups, Discord). Focus on organic growth through AI analysis quality — a student who sees a genuinely useful report will share it.

**Month 3–6:** Approach 10 local coaching institutes with a free demo. Offer the 30-day trial. Convert 2–3 to paid. This funds all infra costs.

**Month 6–12:** Expand to NEET. Use institute case studies from Phase 1 as sales collateral. Target 10 more institutes.

**Month 12+:** Scale institute sales. Hire one sales person focused exclusively on institute deals. Each deal at ₹6,999/month is ₹84,000/year — 10 new institutes per quarter = ₹33L/year incremental revenue per quarter.

---

## 16. Development Roadmap

### Sprint 1 (Week 1–2): Foundation
- Set up monorepo with pnpm workspaces + Turborepo
- Configure TypeScript across all packages
- Set up Supabase project (dev + production)
- Create all database tables and indexes
- Set up Supabase Auth with Google OAuth
- Basic Express server with JWT middleware
- Deploy skeleton frontend to Vercel
- Deploy skeleton backend to Cloud Run

### Sprint 2 (Week 3–4): Question Bank
- Super admin question CRUD API
- Question import script (bulk load from JSON files)
- Tag all existing questions with exam/subject/chapter/topic/difficulty
- Question bank browser UI (internal — super admin only for now)
- Question filtering and search API

### Sprint 3 (Week 5–6): Test Creation & Attempt
- Test creation API (config → question set generation)
- Test creation UI (wizard with exam/subject/chapter/difficulty selection)
- Test taking UI (MCQ display with KaTeX, timer, navigation panel)
- Auto-save every 30 seconds
- Test submission and scoring API

### Sprint 4 (Week 7): AI Analysis
- AI service abstraction layer
- Gemini 2.5 Flash integration
- Student analysis prompt and parser
- Analysis result storage
- Analysis report UI (weak topics, study plan)

### Sprint 5 (Week 8–9): Ranking
- Student stats update on each attempt
- Nightly ranking job
- GCP Cloud Scheduler setup
- Leaderboard API
- Leaderboard and rank card UI
- Streak tracking and display

### Sprint 6 (Week 10–11): Institute Features
- Institute creation and management API
- Batch CRUD API
- Teacher assignment
- Invite code generation and enrollment flow
- Institute admin dashboard UI
- Teacher dashboard UI

### Sprint 7 (Week 12): Institute Tests & Batch Analysis
- Institute test creation and batch assignment
- Scheduled test window enforcement
- Batch-level AI analysis
- Batch analysis UI for teachers

### Sprint 8 (Week 13–14): Polish & Launch
- Mobile responsiveness pass on all pages
- Error states and loading states
- Email notifications (test results, weekly summary)
- Payment integration (Razorpay)
- Institute billing dashboard
- End-to-end testing
- Production deployment

---

*Document maintained by the ExamPrep core team. Update this document when architecture decisions change.*