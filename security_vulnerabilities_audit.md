# Security Vulnerabilities & Threat Model Audit

**Author:** Engineering Team
**Status:** Architecture Blueprint (Security Guidelines)
**Goal:** To document every potential security vulnerability specific to the ExamPrep platform's architecture and define the mandatory mitigation strategies for the development team.

---

## 1. Authentication & Authorization (Access Control)

### 1.1 Insecure Direct Object Reference (IDOR)
*   **The Threat:** A student logs in, views their result at `GET /api/v1/analysis/attempt-123`, and manually changes the URL to `attempt-124` to view another student's detailed performance, score, and mistakes.
*   **Mitigation:** 
    *   **Backend Middleware:** Every endpoint must verify ownership. The API must check: `SELECT 1 FROM attempts WHERE id = '124' AND student_id = req.user.id`.
    *   **Supabase RLS:** Enforce Row Level Security on the database: `CREATE POLICY "Students can only read their own attempts" ON attempts FOR SELECT USING (auth.uid() = student_id);`.

### 1.2 Cross-Tenant Data Leakage (Multi-Tenancy Breach)
*   **The Threat:** An institute admin or student from Institute A modifies API requests to fetch batches, tests, or analytics belonging to Institute B.
*   **Mitigation:** 
    *   Every user session must contain the `institute_id` in the secure JWT token.
    *   All database queries must inherently append `WHERE institute_id = req.user.institute_id`.
    *   Strict Supabase RLS policies ensuring no cross-institute data fetching is possible at the database engine level.

### 1.3 Privilege Escalation
*   **The Threat:** A student intercepts an API request like `PATCH /api/v1/users/me` and injects `{"role": "teacher"}` or `{"role": "super_admin"}` into the JSON payload to gain admin privileges.
*   **Mitigation:** 
    *   **Strict Zod Validation:** The backend must explicitly strip unpermitted fields. `z.object({ name: z.string() }).strict()` ensures any extra fields like `role` throw an error or are ignored.
    *   Role changes should only be allowed via dedicated admin-only endpoints.

### 1.4 Cross-Site Scripting (XSS) & Token Theft
*   **The Threat:** Storing the authentication JWT in `localStorage` allows any malicious JavaScript (perhaps injected via a forum post or profile name) to steal the student's session token.
*   **Mitigation:**
    *   **Never store JWTs in `localStorage`.** Use `httpOnly`, `Secure`, `SameSite=Strict` cookies. This makes it impossible for JavaScript to access the token.
    *   Sanitize all user inputs (especially text areas like "Doubt descriptions") using a library like DOMPurify before rendering them on the frontend.

---

## 2. Test Engine & Anti-Cheating Exploits

### 2.1 Answer Key Payload Leakage
*   **The Threat:** When the frontend requests the test questions (`GET /api/tests/555`), the backend accidentally includes the `correct_answer` field in the JSON payload. Tech-savvy students open Chrome Developer Tools, inspect the network tab, and see all the answers before starting.
*   **Mitigation:**
    *   **Data Serialization:** The backend must actively strip out `correct_answer`, `distractor_map`, and `explanation` fields before returning the question payload to students. 
    *   These fields are only retrieved during the server-side scoring phase.

### 2.2 Client-Side Time Manipulation
*   **The Threat:** A student modifies the React state or JavaScript execution time to pause the test timer, giving themselves 5 hours for a 3-hour exam.
*   **Mitigation:**
    *   **Never trust the client timer.** The frontend timer is purely cosmetic.
    *   The backend records the exact `start_time` when the attempt is created. 
    *   When the student submits, the backend verifies: `current_time - start_time <= allowed_duration + grace_period (e.g., 2 mins)`. If it exceeds this, the test is auto-rejected or marked with a severe time penalty.

### 2.3 Race Conditions (Double Submissions)
*   **The Threat:** A student clicks the "Submit Test" button 10 times really fast while on a slow network. The backend processes 10 submissions, corrupting the database, creating 10 analysis jobs, and ruining the batch average.
*   **Mitigation:**
    *   **Frontend:** Disable the submit button immediately upon click.
    *   **Backend (Idempotency):** Check the attempt status before processing: `IF status == 'submitted' THEN return 400 'Already submitted'`. 
    *   Use database transactions to ensure the status update and submission lock happen atomically.

### 2.4 Exam Window Bypass
*   **The Threat:** An institute schedules a mock test for Sunday at 10:00 AM. A student figures out the API endpoint and submits answers at Saturday 9:00 PM.
*   **Mitigation:**
    *   The `GET /api/tests/:id` and `POST /attempts/:id/submit` endpoints must strictly validate `current_time` against `test.start_time` and `test.end_time`. Access outside this window returns a `403 Forbidden`.

---

## 3. Infrastructure & API Abuse

### 3.1 Rate Limiting & Denial of Service (DDoS)
*   **The Threat:** A malicious user or bot sends 10,000 requests per second to the `/api/v1/auth/login` or `/api/v1/attempts/autosave` endpoints, crashing the server or exhausting database connections.
*   **Mitigation:**
    *   **Edge Protection:** Cloudflare WAF to absorb massive volumetric attacks.
    *   **Application Limits:** Implement Redis-based rate limiting (e.g., `express-rate-limit`). 
        *   Login: Max 5 attempts per IP per 15 minutes.
        *   Autosave: Max 5 requests per minute.
        *   Standard API: Max 300 requests per minute.

### 3.2 SQL / NoSQL Injection
*   **The Threat:** Passing malformed SQL strings into search bars or form inputs to drop tables or bypass authentication (e.g., `' OR 1=1 --`).
*   **Mitigation:**
    *   Use an ORM (Prisma) or parameterized queries (Supabase client) for all database interactions. **Never** manually concatenate strings into SQL queries.
    *   Zod validation ensures strings don't contain unexpected structural anomalies before they ever reach the DB layer.

### 3.3 Mass Assignment
*   **The Threat:** An attacker realizes they can update their user profile via `PATCH /users/me`. They send a payload containing hidden database columns they want to change, like `{"name": "Rahul", "subscription_tier": "enterprise", "wallet_balance": 9999}`.
*   **Mitigation:**
    *   Explicitly map and destructure only the allowed fields in the controller: `const { name, avatar_url } = req.body;`. Do not pass the entire `req.body` object into the database update function.

---

## 4. Development & Testing Mandates

To ensure these vulnerabilities never make it to production, the development team must adhere to the following:

1.  **Zod Everywhere:** No API route can execute business logic without the request `body`, `query`, and `params` passing through a strict Zod schema definition.
2.  **RLS as a Safety Net:** Backend code bugs happen. Supabase RLS must be written so that even if the Node.js API is fully compromised, the database refuses to serve unauthorized data.
3.  **Assume the Client is Malicious:** Never trust data coming from the frontend (timers, scores, role assignments, ownership claims). The backend must recalculate and verify everything.
