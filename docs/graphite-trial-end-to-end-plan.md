# Graphite Institute trial — end-to-end plan

**Goal:** make one loop work completely, for a real coaching institute, on real students:
the Test Head creates a test → reviews it → sets its duration and its marks by hand →
publishes it → the assigned students see it, sit it, get their result, solutions and
analysis → the institute sees who attended and what they scored → leaderboards and
dashboards update.

**Constraint from the brief:** do not restructure the core architecture. Connect what
exists, repair what is half-connected, and build only the pieces that are genuinely absent.

**Trial:** Graphite Institute (`test.graphiteclasses.com`), 10 students split across a JEE
batch and a NEET batch. One or two trial papers, ~80 questions, duration and marks chosen by
the Test Head at review time.

> **Revision 2** — rewritten after ground feedback. The changes from revision 1:
> the Test Editor role is retired rather than merged; the institute-admin sidebar keeps
> pointing at the team page; marks are entered by hand and never derived or defaulted;
> the trial spans two exams, not one batch.
>
> **Revision 3** — an institute may have **up to three Test Heads**, as peers. The one-Head
> unique index is replaced by a count limit in WP-1.

---

## 1. What the system is today

### 1.1 Shape

Turborepo monorepo, two deployables:

| App | Stack | Role |
|---|---|---|
| `apps/web` | Next.js (App Router), Tailwind, React Query, Supabase auth client | All UI, every role, multi-tenant by hostname |
| `apps/api` | Express + TypeScript, Supabase (Postgres) via service role, Redis/BullMQ, R2 | All business logic |

Supporting: a Python PDF extractor (`apps/api/src/services/extractor`), BullMQ workers
(`apps/api/src/workers`) for PDF extraction and post-submission analysis, and a Capacitor
Android shell (`apps/web/mobile-shell`, `apps/web/institutes.json`).

### 1.2 Multi-tenancy

`apps/web/src/middleware.ts` resolves the tenant from the hostname and rewrites to
`/[domain]/*`:

- `admin.classphere.com` → `/superadmin/*`
- `<slug>.classphere.com` → `/[slug]/*`
- **any other verified host** (this is Graphite: `test.graphiteclasses.com`) → `/[host]/*`

Custom domains resolve through `institute_settings.custom_domain`
(`docs/migrations/26_institute_white_label_domains.sql`), served publicly by
`GET /api/v1/institutes/public/:domain`. Graphite is already registered in
`apps/web/institutes.json` for the Android shell.

The browser URL stays clean (`/test-department`, `/student/tests`); the `/[domain]` prefix
is a rewrite only.

### 1.3 Roles

`users.role` ∈ `student | teacher | institute_admin | super_admin | test_department_head |
test_department_member` (`docs/migrations/22_test_department_review_workflow.sql`).

**`test_department_member` ("Test Editor") is being retired** — see WP-1. After that work,
a Test Department is exactly one role, `test_department_head` ("Test Head"), appointed by
the Institute Admin. The DB check constraint keeps the old value so existing rows stay
valid, but nothing issues it any more.

**An institute may have up to three active Test Heads.** They are peers — identical
permissions, no hierarchy between them — so a coaching can spread the workload across
subjects or shifts without reintroducing a two-tier department. The current schema allows
exactly one; WP-1 raises the ceiling to three.

Post-login landing is `homePath()` in `apps/web/src/lib/auth-context.tsx:69`:

| Role | Lands on |
|---|---|
| `super_admin` | `/superadmin` |
| `institute_admin` | `/institute` |
| `teacher` | `/teacher` |
| `test_department_head` | `/test-department` |
| `student` | `/student/dashboard` |

Route guarding is client-side in `handleRouting()` (`auth-context.tsx:159`). It already
lets `institute_admin` into `/test-department` (line 189-192), which is what makes the
small-coaching path in §2.2 possible.

Students authenticate with **phone + DOB**, not email. Creation mints a Supabase auth user
with a shadow email `"{phone}_{dob}@{slug}.classphere.com"` and the DOB as password
(`apps/api/src/modules/institutes/students/students.controller.ts:262`). Staff authenticate
with email + password.

### 1.4 Core data model (papers side)

- `papers` — one test. Key columns: `institute_id`, `workflow_status`
  (`draft | needs_review | changes_requested | approved | scheduled | published | archived`),
  `is_published`, `is_active`, `delivery_mode` (`public_practice | assigned_scheduled`),
  `available_from`, `available_until`, `result_release_at`, `duration_min`, `total_marks`,
  `marking_scheme` (jsonb), `extracted_from_pdf`, `review_version`.
- `paper_questions` — `(paper_id, question_id, position)`; `position` carries the number
  printed on the paper (migration 48).
- `questions` — `content_scope` (`global | institute_private`), `review_status`,
  `content_version`, optional per-question `marks` override.
- `test_batch_assignments` — `(test_id, batch_id, scheduled_at)`, unique on the pair.
- `batch_students`, `batches` (with `starts_at` / `ends_at` lifecycle and an `exam`).
- `attempts` — `student_id`, `paper_id`, `batch_id`, `status`
  (`in_progress | submitting | submitted`), `score`, `max_score`, `marking_scheme`,
  `total_duration_sec`.
- `attempt_answers`, `analysis_results`, `student_stats`, `notifications`,
  `test_review_events` (append-only audit).

### 1.5 The four flows that already work

