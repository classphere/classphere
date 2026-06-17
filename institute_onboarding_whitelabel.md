# Institute Onboarding & White-Labeling Strategy

**Author:** Engineering Team
**Status:** Architecture Blueprint
**Goal:** To provide coaching institutes with a 100% white-labeled, premium branded experience while maintaining a single multi-tenant codebase on our end.

---

## 1. The "White-Label" Philosophy
When an institute pays for ExamPrep, they are not buying a subscription to our brand; they are renting an engine to power *their* brand. The student must feel they are using a bespoke application built by their coaching institute.

**How we achieve this technically:**
*   **Subdomain/Domain Routing:** Every institute gets a dedicated subdomain (e.g., `vidyamandir.examprep.com`) instantly. For a more premium tier, we map their **Custom Domain** (e.g., `tests.vidyamandir.com`).
*   **Dynamic Theming:** Our Next.js frontend checks the host URL on load. It queries the database for the `Institute` profile and dynamically injects:
    *   The Institute's Logo (replaces ExamPrep logo).
    *   The Institute's Primary Brand Colors (overrides default CSS variables like `--primary-color`).
    *   The Institute's Name in all automated emails, WhatsApp messages, and PDF reports.
*   **App Experience (PWA):** Instead of building 100 different apps for the App Store (which Apple often rejects), we use **Progressive Web App (PWA)** technology. When a student visits the site on their phone, they are prompted to "Add to Home Screen". It installs an icon (the institute's logo) on their phone and opens in full-screen without a browser bar, feeling exactly like a native app.
*   **Invisible Infrastructure:** ExamPrep branding is completely removed from the student and teacher portals.

---

## 2. Multi-Tenancy Architecture (How Data is Isolated)
To manage 10s or 100s of institutes efficiently, we do **not** spin up separate servers or databases for each institute. We use a **Single Database, Multi-Tenant Architecture**.

Every core table in our PostgreSQL database (`users`, `batches`, `tests`, `attempts`) has an `institute_id` column. 

**Security & Isolation:**
We use **Supabase Row Level Security (RLS)**. Even if a bug exists in our API code, the database itself will physically block a student from Institute A from querying data belonging to Institute B, because the database enforces `WHERE institute_id = auth.jwt().institute_id`.

---

## 3. The Onboarding Timeline (Total Time: ~24 to 48 Hours)

Because of the multi-tenant architecture, onboarding a new institute is incredibly fast. We do not need to write new code or deploy new servers. 

### Phase 1: Provisioning (Day 1)
1.  **Contract Signed.**
2.  **Super Admin Action:** Our team logs into the Super Admin dashboard and clicks "Add Institute".
3.  **Data Entry:** We input the Institute Name, upload their Logo, select their Brand Color, and choose their Subdomain slug (e.g., `allen`).
4.  **DNS Magic:** Vercel automatically handles the subdomain routing and SSL certificate generation instantly.
5.  **Result:** Within 10 minutes, `allen.examprep.com` is live and showing their logo on the login screen.

### Phase 2: Admin & Teacher Setup (Day 1 - Day 2)
1.  **Admin Creation:** The Super Admin creates the primary "Institute Admin" account and sends the credentials to the institute's director.
2.  **Teacher Invite:** The Institute Admin logs into their new portal and can either:
    *   Bulk upload a CSV of teacher emails.
    *   Generate a "Teacher Invite Link" and drop it in their staff WhatsApp group.
3.  **Result:** Teachers click the link, set their passwords, and are instantly assigned the `teacher` role tied to that specific `institute_id`.

### Phase 3: Student Onboarding & Batch Creation (Day 2)
1.  **Batch Creation:** The Institute Admin or Teachers create Batches (e.g., "JEE Target 2026 - Morning").
2.  **Student Import:** 
    *   *Method A (Seamless):* The institute uploads an Excel sheet of 500 students. Our system auto-creates accounts and sends a branded welcome email/SMS: *"Welcome to Allen Test Portal. Click here to set your password."*
    *   *Method B (Self-Serve):* The teacher generates a 6-digit **Batch Invite Code** (e.g., `XJ9-K2M`) and writes it on the whiteboard in the physical classroom. Students go to the custom URL, create an account, enter the code, and are locked into that institute and batch.

---

## 4. User Login Flows

How does the system ensure a student logs into *their* specific institute out of the dozens we host?

### Scenario 1: Logging in via Subdomain
1.  Student navigates to `vidyamandir.examprep.com`.
2.  The Next.js app reads the `vidyamandir` subdomain, fetches the Institute ID for Vidyamandir, and styles the login page with their branding.
3.  The student enters Email and Password.
4.  The backend authenticates the user. Since the user was created under Vidyamandir (via CSV or Invite Code), their database record has `institute_id: 'vidya-123'`. 
5.  The system issues a JWT token containing this `institute_id`. The student is now securely sandboxed into the Vidyamandir ecosystem.

### Scenario 2: A Student tries to log into the wrong subdomain
1.  A Vidyamandir student accidentally goes to `aakash.examprep.com`.
2.  They try to log in.
3.  The backend checks the database. It sees the user belongs to `institute_id: 'vidya-123'`, but the current portal is requesting access for `institute_id: 'aakash-456'`.
4.  **Action:** The backend rejects the login with a polite error: *"This account belongs to a different institute. Please log in at vidyamandir.examprep.com."*

### Scenario 3: Super Admin Login
1.  Our internal team goes to the root domain `admin.examprep.com`.
2.  We log in. Our JWT token has `role: 'super_admin'`.
3.  The system bypasses the `institute_id` locks for us, allowing us to view metrics across all 10s of institutes globally to provide support and billing management.

---

## 5. Summary of Deliverables to the Institute
When we pitch and close an institute, here is exactly what they receive within 48 hours:

1.  A dedicated, SSL-secured URL (e.g., `tests.theirbrand.com`).
2.  A login portal completely skinned with their logo and primary brand colors.
3.  1x Institute Admin Account.
4.  Unlimited Teacher Accounts (invited via link).
5.  A ready-to-use CSV upload tool for their student roster.
6.  PDF analytics reports generated with their institute header and logo.

This process is highly scalable, fully automated once the first step is taken by our Super Admin, and provides massive perceived value to the client by making them feel they own a proprietary, bespoke piece of enterprise software.
