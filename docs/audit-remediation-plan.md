# Security and Reliability Remediation Plan

**Status:** approved scope for implementation  
**Source:** application audit, 18 July 2026

This plan records the remediation scope agreed with the product owner. Items are ordered to protect production data, tenant isolation, and authentication before operational and user-experience improvements.

## Explicit decisions

| Area | Decision |
| --- | --- |
| Extractor API keys committed in source control | Deliberate; do not remove or rotate as part of this work. |
| Student password derived from date of birth | Deliberate product policy; do not change as part of this work. |
| Markdown and TeX support | Must remain available. Secure the rendering boundary without removing Markdown or mathematical notation. |
| Invite feature | Remove the non-functional frontend feature and its reachable UI/routes. |

## Phase 1 — Production safety and tenant isolation

### 1. Run PDF extraction safely in the production image

- Install the required Python runtime and extraction dependencies in the API production image, or package the extractor in a dedicated worker image.
- Copy extractor scripts and required resources into the runtime image.
- Add a startup/readiness validation that fails clearly when the extractor runtime is unavailable.
- Move extraction from request-process blocking work to a bounded background worker/child process flow.
- Validate and whitelist PDF page-range input; never concatenate it into a shell command.
- Resolve image placeholders only within an approved extraction directory; reject absolute paths and traversal sequences.

**Acceptance criteria:** a deployed container can extract a valid PDF; invalid page ranges and placeholder paths return validation errors; large extractions do not block unrelated API requests.

### 2. Make configuration loading deterministic

- Load and validate environment variables before any module creates a Supabase client or reads configuration.
- Fail startup with actionable messages for missing required production configuration.
- Ensure server and worker processes follow the same bootstrap sequence.

**Acceptance criteria:** no client is initialized with empty/stale environment values, regardless of module import order.

### 3. Correct test attempts, assignment enforcement, and concurrent submission

- Correct multi-select / multiple-correct scoring according to the configured marking rules.
- Make final answer persistence and score calculation atomic with a transaction or an optimistic concurrency/version check.
- Make submission idempotent and reject writes after a completed submission.
- Enforce that an attempt targets a paper assigned to the student and a batch belonging to that student's institute.
- Enforce tenant and role ownership for staff test-material reads, DPP actions, and student-attempt reads.
- Enforce institute suspension centrally for authenticated API access (with only deliberately exempt routes, if any).

**Acceptance criteria:** simultaneous submit requests cannot create divergent answer/score state; unauthorised paper, batch, cross-tenant, or suspended-institute requests are rejected; legitimate assigned attempts still work.

### 4. Protect authentication and account provisioning

- Use a request-scoped Supabase auth client; do not mutate or reuse shared authentication context between requests.
- Treat sign-up and profile provisioning as one recoverable workflow: do not report success until provisioning succeeds, and compensate/record recoverable failures.
- Remove faculty credentials from logs and development fallbacks; replace with a non-sensitive delivery status and an administrator recovery path.
- Fix phone-based tenant resolution so a valid user can resolve their own institute without an incorrect pre-auth tenant rejection.
- Send the required one-device session header from every protected frontend API call.

**Acceptance criteria:** sign-up cannot silently leave an unusable account; no password is logged; concurrent requests cannot borrow another user's session; valid phone login succeeds; protected calls satisfy device-session policy.

### 5. Secure content rendering and query construction

- Sanitize rendered Markdown with a maintained allowlist before insertion into the DOM.
- Configure TeX rendering to disallow unsafe HTML/URL constructs while preserving supported mathematics.
- Replace raw PostgreSQL/Supabase filter-string construction from domains with validated values and parameterized/equivalent query APIs.

**Acceptance criteria:** common Markdown and TeX render correctly; script/URL/event-handler payloads cannot execute; hostile domain/filter input cannot alter the query.

## Phase 2 — Data exposure and scalable operations

### 6. Restrict rankings and storage behaviour

- Scope leaderboard and ranking queries to the current institute, authorised cohort, and applicable paper.
- Replace per-member attempt reads with set-based/aggregated queries and appropriate indexes.
- Require object storage (R2) configuration for production uploads; return a clear configuration error rather than embedding unbounded data URLs.

**Acceptance criteria:** a user cannot observe another tenant's leaderboard data; ranking query count does not grow linearly per student; missing object storage is visible and bounded.

### 7. Bound imports and analysis polling

- Change bulk student import to validated, chunked/concurrent batches with a configured maximum file/row count and clear partial-failure reporting.
- Cancel, serialize, or version analysis polling requests so earlier responses cannot overwrite newer results and polling cannot accumulate.

**Acceptance criteria:** oversized imports are rejected before exhaustion; normal imports complete in batches; analysis view only shows the newest request's result.

## Phase 3 — Product correctness and cleanup

### 8. Fix question-upload navigation

- Replace the post-upload redirect to the non-existent `/tests` route with the existing Superadmin questions/papers destination.

**Acceptance criteria:** a successful upload lands on a valid page and exposes the created content.

### 9. Implement or remove the scheduled job's success path

- Implement the scheduled job's advertised work, observability, and failure reporting; otherwise return an explicit not-implemented/disabled state rather than success.

**Acceptance criteria:** a 2xx job response means work was actually performed, with auditable result counts.

### 10. Repair frontend provider composition and remove invites

- Move the tenant provider above every consumer in the application tree.
- Remove the retired invite page, navigation entry points, and any dead route/API references that only existed for the feature.

**Acceptance criteria:** tenant context is available on first render; no user-facing invite feature or dead invite navigation remains.

## Implementation safeguards

- Preserve all unrelated existing worktree changes.
- Add authorization regression tests for every fixed cross-tenant route.
- Add race tests for attempt answer/submission writes.
- Run API and web typechecks/builds after each cohesive phase.
- Add migrations only when schema constraints/indexes are required; make them safe for already-provisioned environments.
- Do not log secrets, tokens, passwords, answer keys, or raw personal data in new diagnostics.

## Suggested delivery order

1. Configuration bootstrap, request-scoped auth, suspension enforcement, and core authorization helpers.
2. Attempt transaction/scoring/assignment enforcement with tests and any supporting migration.
3. PDF runtime, isolation, input validation, and asynchronous processing.
4. XSS/query hardening and credential-log removal.
5. Rankings/imports/polling/storage handling, then redirects, job behaviour, provider composition, and invite cleanup.