**A. PDF → draft paper.**
`/institute/tests/create` (also served at `/test-department/create` and
`/institute/test-department/create` — all three are one page,
`apps/web/src/app/[domain]/institute/tests/create/page.tsx`, wired by the middleware).
Three modes: **PDF upload**, **build from bank**, **pick questions**. PDF mode posts to
`POST /api/v1/tests/upload-test`, which streams NDJSON progress, queues the extraction job,
polls it, parses the answer key, uploads figures to R2, and writes a `draft` paper with
`delivery_mode: assigned_scheduled`, `extracted_from_pdf: true`, plus its
`test_batch_assignments` rows (`tests.controller.ts:1100-1653`).

**B. Review workspace.**
`/test-department` lists papers; `/test-department/[id]` opens `PaperReviewWorkspace`
(shared with the Superadmin question bank). Per-question editing, figure replacement,
question deletion, a marking-scheme editor, and a validation report
(`GET /test-department/papers/:id/validate` → `lib/paper-validation.ts`). Workflow
transitions: submit → approve → publish → archive/restore, plus a reusable
"Assign to batches" action.

**C. Student sitting a test.**
`/student/tests` "Assigned Tests" tab reads `GET /api/v1/tests/assigned`.
`/test/[id]` is the player: `POST /attempts` (server-side access gate in
`tests/test-access.service.ts`, timer derived from `paper.duration_min`), Redis-backed
autosave via `PATCH /attempts/:id`, proctoring warnings, `POST /attempts/:id/submit`.
Submit scores every answer, updates `student_stats`, and enqueues the analysis job.

**D. Result + analysis.**
The analysis worker writes `analysis_results` and fires a `result_ready` notification
(`apps/api/src/workers/analysis.worker.ts`). `/results/[id]` polls
`GET /api/v1/analysis/:attempt_id`, which honours `papers.result_release_at`. Leaderboards
(`/rankings/paper`, `/rankings/weekly`, `/rankings/lifetime`), student dashboard metrics,
history, mistake diary and spaced revision all read from the same attempt data.

**So the spine exists.** What is missing is not a subsystem — it is a set of joints.

---

## 2. Who does what

### 2.1 The Graphite shape — an institute *with* a Test Department

| Person | Account | Signs in and lands on | Does |
|---|---|---|---|
| Institute Admin | `graphitegkp@classphere.com` | `/institute` | Batches, students, faculty, reports, billing. **Appoints the Test Head** at `/institute/test-department`. Does not run the test workspace |
| Test Head | Vandana, `vandanasingh91020@gmail.com` | `/test-department` | Everything about tests: create → review → set duration and marks → assign to batches → publish → read results |
| Student | phone + DOB | `/student/dashboard` | Sits the test, reads the result |

The Institute Admin's "Test Department" sidebar entry pointing at the **team page** is
correct and stays. The workspace is reached by the Test Head signing in with their own
Test Department credentials. That separation is already built and works.

### 2.2 The small-coaching shape — an institute *without* a Test Department

Ground research: most small local coachings have no test department and write their own
papers. They must never be forced to create a second login. So:

- The Institute Admin keeps a **Create Test** path of their own —
  "Schedule Batch Test" on `/institute` and "Create New Test" on `/institute/tests`, both
  landing on `/institute/tests/create`.
- The Institute Admin must also be able to **review and publish** what they created,
  without appointing anyone. `auth-context.tsx:189` already admits them to
  `/test-department/*`; what is missing is a link from the institute area into the review
  screen (see §3.1).

One capability set, two doors. Nothing is hidden from the Institute Admin.

---

## 3. Gap analysis

Legend: **✅ works** · **⚠️ works but wrong/incomplete** · **❌ absent**

### 3.1 Roles and reachability

| Finding | Status | Evidence |
|---|---|---|
| Test Head signs in and lands on `/test-department` | ✅ | `auth-context.tsx:74` |
| Institute sidebar "Test Department" → team page (appoint the Head) | ✅ **correct as designed** | `app/[domain]/institute/test-department/page.tsx` re-exports the team page; `Sidebar.tsx:143` |
| Institute Admin may only create a **Head** — never an Editor | ✅ **correct as designed** | `createDepartmentMember`, `test-department.controller.ts:96-101` |
| Only **one** active Head is allowed per institute; the ceiling should be **three** | ⚠️ | unique partial index `one_active_test_department_head_per_institute` (`27_test_team_and_batch_lifecycle.sql`); 409 guard at `test-department.controller.ts:113` |
| Test Editor role still exists, still issuable by the Head, and has fewer rights than the Head | ❌ **to be retired** | `TEST_EDITOR_ROLE`, `test-department.controller.ts:13, 99-101` |
| Publish / archive / restore blocked for anyone who isn't Head or Institute Admin | ⚠️ moot once Editor is gone, but the check should be simplified | `test-department.controller.ts:371` |
| Workflow forces draft → submit → approve → publish — three actions built for two people | ⚠️ | `transitions` map, `test-department.controller.ts:359` |
| "Create Test" button hidden from Institute Admin on `/test-department` | ⚠️ | `test-department/page.tsx:34` — `canOperate` excludes `institute_admin` |
| **Institute Admin has no link into the review screen** for a paper they created | ❌ | `/institute/tests` rows link to `/institute/tests/view/[id]`, which is a **preview player**, not the review workspace. Already flagged in `docs/worklog.md` |
| `/institute/tests` is not in the institute sidebar at all | ⚠️ | `Sidebar.tsx:133-146` — reachable only via the dashboard's "Schedule Batch Test", which jumps straight to `/create` |
| `/institute/tests` lists only papers where `created_by = me` | ⚠️ | `GET /tests/my` (`tests.controller.ts:591`) |
| Its Delete button calls a `super_admin`-only route | ⚠️ | `institute/tests/page.tsx:78` vs `tests.routes.ts:108` — 403 for every institute |

