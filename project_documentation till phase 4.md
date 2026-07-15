# Classphere: Project Architecture & Implementation Documentation

This document serves as a comprehensive record of the architecture, features, and implementation steps completed during Phases 1 through 4 of the Classphere build. It details how the platform was structured, the database schemas created, the core logic implemented, and considerations for future scaling.

---

## 1. Phase 1: Core Architecture & Multi-Tenant Foundations

**Objective:** Establish a robust foundation for a multi-tenant B2B SaaS platform capable of serving large Indian coaching institutes (e.g., Allen, Aakash) using either custom domains or subdomains.

### Implementation Details:
- **Tenant Resolution Strategy**: Implemented logic to resolve the active institute based on the hostname. If a user visits `learn.allen.ac.in` (custom domain) or `aakash.classphere.com` (subdomain), the application queries the backend to identify the tenant and load their specific branding and configuration.
- **Authentication & Authorization**: 
  - Created a robust `AuthContext` to manage the session state.
  - Implemented Role-Based Access Control (RBAC) middleware in Express. Roles include: `super_admin`, `institute_admin`, `teacher`, and `student`.
- **UI Architecture**: Adopted a premium, "Core 2.0" design system leveraging glassmorphism, dynamic animations, and dark/light themes to ensure the platform feels modern and state-of-the-art.

---

## 2. Phase 2: Database Schemas & Data Modeling

**Objective:** Design a scalable relational database schema in Supabase to support the complex relationships between institutes, users, tests, and analytics.

### Implementation Details:
- **Tenancy Isolation**: Added `institute_id` as a foreign key on almost all operational tables, enforcing data isolation between different coaching centers.
- **Core Tables Created**:
  - `institutes`: Stores tenant metadata, branding colors, logos, and billing plan information (`pro`, `enterprise`).
  - `users`: Extending standard auth with RBAC roles and `institute_id`.
  - `batches`: Represents a classroom/section of students.
  - `questions`: A comprehensive schema supporting various question types (e.g., `mcq_single`, `integer`), including fields for `distractor_map`, `correct_answer`, `difficulty`, `chapter`, and `topic`.
  - `tests` & `test_attempts`: Designed to store not just final scores, but granular data like time spent per question and specific distractors chosen, enabling deep analytics.
- **Row Level Security (RLS)**: Configured RLS policies to ensure that Institute Admins can only query data belonging to their `institute_id`, while Super Admins bypass these restrictions for global views.

---

## 3. Phase 3: Core Execution & Analysis Engine

**Objective:** Build the core academic features, including test taking, question curation, and deep analytical processing for students and batches.

### Implementation Details:
- **Question Bank CMS**: Developed an ingestion engine (`POST /api/v1/superadmin/upload-questions`) capable of parsing complex JSON structures (like JEE Main papers) and mapping them cleanly into the `questions` table with full metadata.
- **Student Analytics (`POST /api/v1/analysis/student/:id`)**:
  - Calculates accuracy, average time per question, and categorizes strengths/weaknesses based on chapter performance.
  - Maps common mistakes using the `distractor_map` to provide actionable feedback.
- **Batch Analysis (`POST /api/v1/analysis/batch/:id`)**:
  - Aggregates the performance of all students within a batch to generate chapter heatmaps, score distributions, and AI-driven teacher recommendations.
- **Scaling Considerations & Future Optimizations (Batch Delays)**:
  - **The Problem**: When a batch contains thousands of students, running heavy aggregation queries inline during an HTTP request will cause severe latency and potential timeouts.
  - **The Solution**: 
    1. **Asynchronous Processing**: Transition the batch analysis to run asynchronously. The API will immediately return a `202 Accepted` status with a "Processing" state.
    2. **Background Workers (Cron Jobs/Message Queues)**: Utilize a message broker (like Redis + BullMQ) or scheduled Cron jobs to pick up these analysis tasks in the background. The worker will chunk the aggregation, calculate the heatmaps, and persist the final results into a cached `batch_analysis_reports` table.
    3. **Client Polling/WebSockets**: The frontend will poll the status endpoint or listen via WebSockets. Once the background job completes, the UI instantly renders the deep analytics without freezing the browser.

---

## 4. Phase 4: Global Operations & Super Admin

**Objective:** Empower the Classphere platform owners with tools to monitor platform health, manage billing, and provide customer support to tenant institutes.

### Implementation Details:
- **Support Ticketing System**:
  - Added the `support_tickets` table to the database schema.
  - Built Institute-facing API routes (`POST /api/v1/support/tickets`) allowing Institute Admins to generate tickets for technical support or billing upgrades. Priority is automatically assigned based on the issue type.
  - Built Super Admin routes (`GET /api/v1/superadmin/tickets`) to pull a global feed of all open escalations across all institutes.
  - Wired both the Institute Admin UI and the Super Admin UI to dynamically fetch and post to these endpoints, entirely removing placeholder mock data.
- **Revenue Analytics & MRR**:
  - Integrated the `institute_invoices` table.
  - Updated the analytics services to query the database and perform a real-time `SUM(amount_paid)` to calculate true Monthly Recurring Revenue (MRR) and Average Revenue Per User (ARPU).
  - Wired the `/superadmin/revenue` dashboard to fetch and display the live transaction history, handling empty states gracefully until real transactions occur.

---

### Conclusion
The Classphere platform is now structurally complete across all 4 planned phases. It successfully balances a highly complex multi-tenant academic feature set with global SaaS operations, all while maintaining a state-of-the-art user interface. Future phases will heavily focus on implementing the background cron jobs detailed in Phase 3 to ensure horizontal scalability as student counts reach the tens of thousands per batch.