### 3.2 Duration and marks

| Finding | Status | Evidence |
|---|---|---|
| Duration is settable **at creation** in all three modes | ✅ | `institute/tests/create/page.tsx:692, 938, 961` |
| Duration is **not editable after creation** — no field on the review screen, and the API rejects it | ❌ | `updateReviewPaper` accepts only `marking_scheme` and `title` (`test-department.controller.ts:534-556`) |
| `total_marks` for a PDF upload is **hardcoded to 360** | ❌ | server default `total_marks = 360` (`tests.controller.ts:1138`); the form never sends it. An 80-question paper claims 360 marks while scoring yields 320 |
| The Test Head cannot enter total marks by hand anywhere | ❌ | no field on the create form, none on the review screen |
| **A PDF-uploaded paper is saved with `marking_scheme = null`** | ❌ | `uploadTestController` never sets it. Only the Superadmin bulk-upload path applies one (`superadmin.controller.ts:460`) |
| A rich marking-scheme model already exists — per question type, partial credit, per-question overrides | ✅ | `lib/marking-scheme.ts`, `components/questions/MarkingSchemeEditor.tsx` |
| `+4 / −1` is guessed as a fallback in **six** places | ❌ | `attempts.controller.ts:217, 492, 542`; `analysis-engine/services/db.service.ts:140`; `jee-analysis.service.ts:21`; `neet-analysis.service.ts:21` |
| `available_from` / `available_until` / `result_release_at` not editable post-creation | ❌ | same handler |
| Timer honours `duration_min` correctly | ✅ | `startAttempt` (`attempts.controller.ts:220`), player `test/[id]/page.tsx:178` |

### 3.3 Publishing correctness

| Finding | Status | Evidence |
|---|---|---|
| Department publish runs only a shallow per-question check (`validQuestion`), not the full validation report | ⚠️ | `test-department.controller.ts:382-389` vs the thorough `publishTest` (`tests.controller.ts:650`) |
| Department publish skips the marking-scheme guard | ⚠️ | `requiresExplicitScheme` is checked in `publishTest` only — and it returns `false` for JEE Main and NEET, so those papers publish with no scheme at all |
| `POST /tests/:id/publish` is `super_admin`-only and hard-refuses everyone else | ⚠️ | `tests.routes.ts:111`, `publishTest:655` — a dead path for institutes |
| A paper can be published with **zero batch assignments** — published but invisible | ⚠️ | publish reads assignments only to notify (`test-department.controller.ts:394`) |
| An 80-question JEE Main paper trips the pattern check as an **error** (expected 75) | ⚠️ | `paper-validation.ts:257-263` — `fromExtraction` is true for PDF papers, which escalates pattern mismatch to error. It does **not** block publish (publish only blocks on per-question errors), but the review screen shows a red failure for a deliberate 80-question paper |
| Two parallel publish paths (`/tests/*` and `/test-department/papers/*`) | ⚠️ | already noted under "Known gaps" in `docs/worklog.md` |

### 3.4 Student delivery

| Finding | Status | Evidence |
|---|---|---|
| Assigned tests reach the Tests Hub | ✅ | `GET /tests/assigned` (`tests.controller.ts:607`) — requires `is_published` + `delivery_mode = assigned_scheduled` + batch membership, all set correctly by upload |
| Upcoming Tests panel on the dashboard | ✅ | `components/dashboard/UpcomingTestsWidget.tsx`, same endpoint |
| In-app + push notification on publish | ✅ | `notifyStudents({ type: "test_published" })` (`test-department.controller.ts:404`) |
| Local reminder ~30 min before the test | ✅ | `scheduleTestReminder` (`student/tests/page.tsx:176`) |
| A late student can still sit the paper when `available_until` is null | ✅ | `test-access.service.ts:54` — only a set closing time blocks. This is what makes "no deadline for the trial paper" work with no code change |
| Cards do not know whether the student already attempted — an attempted test still shows "Start Test" | ⚠️ | `/tests/assigned` returns no attempt state; `AssignedTestCard` (`student/tests/page.tsx:383`) |
| `available_until` never shown to the student | ⚠️ | same |
| Submitted tests keep sitting in the Upcoming Tests panel | ⚠️ | `UpcomingTestsWidget.tsx:36` — no attempt filter |

### 3.5 Scoring and results

| Finding | Status | Evidence |
|---|---|---|
| Result, solutions and AI analysis | ✅ | `/results/[id]` → `GET /analysis/:attempt_id`, with retry and scheduled-release support |
| `result_ready` notification | ✅ | `workers/analysis.worker.ts:18` |
| Results appear immediately when `result_release_at` is null | ✅ | `analysis.controller.ts:27` — nothing sets it today, so immediate release is already the behaviour |
| **The paper's marking scheme is ignored at scoring time** | ❌ | `startAttempt` writes a flat `{ correct: 4, incorrect: -1 }` regardless of the paper (`attempts.controller.ts:217`); `submitAttempt` computes `maxScore` from that same flat value (`:556`). The marking-scheme editor currently changes `papers.total_marks` and nothing else |
| **The analysis engine guesses the same numbers again** | ❌ | `db.service.ts:140`, `jee-analysis.service.ts:21`, `neet-analysis.service.ts:21` |
| `student_stats` counts private practice sets as "tests taken" | ⚠️ | `submitAttempt:630` runs for every submit, including topic-practice and boosters |
| Leaderboards | ✅ | `/rankings/paper`, `/rankings/weekly`, `/rankings/lifetime` all wired to real UI |

### 3.6 Institute-side visibility — *the answer to "is this already there?"*

| Question | Answer |
|---|---|
| Can the institute see **who attended a given test and what they scored**? | **No.** No endpoint returns a per-test student roster with scores, and no screen exists |
| Is there a per-test batch analysis? | **Backend only.** `GET /api/v1/analysis/batch/:test_id/:batch_id` computes average score, topic performance, bottleneck chapters and common wrong-answer traps (`analysis-engine/services/batch-analysis.ts`). **Nothing in the frontend calls it** |
| Can the institute see a **detailed report of one student**? | **No.** `/institute/students` has a directory and a batch-enrolment-history modal (`GET /students/:id/history`) — nothing about performance |
| Is there any institute reporting at all? | **Partly, and partly fake.** `/institute/reports` renders real trend / mastery / top-bottom data from `GET /institutes/:id/reports`, but **"Recent Test Reports" is a hardcoded mock array** (`institute/reports/page.tsx:201-206`) and **"Tests Conducted" is hardcoded `0`** (`:58`). Export, bell, mail and avatar in that header are decorative |

---

## 4. Work packages

Each is independently shippable and ordered so the trial becomes possible as early as
possible. **WP-1 … WP-5 are the minimum for a usable trial.**

---

### WP-0 — Day-0 verification (no code)

Before writing anything, confirm the ground truth for Graphite:

1. **Vandana's current role.** She is a Test Editor (`test_department_member`) today. How
   many *other* active `test_department_members` rows does Graphite have? Up to three
   survive the promotion; anything beyond that gets deactivated, so confirm the list before
   the migration chooses for you.
2. `institutes.subdomain_slug` for Graphite — it is what student shadow emails are built
   from; a null slug produces `..._@unknown.classphere.com` addresses.
3. `institute_settings.custom_domain = "test.graphiteclasses.com"`, and that host pointed at
   the deployment.
4. **The two batches.** The 10 students are split across a JEE batch and a NEET batch.
   Confirm each batch's `exam` value, and how many students sit in each.
5. Both batches `is_active`, `starts_at` in the past, `ends_at` null or future. A lapsed
   window 403s every attempt (`test-access.service.ts:44`).
6. `RESEND_API_KEY` (staff invites) and Firebase push credentials configured.
7. The extraction worker and the analysis worker are actually running in the deployed
   environment.

**Consequence of #4 to plan around:** a paper can only be assigned to batches that share one
exam — `uploadTestController` refuses a mixed set ("All target batches must have the same
exam", `tests.controller.ts:1199`), and the Assign modal filters batches by the paper's exam
(`[id]/page.tsx:62`). **Graphite therefore needs two trial papers: one JEE, one NEET.** Plan
the trial as two runs of the same loop, not one.

**Deliverable:** a findings note appended to this file.

---

### WP-1 — One role: the Test Head — ✅ **implemented, migration not yet run**

*Retire the Test Editor. A Test Department is one accountable person who does everything
from creating a test to publishing it.*

**Migration — `docs/migrations/54_retire_test_editor.sql` (new)**

- **Raise the Head ceiling from one to three.** Drop the unique partial index
  `one_active_test_department_head_per_institute` and replace it with a trigger that refuses
  a fourth active Head per institute. A count limit cannot be expressed as a Postgres
  `CHECK` or unique index, so it is a `BEFORE INSERT OR UPDATE` trigger on
  `test_department_members`, backed by the same check in the API (below).
- Promote every active `test_department_member` to `test_department_head`, and set their
  `test_department_members.access_level = 'head'`.
- Where promoting would push an institute past three active Heads, keep the three earliest
  (preferring any existing Head) and deactivate the rest, exactly as migration 23 did.
  **Report the affected institutes** in the migration output rather than silently choosing.
  In practice almost every institute has one or two members, so this branch should be empty
  — but Graphite must still be checked by hand first (WP-0 #1).
- Leave the `users_role_check` constraint alone. Existing `test_department_member` rows stay
  legal; nothing issues the value again.

**API — `apps/api/src/modules/test-department/test-department.controller.ts`**

- `createDepartmentMember`: drop the `editor` branch entirely. The only account this endpoint
  creates is a Head, and only the Institute Admin may create it. Remove the
  `TEST_ADMIN_ROLE → editor` path (lines 99-101) and the `access_level` request field.
  Replace the "this institute already has a Head" 409 (line 113) with a **count check
  against a `MAX_TEST_HEADS = 3` constant**, returning a 409 that names the limit and tells
  the admin to remove an existing Head first.
- Treat any surviving `test_department_member` as a Head for permission purposes, so a
  missed row cannot lock someone out.
- `transitionReviewPaper`: remove the `isHead(req)` condition on `publish` / `archive` /
  `restore` (line 371) — it now distinguishes nothing. Keep the "department user or
  institute admin" check. Keep the `test_review_events` audit.
- **Collapse the workflow to draft → published.** Reduce the `transitions` map to
  `publish` (from `draft`, `changes_requested`, `needs_review`, `approved`, `scheduled`),
  `archive`, and `restore`. Keep `submit` / `approve` accepted by the API so no in-flight
  paper breaks, but stop surfacing them. `workflow_status` stays as a column — it still
  carries `draft`, `published` and `archived`, which the paper list filters on.

**Web**

- `app/[domain]/institute/test-department/page.tsx` — **no change.** Pointing at the team
  page is correct: this is where the Institute Admin appoints the Head.
- `app/[domain]/test-department/team/page.tsx` — remove the Editor vocabulary. A list of up
  to three Heads (peers, no hierarchy shown), or an empty state with "Appoint Test Head".
  Drop the `access_level` selector. Hide the add form and show "This institute has all 3
  Test Heads" once the limit is reached.
- `app/[domain]/test-department/page.tsx:34-38` — `canOperate` and `canManage` become
  "is a department user **or** institute admin", so the Institute Admin of a small coaching
  sees **Create Test**, archive and restore.
- `app/[domain]/test-department/[id]/page.tsx:161-164, 287-347` — one primary action,
  **Publish test**, available from `draft` onward. Delete the "Submit for review",
  "Request changes" and "Mark ready" buttons. Keep Assign to batches, Archive, Restore.
- `components/layout/Sidebar.tsx` / `MobileNav.tsx` — the Test Department nav loses its
  Head-only conditionals (`Sidebar.tsx:143-144`); every entry shows for the one role.
  Add **Tests** to the institute nav, pointing at `/institute/tests`, which is currently
  orphaned.
- `app/[domain]/institute/tests/page.tsx` — each row gets a **Review** action linking to
  `/test-department/[id]`. This is the missing door for a small coaching. Point the list at
  the institute's papers rather than `created_by = me`, and fix or remove the Delete button
  (it calls a `super_admin`-only route).

**Acceptance:**
- Vandana signs in with her existing credentials, lands on `/test-department`, and can
  create, review, edit, assign and publish a paper — one screen, one action to publish, no
  second account anywhere in the flow.
- The Institute Admin of a coaching with no Test Department can do the same thing starting
  from `/institute/tests`.
- The words "Test Editor" and "Submit for review" appear nowhere in the UI.
- An Institute Admin can appoint up to three Test Heads, and is refused a fourth with a
  message that says why.

---

### WP-2 — The Test Head enters duration and marks by hand

*No defaults, no derivation, no guessing. Whatever the paper is worth is whatever the person
holding the paper says it is worth.*

**API — `updateReviewPaper` (`test-department.controller.ts:525`)**

Widen the accepted fields from `{ title, marking_scheme }` to:

| Field | Rule |
|---|---|
| `title` | non-empty string |
| `duration_min` | integer, 1–600. **Required before publish** |
| `total_marks` | integer ≥ 0, **entered by hand**. Never auto-computed, never overwritten by a marking-scheme change. **Required before publish** |
| `marking_scheme` | `{ correct, incorrect, unattempted }`, entered by hand. **Required before publish** |
| `available_from` | ISO date-time or null |
| `available_until` | ISO date-time or null; must be after `available_from` — return 400 rather than letting the DB's `papers_release_window_check` throw a 500 |
| `result_release_at` | ISO date-time or null (null = immediate) |

**Remove the derivation at line 545-553** — today, saving a marking scheme silently
recomputes `total_marks` from it. That is exactly the automatic calculation to drop.
Instead, when the scheme and the hand-entered total disagree, **show the arithmetic as a
warning** on the review screen ("80 questions × 4 = 320, but this paper is set to 300") and
let the Head decide. Never rewrite their number.

**Bug fix — `uploadTestController` (`tests.controller.ts:1137-1138, 1577-1578`)**

- Stop defaulting `total_marks` to 360 and `duration_min` to 180. Store **null** when the
  upload form does not supply them, and let the review screen collect them.
- Make the create form's duration and marks fields optional at upload and clearly labelled
  "you can set this later during review".

**Marking scheme — remove the guessing**

- `lib/marking-scheme.ts`: `DEFAULTS` currently auto-applies `+4/−1` to NEET, JEE Main and
  JEE Main+Advanced. Demote it from "applied" to "suggested": keep the numbers, but use them
  only as **hint text in the editor** ("JEE Main is conventionally +4 / −1"), never as a
  value written to a row.
- `requiresExplicitScheme` returns true for **every** exam, so publish refuses any paper
  whose `marking_scheme` is null (see WP-3).

**Web**

- New `PaperDetailsEditor` beside `MarkingSchemeEditor` in
  `components/questions/PaperReviewWorkspace.tsx`:
  - **Duration (minutes)** — free entry, no preset.
  - **Total marks** — free entry, with a "suggested: N × marks-per-correct" hint and a
    one-click "use this" that fills the field rather than replacing it silently.
  - **Marks per correct answer** and **negative marks per wrong answer** — free entry, both
    empty by default, with the exam's conventional values shown as hint text only.
  - **Opens at / Closes at / Results visible from** — all optional; leaving "Closes at"
    empty means no deadline, and leaving "Results visible from" empty means immediate.
- Wire `onSavePaperDetails` in `app/[domain]/test-department/[id]/page.tsx` alongside the
  existing `saveMarkingScheme`.
- Show duration and marks in the Navbar subtitle so the current values are visible without
  opening the panel.
- Add an unmissable "This paper has no duration / marks / marking scheme set" banner while
  any of the three is missing.

**Acceptance:** a Head uploads a PDF that extracts 80 questions, then on the review screen
types duration = 80, total marks = 320, +4 correct, −1 wrong — or any other numbers they
like — and publishes. Nothing in the system substitutes a number they did not type. The
player's timer starts at 80:00 and the Tests Hub card reads "80 Min · 320 Marks".

---

### WP-3 — Publish becomes one trustworthy gate

- Extract the checks in `publishTest` (`tests.controller.ts:650-753`) into a shared
  `publishPaper(paperId, actor)` in a new `modules/tests/publish.service.ts`: the required
  fields, the full `validatePaperQuestions` report, per-question error listing, the `papers`
  update, the `questions` approval sweep, and the student notification.
- `transitionReviewPaper`'s `publish` branch and `POST /tests/:id/publish` both call it.
  Loosen the route's `requireRole` to the same roles as `/upload-test`.
- **Refuse publish** when any of these is true, each with a message naming the fix:
  - `duration_min` is null → "Set the test duration on the review screen."
  - `total_marks` is null → "Enter what this paper is worth."
  - `marking_scheme` is null → "Enter the marks for a correct answer and the negative marks
    for a wrong one."
  - the paper has **no `test_batch_assignments` rows** → "Assign this test to at least one
    batch." *This is the single most likely trial-day failure — published, and invisible.*
  - the validation report has per-question errors (existing behaviour).
- **On publish, backfill `available_from`** from the earliest `scheduled_at` among the
  paper's assignments when it is null, so the access gate and the student's countdown agree.
  (`test-access.service.ts:52` already falls back to the assignment, but the paper row
  should not stay blank.)
- **Pattern mismatch for deliberately custom papers.** Add `papers.is_custom_pattern`
  (boolean, default false — migration `55_custom_paper_pattern.sql`), set from the WP-2
  details panel: "This paper deliberately differs from the exam's standard pattern."
  Pass `fromExtraction && !is_custom_pattern` into `validatePaperQuestions`
  (`paper-validation.ts:244`) so an 80-question JEE-shaped paper reports a warning, not a
  red error.
- **Narrow post-publish edit:** allow `duration_min`, `available_until` and
  `result_release_at` to change on a published paper **while no attempt exists** for it.
  Everything else stays immutable.

**Acceptance:** a paper cannot go live missing its duration, its marks, its scheme or its
batch. The same validation report appears whether you press Validate or Publish.

---

### WP-4 — Student side: assigned tests that know their own state

**API — `getAssignedTests` (`tests.controller.ts:607`)**

Join the student's own attempts and return, per test: `attempt_status`
(`not_started | in_progress | submitted`), `attempt_id`, `score`, `max_score`, and pass
through `available_until`.

**Web**

- `app/[domain]/student/tests/page.tsx` — `AssignedTestCard` (line 383) grows three states:
  **Start Test** / **Resume** / **View Result**. Show the closing time when
  `available_until` is set, and a "Window closed" state once it has passed. When
  `available_until` is null — the trial setting — show no deadline at all rather than an
  empty date.
- `components/dashboard/UpcomingTestsWidget.tsx` — drop submitted tests from the panel; if a
  submitted test has a ready result, show a "Result ready" row linking to `/results/:id`.

**Acceptance:** a student who has submitted no longer sees a live "Start Test", and the
dashboard panel stops advertising a test they have finished. A student who missed the
scheduled time still sees it as startable, because the trial paper has no closing time.

---

### WP-5 — Scoring and analysis honour the Head's marks

*Without this, every number WP-2 collects is decorative.*

The `+4 / −1` guess lives in six places. All six must read the paper instead:

| File | Line | Change |
|---|---|---|
| `attempts.controller.ts` | 217 | `startAttempt` copies `papers.marking_scheme` onto the attempt |
| `attempts.controller.ts` | 492 | same for the legacy insert path |
| `attempts.controller.ts` | 542 | `submitAttempt` uses the attempt's scheme, no `??` fallback |
| `attempts.controller.ts` | 556 | `maxScore` from `totalMarksForQuestions(questions, scheme)`, not `scheme.correct × count` |
| `analysis-engine/services/db.service.ts` | 140 | drop the fallback literal |
| `jee-analysis.service.ts` / `neet-analysis.service.ts` | 21 | drop the fallback literal |

Where a scheme is genuinely absent (a legacy paper published before WP-3), fail loudly in
the logs rather than substituting numbers — WP-3 makes the case impossible for new papers.

Also: exclude `booster` and `topic-practice` papers from the `student_stats` update
(`:630`) so "Tests Taken" means institute tests.

**Acceptance:** `paper.total_marks`, `attempt.max_score` and the figure on the result screen
are the same number, and that number is the one the Test Head typed.

---

### WP-6 — The institute sees the result of a test

**API — new, in `test-department.controller.ts` (institute-scoped, same ownership check)**

- `GET /api/v1/test-department/papers/:id/results`
  For every student in every batch the paper is assigned to:
  `student_id, name, phone, batch_name, status (attempted | absent | in_progress),
  score, max_score, percentage, correct, incorrect, unattempted, time_taken_sec,
  submitted_at, rank_in_batch`.
  Built from `test_batch_assignments` → `batch_students` → `users` left-joined onto
  `attempts` + aggregated `attempt_answers`, so **non-attempters appear as rows** — which is
  the whole point of an attendance view.
  Plus a summary: `assigned, attempted, absent, avg_score, avg_percentage, highest, lowest`.
- `GET /api/v1/test-department/papers/:id/results.csv` — the same data, downloadable.
- Reuse the existing `GET /api/v1/analysis/batch/:test_id/:batch_id` for topic performance,
  bottleneck chapters and common wrong-answer traps. It is already written; it has simply
  never had a caller.

**Web — new page `app/[domain]/test-department/[id]/results/page.tsx`**

Tabs: **Scoreboard** (sortable table + Export CSV) · **Attendance** (attempted vs absent) ·
**Question analysis** (from the batch endpoint). Add a "Results" action to the paper card in
`/test-department` for published papers, to the review screen's action bar, and to the
`/institute/tests` row, so both doors reach it.

**Web — repairs to `/institute/reports`**

- Replace the hardcoded `RecentTestReports` array (`page.tsx:201-206`) with real recent
  papers plus attempt aggregates.
- Replace `testsCount: 0` (`:58`) with a real count.
- Implement the Export button or remove it; remove the decorative bell, mail and "AA" avatar.

**Acceptance:** the moment a student submits, the institute can open the test and see that
student's name, score and percentage — and see which of the 10 have not appeared.

---

### WP-7 — The institute sees one student in detail

*This does **not** exist today, in any form.*

- `GET /api/v1/students/:id/report` (institute-scoped) — profile, batch, every submitted
  attempt with score / percentage / date, subject-wise accuracy, chapter strengths and
  weaknesses, trend over time, and the mistake-type breakdown that `analysis_results`
  already stores per attempt.
- New page `app/[domain]/institute/students/[id]/page.tsx`, reachable from the student row
  in `/institute/students`. Reuse the chart components in `components/institute/` and
  `components/analytics/`.

---

### WP-8 — Dashboard and leaderboard wiring (verification + polish)

Mostly verification — these are already connected.

- Confirm `student_stats`, `/dashboard/student`, `/student/analytics`, `/student/history`
  and the mistake diary all move after a trial submission.
- Confirm `/rankings/paper?batch_id=&paper_id=` returns the trial paper, and that
  `LeaderboardWidget` picks it up. Note the leaderboard is **per batch**, so the JEE and
  NEET trial papers produce two separate boards — which is correct.
- Institute dashboard (`/institute`): add a "Recent test results" card linking into WP-6,
  and replace the hardcoded `+12 this month` / `+2 completing soon` badges
  (`institute/page.tsx:117, 124`) with real values or nothing.

---

### WP-9 — Trial hardening (before the students sit)

- **Two papers, two exams.** Per WP-0 #4, plan one JEE paper and one NEET paper.
- **Trial settings:** `available_until` null (no deadline), `result_release_at` null
  (immediate results). Both are the defaults — just do not set them.
- **Rehearsal.** Run the entire loop with two throwaway student accounts on the real
  Graphite tenant before the real students are told.
- **Workers.** Confirm the extraction and analysis workers plus Redis are running in the
  deployed environment. A dead analysis worker leaves every result at "pending" forever, and
  the only recovery in the UI is the student's own retry button.
- **Support path.** `/help` and `/institute/support` exist; confirm they route somewhere a
  human reads during the trial window.

---

## 5. Sequencing

| Milestone | Packages | Outcome |
|---|---|---|
| **M1 — Vandana can ship a test alone** | WP-0, WP-1, WP-2 | One role, one workspace, create → review → set duration and marks by hand → publish |
| **M2 — Students can sit it correctly** | WP-3, WP-4, WP-5 | Publish is safe, cards know their state, the marks are the Head's marks |
| **M3 — The institute can see the outcome** | WP-6 | Attendance + scoreboard + question analysis |
| **M4 — Depth** | WP-7, WP-8 | Per-student reports, dashboard truthfulness |
| **M5 — Trial run** | WP-9 | Rehearsal, then the real thing |

M1 + M2 is the honest minimum for a credible trial. M3 is what makes the institute say yes.

---

## 6. Decisions — resolved

| # | Question | Answer |
|---|---|---|
| 1 | Who runs the Test Department at Graphite? | **Vandana, as Test Head**, signing in with her existing credentials. She is a Test Editor today and is promoted by WP-1's migration. Graphite's Institute Admin is a separate account, `graphitegkp@classphere.com`, whose only job in this area is appointing Heads |
| 1b | How many Test Heads may an institute have? | **Up to three**, as peers with identical permissions. WP-1 replaces the one-Head unique index with a count limit |
| 2 | Keep or delete the two-step review workflow? | **Delete it.** See the explainer below |
| 3 | Marks and duration | **Entered by hand by the Test Head, every time.** Marks per correct answer, negative marks per wrong answer, total marks, and duration. No defaults written, no automatic calculation, no `+4` assumed |
| 4 | Result release | **Immediate on submission.** Leave `result_release_at` null |
| 5 | Late attempts | **Allowed, with no deadline, for trial papers.** Leave `available_until` null. Already works — `test-access.service.ts:54` only blocks when a closing time is set. The per-attempt timer still runs once the student starts |

### 6.1 What decision 2 actually meant

This is the thing that wasn't clear, so from the beginning.

**What a "workflow" is here.** Every paper row carries a column called `workflow_status`.
It is a label saying where the paper is in its life. The allowed labels are:

```
draft → needs_review → changes_requested → approved → scheduled → published → archived
```

**Why it was built that way.** The original design assumed a Test Department of two kinds of
people. A **Test Editor** prepares the paper — uploads the PDF, fixes the questions the
extractor read wrong — and then presses **"Submit for review"**, which moves the paper from
`draft` to `needs_review`. That is the editor saying *"I'm done, someone check me."* Then
the **Test Head** opens it and either presses **"Request changes"** (`changes_requested`,
back to the editor) or **"Mark ready"** (`approved`). Only after `approved` does the
**"Publish"** button even appear. Four buttons, deliberately split between two people, so
that nobody publishes their own unchecked work.

**Why it stopped making sense.** You have decided there is only one person: the Test Head,
who does everything from creating to publishing. When one person holds all four buttons, the
sequence stops being a safety check and becomes three extra clicks that mean nothing —
Vandana submits a paper to herself, reviews her own submission, approves herself, and then
publishes. The middle two states record no real event.

**So the question was:** now that one person does everything, what happens to those middle
steps?

- **Option A — keep them but hide them.** Leave the buttons in the code, hidden behind an
  "advanced" toggle, so a large coaching that *does* have a checker could switch them back on
  later.
- **Option B — delete them from the product.** One button, **Publish**, straight from
  `draft`. The paper's life becomes `draft → published → archived`.

**Your answer chose B**, and WP-1 is written for it: the buttons come out of the UI, the
transition map shrinks to publish/archive/restore, and `workflow_status` survives as a
column because `draft`, `published` and `archived` are still real and still filter the paper
list. The API keeps quietly accepting the old `submit`/`approve` actions purely so that any
paper currently sitting in `needs_review` does not get stranded — no screen offers them.

---

## 7. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Published test with no batch assignment | Students never see it; looks like the product is broken | WP-3 guard |
| An institute has more than three active department members | The promotion migration must deactivate the surplus | WP-1's migration keeps the three earliest and reports the rest; WP-0 #1 — check Graphite by hand first |
| Mixed-exam batches | A single paper cannot serve both the JEE and NEET students | WP-0 #4 — plan two papers |
| Extraction misses questions from the PDF | Paper is short; the pattern check flags it as an error | The review screen already reports completeness; WP-3's custom-pattern flag stops the false alarm |
| Analysis worker not running in production | Every result stuck at "pending" | WP-9; the student's retry button is the only current fallback |
| Marking scheme entered but scoring unchanged | The institute loses trust in every number | WP-5 — all six guess sites |
| Batch lifecycle window lapsed | Every attempt 403s with "batch is no longer active" | WP-0 #5 |
| Two API families (`/tests/*` and `/test-department/papers/*`) drift again | Role gaps reappear | WP-3 collapses the publish path; treat `test-department` as the institute-facing family and `/tests` as the superadmin/global one |

---

## 8. Files this plan touches

**Migrations (new)**
- `docs/migrations/54_retire_test_editor.sql` — WP-1
- `docs/migrations/55_custom_paper_pattern.sql` — WP-3

**API**
- `modules/test-department/test-department.controller.ts` — WP-1, WP-2, WP-3, WP-6
- `modules/test-department/test-department.routes.ts` — WP-6
- `modules/tests/tests.controller.ts` — WP-2 (stop defaulting marks/duration), WP-4
- `modules/tests/tests.routes.ts` — WP-3
- `modules/tests/publish.service.ts` — **new**, WP-3
- `modules/attempts/attempts.controller.ts` — WP-5
- `modules/analysis-engine/services/db.service.ts` · `jee-analysis.service.ts` ·
  `neet-analysis.service.ts` — WP-5
- `modules/institutes/students/students.controller.ts` + routes — WP-7
- `modules/institutes/institutes.controller.ts` — WP-6 (reports repair)
- `lib/marking-scheme.ts` — WP-2 (defaults become hints)
- `lib/paper-validation.ts` — WP-3 (custom-pattern flag)

**Web**
- `app/[domain]/test-department/page.tsx` · `[id]/page.tsx` · `team/page.tsx` — WP-1, WP-2
- `app/[domain]/test-department/[id]/results/page.tsx` — **new**, WP-6
- `app/[domain]/institute/tests/page.tsx` — WP-1 (Review link, sidebar entry, list source)
- `app/[domain]/institute/tests/create/page.tsx` — WP-2
- `app/[domain]/institute/reports/page.tsx` — WP-6
- `app/[domain]/institute/students/[id]/page.tsx` — **new**, WP-7
- `app/[domain]/institute/page.tsx` — WP-8
- `app/[domain]/student/tests/page.tsx` — WP-4
- `components/questions/PaperReviewWorkspace.tsx` (+ `PaperDetailsEditor.tsx` **new**) ·
  `MarkingSchemeEditor.tsx` — WP-2
- `components/dashboard/UpcomingTestsWidget.tsx` — WP-4
- `components/layout/Sidebar.tsx` · `MobileNav.tsx` — WP-1

*Unchanged on purpose:* `app/[domain]/institute/test-department/page.tsx` keeps re-exporting
the team page. The Institute Admin appoints the Head there; the Head reaches the workspace
through their own login.

---

## WP-0 findings — checked 17 Aug 2026

Three read-only queries run against the live Supabase project.

**Domain — ✅ clean.** `subdomain_slug = graphitegkp`, `custom_domain = test.graphiteclasses.com`.
Not null, so shadow student emails resolve to `..._@graphitegkp.classphere.com`, not `unknown`.

**Batches — ✅ clean.** Two active batches: `JEE 2027` (`jee-main-advanced`, 4 students) and
`NEET 2027` (`neet-ug`, 6 students) — 10 students total, split as expected. Both `is_active`,
`starts_at` null (no lower bound), `ends_at` in 2027 (well in the future). Two older inactive
`neet-ug` batches exist with 0 students each — harmless duplicates, excluded by every query
that filters on `is_active`.

**Test Department accounts — ⚠️ not what the plan assumed.** Two **active** accounts, not one:

| Name | Email | Role today | Access level |
|---|---|---|---|
| Satyam Srivastava | satyam.1704@gmail.com | `test_department_head` | head |
| Vandana Singh | vandanasingh91020@gmail.com | `test_department_member` | editor |

The plan (§6, decision 1) was written assuming Vandana alone runs the department. Satyam is
already the active Head. Migration 54 promotes *every* active member to Head — with only two
people, both fit under the 3-Head cap, so **nothing gets deactivated**; Satyam stays Head,
Vandana also becomes Head, and they become peers with identical publish rights over Graphite.
The migration is safe to run either way — but who ends up with publish access is a decision,
not a fact the migration should resolve on its own. See the open question below.

**Not checked yet (not visible from SQL):** `RESEND_API_KEY`, Firebase push credentials, and
whether the extraction/analysis workers are actually running in the deployed environment —
these are environment/infra checks, not database checks.

---

*Revision 3 — 15 Aug 2026. Update the WP-0 findings section before running WP-1's migration.*
